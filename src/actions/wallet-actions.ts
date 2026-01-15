"use server";

import { eq, sql, sum, and } from "drizzle-orm";

import { db } from "@/db";
import { users, transactions, withdrawalRequests } from "@/db/schema";
import { auth } from "@/auth";
import { withdrawalSchema } from "@/lib/z-schema";
import type { Result } from "@/types";

// ============================================
// TYPES
// ============================================

export interface WalletStats {
    walletBalance: number;         // Số dư khả dụng
    pendingWithdrawal: number;     // Tổng đang chờ duyệt
    totalWithdrawn: number;        // Tổng đã rút
}

export interface TransactionItem {
    id: string;
    type: "cashback" | "withdrawal";
    amount: number;
    status: string;
    description: string;
    createdAt: Date;
}

export interface WithdrawalResult {
    requestId: string;
    amount: number;
    newBalance: number;
}

// ============================================
// GET WALLET STATS
// ============================================

export async function getWalletStats(): Promise<Result<WalletStats>> {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return { success: false, error: "Bạn chưa đăng nhập" };
        }

        // 1. Lấy thông tin user (số dư, tổng đã rút)
        const user = await db
            .select({
                walletBalance: users.walletBalance,
                totalWithdrawn: users.totalWithdrawn,
            })
            .from(users)
            .where(eq(users.id, session.user.id))
            .limit(1);

        if (user.length === 0) {
            return { success: false, error: "Không tìm thấy người dùng" };
        }

        // 2. Tính tổng tiền đang chờ duyệt (pending withdrawals)
        const pendingSum = await db
            .select({
                total: sum(withdrawalRequests.amount),
            })
            .from(withdrawalRequests)
            .where(
                and(
                    eq(withdrawalRequests.userId, session.user.id),
                    eq(withdrawalRequests.status, "pending")
                )
            );

        return {
            success: true,
            data: {
                walletBalance: Number(user[0].walletBalance) || 0,
                pendingWithdrawal: Number(pendingSum[0]?.total) || 0,
                totalWithdrawn: Number(user[0].totalWithdrawn) || 0,
            },
        };
    } catch (error) {
        console.error("Get wallet stats error:", error);
        return { success: false, error: "Đã xảy ra lỗi" };
    }
}

// ============================================
// GET TRANSACTION HISTORY
// ============================================

export async function getTransactionHistory(): Promise<Result<TransactionItem[]>> {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return { success: false, error: "Bạn chưa đăng nhập" };
        }

        // 1. Lấy danh sách cashback (từ bảng transactions)
        const cashbacks = await db
            .select({
                id: transactions.id,
                amount: transactions.cashbackAmount,
                status: transactions.status,
                createdAt: transactions.createdAt,
                orderIdExternal: transactions.orderIdExternal,
            })
            .from(transactions)
            .where(eq(transactions.userId, session.user.id))
            .orderBy(sql`${transactions.createdAt} DESC`)
            .limit(50);

        // 2. Lấy danh sách yêu cầu rút tiền
        const withdrawals = await db
            .select({
                id: withdrawalRequests.id,
                amount: withdrawalRequests.amount,
                status: withdrawalRequests.status,
                createdAt: withdrawalRequests.createdAt,
            })
            .from(withdrawalRequests)
            .where(eq(withdrawalRequests.userId, session.user.id))
            .orderBy(sql`${withdrawalRequests.createdAt} DESC`)
            .limit(50);

        // 3. Gộp và format lại
        const items: TransactionItem[] = [];

        for (const tx of cashbacks) {
            items.push({
                id: tx.id,
                type: "cashback",
                amount: Number(tx.amount) || 0,
                status: tx.status,
                description: `Cashback từ đơn hàng ${tx.orderIdExternal || "N/A"}`,
                createdAt: tx.createdAt,
            });
        }

        for (const wd of withdrawals) {
            items.push({
                id: wd.id,
                type: "withdrawal",
                amount: Number(wd.amount) || 0,
                status: wd.status,
                description: "Yêu cầu rút tiền",
                createdAt: wd.createdAt,
            });
        }

        // Sắp xếp theo thời gian mới nhất
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return {
            success: true,
            data: items.slice(0, 50), // Giới hạn 50 items
        };
    } catch (error) {
        console.error("Get transaction history error:", error);
        return { success: false, error: "Đã xảy ra lỗi" };
    }
}

// ============================================
// REQUEST WITHDRAWAL ACTION
// Sử dụng DB Transaction + SELECT FOR UPDATE để chống race condition
// ============================================

export async function requestWithdrawalAction(
    formData: FormData
): Promise<Result<WithdrawalResult>> {
    try {
        // 1. Kiểm tra user đã đăng nhập
        const session = await auth();

        if (!session?.user?.id) {
            return { success: false, error: "Bạn chưa đăng nhập" };
        }

        const userId = session.user.id;

        // 2. Parse và validate input
        const amountStr = formData.get("amount") as string;
        const amount = Number(amountStr);

        const validatedFields = withdrawalSchema.safeParse({ amount });

        if (!validatedFields.success) {
            const errors = validatedFields.error.flatten().fieldErrors;
            const firstError = Object.values(errors)[0]?.[0] || "Số tiền không hợp lệ";
            return { success: false, error: firstError };
        }

        // 3. Thực hiện transaction với SELECT FOR UPDATE
        const result = await db.transaction(async (tx) => {
            // Bước 1: Lock row và lấy thông tin user
            const lockedUser = await tx
                .select({
                    walletBalance: users.walletBalance,
                    bankName: users.bankName,
                    bankAccountNumber: users.bankAccountNumber,
                    bankAccountHolder: users.bankAccountHolder,
                })
                .from(users)
                .where(eq(users.id, userId))
                .for("update") // Lock row
                .limit(1);

            if (lockedUser.length === 0) {
                throw new Error("Không tìm thấy người dùng");
            }

            const userInfo = lockedUser[0];
            const currentBalance = Number(userInfo.walletBalance);

            // Bước 2: Validate số dư
            if (currentBalance < amount) {
                throw new Error(`Số dư không đủ. Số dư hiện tại: ${currentBalance.toLocaleString("vi-VN")} VNĐ`);
            }

            // Bước 3: Kiểm tra thông tin ngân hàng
            if (!userInfo.bankName || !userInfo.bankAccountNumber || !userInfo.bankAccountHolder) {
                throw new Error("Vui lòng cập nhật thông tin ngân hàng trước khi rút tiền");
            }

            // Bước 4: Trừ tiền từ ví
            const newBalance = currentBalance - amount;

            await tx
                .update(users)
                .set({
                    walletBalance: newBalance.toString(),
                    updatedAt: new Date(),
                })
                .where(eq(users.id, userId));

            // Bước 5: Tạo withdrawal request với bank snapshot
            const bankSnapshot = {
                bankName: userInfo.bankName,
                bankAccountNumber: userInfo.bankAccountNumber,
                bankAccountHolder: userInfo.bankAccountHolder,
                snapshotAt: new Date().toISOString(),
            };

            const newRequest = await tx
                .insert(withdrawalRequests)
                .values({
                    userId,
                    amount: amount.toString(),
                    bankSnapshot,
                    status: "pending",
                })
                .returning({ id: withdrawalRequests.id });

            return {
                requestId: newRequest[0].id,
                amount,
                newBalance,
            };
        });

        console.log(`[Withdrawal] User ${userId} requested ${amount} VNĐ`);

        return {
            success: true,
            data: result,
        };
    } catch (error) {
        console.error("Request withdrawal error:", error);

        const errorMessage = error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi, vui lòng thử lại";

        return { success: false, error: errorMessage };
    }
}

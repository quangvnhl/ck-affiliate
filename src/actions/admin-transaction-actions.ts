"use server";

import { eq, sql, desc, and, gte, isNull, ne } from "drizzle-orm";

import { db } from "@/db";
import { users, transactions, platforms } from "@/db/schema";
import { auth } from "@/auth";
import type { Result } from "@/types";

// ============================================
// TYPES
// ============================================

export interface AdminTransactionItem {
    id: string;
    type: "withdrawal" | "commission";
    userId: string;
    userEmail: string;
    amount: number;
    status: string;
    platformName?: string;
    orderIdExternal?: string;
    createdAt: Date;
}

export interface TransactionStats {
    totalCashback: number;
    totalWithdrawn: number;
    pendingWithdrawals: number;
    todayTransactions: number;
    pendingCount: number;
    orphanedCount: number;
}

// ============================================
// CHECK ADMIN PERMISSION
// ============================================

async function checkAdminPermission(): Promise<Result<string>> {
    const session = await auth();

    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }

    if (session.user.role !== "admin") {
        return { success: false, error: "Forbidden - Admin only" };
    }

    return { success: true, data: session.user.id };
}

// ============================================
// GET ALL TRANSACTIONS (ADMIN)
// ============================================

export async function getAdminTransactionsAction(
    status?: "all" | "pending" | "confirmed" | "rejected" | "paid" | "orphaned",
    type?: "all" | "commission" | "withdrawal"
): Promise<Result<AdminTransactionItem[]>> {
    try {
        const permCheck = await checkAdminPermission();
        if (!permCheck.success) {
            return { success: false, error: permCheck.error };
        }

        const result: AdminTransactionItem[] = [];
        const conditions = [];

        // Type filter
        if (type && type !== "all") {
            conditions.push(eq(transactions.type, type));
        }

        // Status filter
        if (status && status !== "all") {
            if (status === "orphaned") {
                // Orphaned = userId is null
                conditions.push(isNull(transactions.userId));
            } else {
                conditions.push(eq(transactions.status, status));
            }
        }

        const txRecords = await db
            .select({
                id: transactions.id,
                userId: transactions.userId,
                type: transactions.type,
                userEmail: users.email,
                amount: transactions.cashbackAmount,
                status: transactions.status,
                orderIdExternal: transactions.orderIdExternal,
                platformId: transactions.platformId,
                platformName: platforms.name,
                createdAt: transactions.createdAt,
            })
            .from(transactions)
            .leftJoin(users, eq(transactions.userId, users.id))
            .leftJoin(platforms, eq(transactions.platformId, platforms.id))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(transactions.createdAt))
            .limit(100);

        for (const tx of txRecords) {
            result.push({
                id: tx.id,
                type: tx.type === "withdrawal" ? "withdrawal" : "commission",
                userId: tx.userId || "",
                userEmail: tx.userEmail || (tx.userId ? "N/A" : "Khách"),
                amount: Number(tx.amount) || 0,
                status: tx.status,
                platformName: tx.platformName || undefined,
                orderIdExternal: tx.orderIdExternal || undefined,
                createdAt: tx.createdAt,
            });
        }

        return { success: true, data: result.slice(0, 100) };
    } catch (error) {
        console.error("Get admin transactions error:", error);
        return { success: false, error: "Lỗi tải danh sách giao dịch" };
    }
}

// ============================================
// GET TRANSACTION STATS (ADMIN)
// ============================================

export async function getAdminTransactionStatsAction(): Promise<Result<TransactionStats>> {
    try {
        const permCheck = await checkAdminPermission();
        if (!permCheck.success) {
            return { success: false, error: permCheck.error };
        }

        // Tổng cashback (confirmed)
        const cashbackSum = await db
            .select({ total: sql<number>`COALESCE(sum(${transactions.cashbackAmount}), 0)` })
            .from(transactions)
            .where(and(
                eq(transactions.status, "confirmed"),
                eq(transactions.type, "commission")
            ));

        // Tổng đã rút (type=withdrawal, status=paid)
        const withdrawnSum = await db
            .select({ total: sql<number>`COALESCE(sum(${transactions.cashbackAmount}), 0)` })
            .from(transactions)
            .where(and(
                eq(transactions.status, "paid"),
                eq(transactions.type, "withdrawal")
            ));

        // Pending withdrawals (type=withdrawal, status=pending)
        const pendingWdCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(transactions)
            .where(and(
                eq(transactions.status, "pending"),
                eq(transactions.type, "withdrawal")
            ));

        // Pending transactions count
        const pendingTxCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(transactions)
            .where(and(
                eq(transactions.status, "pending"),
                eq(transactions.type, "commission")
            ));

        // Orphaned transactions count
        const orphanedCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(transactions)
            .where(and(
                eq(transactions.status, "orphaned"),
                eq(transactions.type, "commission")
            ));

        // Today transactions
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayTxCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(transactions)
            .where(gte(transactions.createdAt, today));

        return {
            success: true,
            data: {
                totalCashback: Number(cashbackSum[0]?.total) || 0,
                totalWithdrawn: Number(withdrawnSum[0]?.total) || 0,
                pendingWithdrawals: Number(pendingWdCount[0]?.count) || 0,
                todayTransactions: Number(todayTxCount[0]?.count) || 0,
                pendingCount: Number(pendingTxCount[0]?.count) || 0,
                orphanedCount: Number(orphanedCount[0]?.count) || 0,
            },
        };
    } catch (error) {
        console.error("Get admin transaction stats error:", error);
        return { success: false, error: "Lỗi tải thống kê" };
    }
}

// ============================================
// GET USERS LIST (ADMIN)
// ============================================

export async function getUsersListAction(): Promise<Result<{ id: string; email: string }[]>> {
    try {
        const permCheck = await checkAdminPermission();
        if (!permCheck.success) {
            return { success: false, error: permCheck.error };
        }

        const usersList = await db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(sql`${users.email} IS NOT NULL`)
            .orderBy(desc(users.createdAt))
            .limit(500);

        return { success: true, data: usersList.map(u => ({ id: u.id, email: u.email || "" })) };
    } catch (error) {
        console.error("Get users list error:", error);
        return { success: false, error: "Lỗi tải danh sách user" };
    }
}

// ============================================
// CLAIM ORPHANED TRANSACTION (ADMIN)
// ============================================

export async function claimOrphanedTransactionAction(
    transactionId: string,
    userId: string
): Promise<Result<null>> {
    try {
        const permCheck = await checkAdminPermission();
        if (!permCheck.success) {
            return { success: false, error: permCheck.error };
        }

        // Verify transaction is orphaned
        const tx = await db
            .select({ status: transactions.status })
            .from(transactions)
            .where(eq(transactions.id, transactionId))
            .limit(1);

        if (tx.length === 0) {
            return { success: false, error: "Không tìm thấy giao dịch" };
        }

        if (tx[0].status !== "orphaned") {
            return { success: false, error: "Giao dịch không ở trạng thái orphaned" };
        }

        // Update transaction with userId
        await db
            .update(transactions)
            .set({
                userId,
                status: "pending",
                updatedAt: new Date(),
            })
            .where(eq(transactions.id, transactionId));

        return { success: true, data: null };
    } catch (error) {
        console.error("Claim orphaned transaction error:", error);
        return { success: false, error: "Lỗi gán giao dịch" };
    }
}

// ============================================
// REJECT ORPHANED TRANSACTION (ADMIN)
// ============================================

export async function rejectOrphanedTransactionAction(
    transactionId: string,
    reason: string
): Promise<Result<null>> {
    try {
        const permCheck = await checkAdminPermission();
        if (!permCheck.success) {
            return { success: false, error: permCheck.error };
        }

        await db
            .update(transactions)
            .set({
                status: "rejected",
                rejectionReason: reason,
                updatedAt: new Date(),
            })
            .where(eq(transactions.id, transactionId));

        return { success: true, data: null };
    } catch (error) {
        console.error("Reject orphaned transaction error:", error);
        return { success: false, error: "Lỗi từ chối giao dịch" };
    }
}

// ============================================
// DELETE ORPHANED TRANSACTION (ADMIN)
// ============================================

export async function deleteOrphanedTransactionAction(transactionId: string): Promise<Result<null>> {
    try {
        const permCheck = await checkAdminPermission();
        if (!permCheck.success) {
            return { success: false, error: permCheck.error };
        }

        await db
            .delete(transactions)
            .where(eq(transactions.id, transactionId));

        return { success: true, data: null };
    } catch (error) {
        console.error("Delete orphaned transaction error:", error);
        return { success: false, error: "Lỗi xóa giao dịch" };
    }
}

// ============================================
// UPDATE TRANSACTION STATUS (BATCH - ADMIN)
// ============================================

export async function updateTransactionStatusAction(
    ids: string[],
    status: string,
    reason?: string
): Promise<Result<null>> {
    try {
        const permCheck = await checkAdminPermission();
        if (!permCheck.success) {
            return { success: false, error: permCheck.error };
        }

        for (const id of ids) {
            await db
                .update(transactions)
                .set({
                    status,
                    rejectionReason: reason || null,
                    updatedAt: new Date(),
                })
                .where(eq(transactions.id, id));
        }

        return { success: true, data: null };
    } catch (error) {
        console.error("Update transaction status error:", error);
        return { success: false, error: "Lỗi cập nhật trạng thái" };
    }
}

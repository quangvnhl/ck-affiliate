"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/auth";
import { bankInfoSchema } from "@/lib/z-schema";
import type { Result } from "@/types";

// ============================================
// GET CURRENT USER PROFILE
// ============================================

export interface UserProfile {
    id: string;
    email: string;
    role: string;
    walletBalance: string;
    totalWithdrawn: string;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountHolder: string | null;
}

export async function getCurrentUserProfile(): Promise<Result<UserProfile>> {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return { success: false, error: "Bạn chưa đăng nhập" };
        }

        const user = await db
            .select({
                id: users.id,
                email: users.email,
                role: users.role,
                walletBalance: users.walletBalance,
                totalWithdrawn: users.totalWithdrawn,
                bankName: users.bankName,
                bankAccountNumber: users.bankAccountNumber,
                bankAccountHolder: users.bankAccountHolder,
            })
            .from(users)
            .where(eq(users.id, session.user.id))
            .limit(1);

        if (user.length === 0) {
            return { success: false, error: "Không tìm thấy thông tin người dùng" };
        }

        return {
            success: true,
            data: {
                ...user[0],
                email: user[0].email || "",
            },
        };
    } catch (error) {
        console.error("Get current user profile error:", error);
        return { success: false, error: "Đã xảy ra lỗi" };
    }
}

// ============================================
// UPDATE BANK INFO ACTION
// ============================================

interface BankInfoResult {
    bankName: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
}

export async function updateBankInfoAction(
    formData: FormData
): Promise<Result<BankInfoResult>> {
    try {
        // 1. Kiểm tra user đã đăng nhập
        const session = await auth();

        if (!session?.user?.id) {
            return { success: false, error: "Bạn chưa đăng nhập" };
        }

        // 2. Parse và validate input
        const rawData = {
            bankName: formData.get("bankName") as string,
            bankAccountNumber: formData.get("bankAccountNumber") as string,
            bankAccountHolder: formData.get("bankAccountHolder") as string,
        };

        const validatedFields = bankInfoSchema.safeParse(rawData);

        if (!validatedFields.success) {
            const errors = validatedFields.error.flatten().fieldErrors;
            const firstError = Object.values(errors)[0]?.[0] || "Dữ liệu không hợp lệ";
            return { success: false, error: firstError };
        }

        const { bankName, bankAccountNumber, bankAccountHolder } = validatedFields.data;

        // 3. Kiểm tra số tài khoản không bị trùng với user khác
        const existingAccount = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.bankAccountNumber, bankAccountNumber))
            .limit(1);

        if (existingAccount.length > 0 && existingAccount[0].id !== session.user.id) {
            return {
                success: false,
                error: "Số tài khoản này đã được đăng ký bởi người dùng khác"
            };
        }

        // 4. Cập nhật thông tin ngân hàng
        await db
            .update(users)
            .set({
                bankName,
                bankAccountNumber,
                bankAccountHolder,
                updatedAt: new Date(),
            })
            .where(eq(users.id, session.user.id));

        return {
            success: true,
            data: {
                bankName,
                bankAccountNumber,
                bankAccountHolder,
            },
        };
    } catch (error) {
        console.error("Update bank info error:", error);
        return { success: false, error: "Đã xảy ra lỗi, vui lòng thử lại" };
    }
}

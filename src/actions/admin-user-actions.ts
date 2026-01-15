"use server";

import { eq, sql, desc, and, or, like } from "drizzle-orm";

import { db } from "@/db";
import { users, affiliateLinks, transactions, withdrawalRequests } from "@/db/schema";
import { auth } from "@/auth";
import type { Result } from "@/types";

// ============================================
// TYPES
// ============================================

export interface AdminUserItem {
    id: string;
    email: string;
    role: string;
    status: string;
    walletBalance: string;
    totalWithdrawn: string;
    linksCount: number;
    createdAt: Date;
}

export interface AdminUserDetail extends AdminUserItem {
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountHolder: string | null;
}

export interface AdminStats {
    totalUsers: number;
    activeUsers: number;
    bannedUsers: number;
    totalWalletBalance: number;
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
// GET ALL USERS (ADMIN)
// ============================================

export async function getAdminUsersAction(): Promise<Result<AdminUserItem[]>> {
    try {
        const permCheck = await checkAdminPermission();
        if (!permCheck.success) {
            return { success: false, error: permCheck.error };
        }

        // Lấy danh sách users với count links
        const usersData = await db
            .select({
                id: users.id,
                email: users.email,
                role: users.role,
                status: users.status,
                walletBalance: users.walletBalance,
                totalWithdrawn: users.totalWithdrawn,
                createdAt: users.createdAt,
            })
            .from(users)
            .orderBy(desc(users.createdAt));

        // Count links cho mỗi user
        const result: AdminUserItem[] = [];

        for (const user of usersData) {
            const linksCount = await db
                .select({ count: sql<number>`count(*)` })
                .from(affiliateLinks)
                .where(eq(affiliateLinks.userId, user.id));

            result.push({
                ...user,
                email: user.email || "",
                linksCount: Number(linksCount[0]?.count) || 0,
            });
        }

        return { success: true, data: result };
    } catch (error) {
        console.error("Get admin users error:", error);
        return { success: false, error: "Lỗi tải danh sách người dùng" };
    }
}

// ============================================
// GET USER STATS (ADMIN)
// ============================================

export async function getAdminUserStatsAction(): Promise<Result<AdminStats>> {
    try {
        const permCheck = await checkAdminPermission();
        if (!permCheck.success) {
            return { success: false, error: permCheck.error };
        }

        // Tổng users
        const totalUsersResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(users);

        // Active users
        const activeUsersResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.status, "active"));

        // Banned users
        const bannedUsersResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.status, "banned"));

        // Tổng wallet balance
        const walletSumResult = await db
            .select({ total: sql<number>`COALESCE(sum(${users.walletBalance}), 0)` })
            .from(users);

        return {
            success: true,
            data: {
                totalUsers: Number(totalUsersResult[0]?.count) || 0,
                activeUsers: Number(activeUsersResult[0]?.count) || 0,
                bannedUsers: Number(bannedUsersResult[0]?.count) || 0,
                totalWalletBalance: Number(walletSumResult[0]?.total) || 0,
            },
        };
    } catch (error) {
        console.error("Get admin user stats error:", error);
        return { success: false, error: "Lỗi tải thống kê" };
    }
}

// ============================================
// TOGGLE USER STATUS (BAN/UNBAN)
// ============================================

export async function toggleUserStatusAction(
    userId: string
): Promise<Result<{ newStatus: string }>> {
    try {
        const permCheck = await checkAdminPermission();
        if (!permCheck.success) {
            return { success: false, error: permCheck.error };
        }

        // Lấy status hiện tại
        const user = await db
            .select({ status: users.status })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (user.length === 0) {
            return { success: false, error: "Không tìm thấy người dùng" };
        }

        const currentStatus = user[0].status;
        const newStatus = currentStatus === "active" ? "banned" : "active";

        // Cập nhật status
        await db
            .update(users)
            .set({
                status: newStatus,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        console.log(`[Admin] User ${userId} status changed to ${newStatus}`);

        return { success: true, data: { newStatus } };
    } catch (error) {
        console.error("Toggle user status error:", error);
        return { success: false, error: "Lỗi cập nhật trạng thái" };
    }
}

// ============================================
// ADJUST USER BALANCE (MANUAL)
// ============================================

export async function adjustUserBalanceAction(
    userId: string,
    amount: number,
    reason: string
): Promise<Result<{ newBalance: number }>> {
    try {
        const permCheck = await checkAdminPermission();
        if (!permCheck.success) {
            return { success: false, error: permCheck.error };
        }

        if (!reason || reason.trim().length < 5) {
            return { success: false, error: "Vui lòng nhập lý do (tối thiểu 5 ký tự)" };
        }

        // Lấy balance hiện tại
        const user = await db
            .select({ walletBalance: users.walletBalance })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (user.length === 0) {
            return { success: false, error: "Không tìm thấy người dùng" };
        }

        const currentBalance = Number(user[0].walletBalance);
        const newBalance = currentBalance + amount;

        if (newBalance < 0) {
            return { success: false, error: "Số dư không thể âm" };
        }

        // Cập nhật balance
        await db
            .update(users)
            .set({
                walletBalance: newBalance.toString(),
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        console.log(
            `[Admin] User ${userId} balance adjusted by ${amount}. Reason: ${reason}. New balance: ${newBalance}`
        );

        return { success: true, data: { newBalance } };
    } catch (error) {
        console.error("Adjust user balance error:", error);
        return { success: false, error: "Lỗi điều chỉnh số dư" };
    }
}

// ============================================
// SEARCH USERS (FOR ADMIN COMBOBOX)
// ============================================

export interface SearchUserItem {
    id: string;
    email: string;
}

/**
 * Admin: Tìm kiếm users theo email
 * Dùng cho Searchable Combobox khi tạo link thủ công
 */
export async function searchUsersAction(
    query: string
): Promise<Result<SearchUserItem[]>> {
    try {
        const permCheck = await checkAdminPermission();
        if (!permCheck.success) {
            return { success: false, error: permCheck.error };
        }

        // Nếu query rỗng, trả về 10 users mới nhất
        if (!query || query.trim().length === 0) {
            const recentUsers = await db
                .select({ id: users.id, email: users.email })
                .from(users)
                .orderBy(desc(users.createdAt))
                .limit(10);

            return {
                success: true,
                data: recentUsers.map((u) => ({
                    id: u.id,
                    email: u.email || "",
                })),
            };
        }

        // Tìm kiếm với ILIKE (case-insensitive)
        const searchResults = await db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(sql`${users.email} ILIKE ${"%" + query.trim() + "%"}`)
            .orderBy(users.email)
            .limit(20);

        return {
            success: true,
            data: searchResults.map((u) => ({
                id: u.id,
                email: u.email || "",
            })),
        };
    } catch (error) {
        console.error("Search users error:", error);
        return { success: false, error: "Lỗi tìm kiếm người dùng" };
    }
}

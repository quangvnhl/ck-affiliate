"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { withdrawalRequests, users } from "@/db/schema";
import { auth } from "@/auth";
import type { Result } from "@/types";

// ============================================
// ADMIN AUTHORIZATION CHECK
// ============================================

/**
 * Helper function để check quyền admin
 * QUAN TRỌNG: Mọi admin action đều PHẢI gọi hàm này đầu tiên
 */
async function requireAdmin() {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error("Unauthorized: Please login");
  }
  
  if (session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  
  return session.user;
}

// ============================================
// WITHDRAWAL ACTIONS
// ============================================

/**
 * Duyệt yêu cầu rút tiền
 * Flow:
 * 1. Admin đã chuyển khoản thủ công qua ngân hàng
 * 2. Admin bấm "Duyệt" trên web
 * 3. System update status -> 'approved'
 */
export async function approveWithdrawalAction(
  withdrawalId: string,
  proofImageUrl?: string
): Promise<Result<{ id: string }>> {
  try {
    // Layer 2: Check admin permission
    const admin = await requireAdmin();

    // Validate input
    if (!withdrawalId) {
      return { success: false, error: "ID yêu cầu rút tiền không hợp lệ" };
    }

    // Lấy thông tin withdrawal
    const withdrawal = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, withdrawalId))
      .limit(1);

    if (withdrawal.length === 0) {
      return { success: false, error: "Không tìm thấy yêu cầu rút tiền" };
    }

    if (withdrawal[0].status !== "pending") {
      return { 
        success: false, 
        error: `Yêu cầu này đã được xử lý (${withdrawal[0].status})` 
      };
    }

    // Update status -> approved
    await db
      .update(withdrawalRequests)
      .set({
        status: "approved",
        proofImageUrl: proofImageUrl || null,
        processedAt: new Date(),
        adminNote: `Approved by ${admin.email}`,
      })
      .where(eq(withdrawalRequests.id, withdrawalId));

    // Log action
    console.log(
      `[Admin Action] Withdrawal ${withdrawalId} APPROVED by ${admin.email}`
    );

    // Revalidate cache
    revalidatePath("/admin/withdrawals");

    return { success: true, data: { id: withdrawalId } };
  } catch (error) {
    console.error("Approve withdrawal error:", error);
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: "Đã xảy ra lỗi khi duyệt yêu cầu" };
  }
}

/**
 * Từ chối yêu cầu rút tiền
 * Flow:
 * 1. Admin nhập lý do từ chối
 * 2. System hoàn tiền vào ví user
 * 3. Update status -> 'rejected'
 */
export async function rejectWithdrawalAction(
  withdrawalId: string,
  reason: string
): Promise<Result<{ id: string }>> {
  try {
    // Layer 2: Check admin permission
    const admin = await requireAdmin();

    // Validate input
    if (!withdrawalId) {
      return { success: false, error: "ID yêu cầu rút tiền không hợp lệ" };
    }

    if (!reason || reason.trim().length < 5) {
      return { success: false, error: "Vui lòng nhập lý do từ chối (tối thiểu 5 ký tự)" };
    }

    // Lấy thông tin withdrawal
    const withdrawal = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, withdrawalId))
      .limit(1);

    if (withdrawal.length === 0) {
      return { success: false, error: "Không tìm thấy yêu cầu rút tiền" };
    }

    if (withdrawal[0].status !== "pending") {
      return { 
        success: false, 
        error: `Yêu cầu này đã được xử lý (${withdrawal[0].status})` 
      };
    }

    const amount = withdrawal[0].amount;
    const userId = withdrawal[0].userId;

    if (!userId) {
      return { success: false, error: "Không tìm thấy thông tin người dùng" };
    }

    // Transaction: Hoàn tiền + Update status
    // 1. Hoàn tiền vào ví user
    await db
      .update(users)
      .set({
        walletBalance: sql`${users.walletBalance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // 2. Update withdrawal status
    await db
      .update(withdrawalRequests)
      .set({
        status: "rejected",
        adminNote: `Rejected by ${admin.email}: ${reason}`,
        processedAt: new Date(),
      })
      .where(eq(withdrawalRequests.id, withdrawalId));

    // Log action
    console.log(
      `[Admin Action] Withdrawal ${withdrawalId} REJECTED by ${admin.email}. ` +
      `Refunded ${amount} to user ${userId}. Reason: ${reason}`
    );

    // Revalidate cache
    revalidatePath("/admin/withdrawals");

    return { success: true, data: { id: withdrawalId } };
  } catch (error) {
    console.error("Reject withdrawal error:", error);
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: "Đã xảy ra lỗi khi từ chối yêu cầu" };
  }
}

// ============================================
// USER MANAGEMENT ACTIONS
// ============================================

/**
 * Khóa/Mở khóa tài khoản user
 */
export async function toggleUserStatusAction(
  userId: string,
  newStatus: "active" | "banned"
): Promise<Result<{ id: string; status: string }>> {
  try {
    // Layer 2: Check admin permission
    const admin = await requireAdmin();

    if (!userId) {
      return { success: false, error: "ID người dùng không hợp lệ" };
    }

    // Không cho phép tự ban chính mình
    if (userId === admin.id) {
      return { success: false, error: "Không thể thay đổi trạng thái tài khoản của chính mình" };
    }

    // Update user status
    await db
      .update(users)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Log action
    console.log(
      `[Admin Action] User ${userId} status changed to ${newStatus} by ${admin.email}`
    );

    // Revalidate cache
    revalidatePath("/admin/users");

    return { success: true, data: { id: userId, status: newStatus } };
  } catch (error) {
    console.error("Toggle user status error:", error);
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: "Đã xảy ra lỗi khi cập nhật trạng thái" };
  }
}

// ============================================
// DATA FETCHING ACTIONS
// ============================================

/**
 * Lấy danh sách yêu cầu rút tiền (cho Admin)
 */
export async function getWithdrawalRequestsAction(
  status?: "pending" | "approved" | "rejected"
) {
  try {
    await requireAdmin();

    // Query với join để lấy thông tin user
    const query = db
      .select({
        id: withdrawalRequests.id,
        userId: withdrawalRequests.userId,
        amount: withdrawalRequests.amount,
        bankSnapshot: withdrawalRequests.bankSnapshot,
        status: withdrawalRequests.status,
        adminNote: withdrawalRequests.adminNote,
        proofImageUrl: withdrawalRequests.proofImageUrl,
        processedAt: withdrawalRequests.processedAt,
        createdAt: withdrawalRequests.createdAt,
        userEmail: users.email,
      })
      .from(withdrawalRequests)
      .leftJoin(users, eq(withdrawalRequests.userId, users.id))
      .orderBy(withdrawalRequests.createdAt);

    // Filter by status if provided
    const results = status
      ? await query.where(eq(withdrawalRequests.status, status))
      : await query;

    return { success: true, data: results };
  } catch (error) {
    console.error("Get withdrawals error:", error);
    
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return { success: false, error: error.message, data: [] };
    }
    
    return { success: false, error: "Không thể tải dữ liệu", data: [] };
  }
}

/**
 * Lấy thống kê tổng quan cho Dashboard
 */
export async function getAdminStatsAction() {
  try {
    await requireAdmin();

    // Mock stats - trong production sẽ query từ DB
    const stats = {
      totalRevenue: 15750000,
      totalUserBalance: 8250000,
      pendingWithdrawals: 12,
      todayClicks: 1847,
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error("Get admin stats error:", error);
    return { success: false, error: "Không thể tải thống kê" };
  }
}

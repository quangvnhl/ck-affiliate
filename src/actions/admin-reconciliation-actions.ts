"use server";

import { db } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { systemSettings, reconciliationLogs, affiliateLinks, transactions, users, platforms } from "@/db/schema";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export interface CodeMatch {
  id: string;
  code: string;
  userId: string | null;
  originalUrl: string;
}

interface ReconciliationInput {
  subId: string;
  orderId: string;
  orderAmount: number;
  checkoutId: string;
  commissionAmount: number;
  commissionPercent?: number;
  platformId?: number;
}

interface ReconciliationResult {
  success: boolean;
  data?: {
    transaction: any;
    link: any;
    user: any;
    orderAmount: number;
    commissionAmount: number;
    commissionPercent: number;
    cashbackAmount: number;
    points: number;
  };
  error?: string;
  codeMatches?: any[];
}

function parseSubIdToCode(subId: string): string | null {
  const cleaned = subId.split("-")[0];
  if (!/^[a-zA-Z0-9]+$/.test(cleaned)) {
    return null;
  }
  return cleaned;
}

export async function createReconciliationAction(input: ReconciliationInput): Promise<ReconciliationResult> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    return { success: false, error: "Không có quyền admin" };
  }

  const adminId = session.user.id;

  // Parse subId to code
  const code = parseSubIdToCode(input.subId);
  if (!code) {
    return { success: false, error: "SubId không hợp lệ. Chỉ cho phép a-z, A-Z, 0-9" };
  }

  // Get commission percent - từ input hoặc settings
  const commissionPercent = input.commissionPercent || 70;

  // Calculate cashback (Commission % của commission amount)
  const cashbackAmount = Math.floor(input.commissionAmount * commissionPercent / 100);

  // Calculate points (1000đ = 1 điểm)
  const points = Math.floor(cashbackAmount / 1000);

  // Find affiliate link by code
  const links = await db
    .select()
    .from(affiliateLinks)
    .where(and(
      eq(affiliateLinks.code, code),
      eq(affiliateLinks.status, "open")
    ));

  let affiliateLinkId: string | null = null;
  let userId: string | null = null;

  if (links.length === 0) {
    // No matching link - create orphaned transaction
    const result = await db.insert(transactions).values({
      userId: null,
      affiliateLinkId: null,
      type: "commission",
      orderIdExternal: input.orderId,
      orderAmount: input.orderAmount.toString(),
      checkoutId: input.checkoutId,
      commissionAmount: input.commissionAmount.toString(),
      cashbackAmount: cashbackAmount.toString(),
      commissionPercent,
      points,
      status: "orphaned",
      rawData: {
        subId: input.subId,
        checkoutId: input.checkoutId,
        commissionAmount: input.commissionAmount,
      },
    }).returning();

    // Create reconciliation log
    await db.insert(reconciliationLogs).values({
      adminId,
      transactionId: result[0].id,
      action: "created",
      note: `Orphaned - không tìm thấy link với code: ${code}`,
    });

    return {
      success: true,
      data: {
        transaction: result[0],
        link: null,
        user: null,
        orderAmount: input.orderAmount,
        commissionAmount: input.commissionAmount,
        commissionPercent,
        cashbackAmount,
        points,
      },
      error: "Không tìm thấy link nào khớp với subId. Giao dịch được lưu dưới dạng orphaned.",
    };
  }

  if (links.length > 1) {
    // Multiple matches - return for admin to choose
    return {
      success: false,
      error: "Tìm thấy nhiều link khớp. Vui lòng chọn.",
      codeMatches: links.map((l: any) => ({
        id: l.id,
        code: l.code,
        userId: l.userId,
        originalUrl: l.originalUrl,
      })),
    };
  }

  // Single match
  const link = links[0];
  affiliateLinkId = link.id;
  userId = link.userId;

  // Get user info
  let userEmail = null;
  if (userId) {
    const userData = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userData.length > 0) {
      userEmail = userData[0].email;
    }
  }

  // Create transaction
  const result = await db.insert(transactions).values({
    userId,
    affiliateLinkId,
    type: "commission",
    orderIdExternal: input.orderId,
    orderAmount: input.orderAmount.toString(),
    checkoutId: input.checkoutId,
    commissionAmount: input.commissionAmount.toString(),
    cashbackAmount: cashbackAmount.toString(),
    commissionPercent,
    points,
    status: "pending",
    rawData: {
      subId: input.subId,
      checkoutId: input.checkoutId,
      commissionAmount: input.commissionAmount,
    },
  }).returning();

  // Create reconciliation log
  await db.insert(reconciliationLogs).values({
    adminId,
    transactionId: result[0].id,
    action: "created",
    note: `Đối soát thành công cho user: ${userEmail || "khách"}`,
  });

  return {
    success: true,
    data: {
      transaction: result[0],
      link,
      user: userId ? { id: userId, email: userEmail } : null,
      orderAmount: input.orderAmount,
      commissionAmount: input.commissionAmount,
      commissionPercent,
      cashbackAmount,
      points,
    },
  };
}

export async function confirmReconciliationAction(transactionId: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { success: false, error: "Không có quyền admin" };
  }

  const adminId = session.user.id;

  // Update transaction status
  await db
    .update(transactions)
    .set({
      status: "confirmed",
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, transactionId));

  // Create log
  await db.insert(reconciliationLogs).values({
    adminId,
    transactionId,
    action: "confirmed",
    note: "Xác nhận đối soát",
  });

  return { success: true };
}

export async function rejectReconciliationAction(
  transactionId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { success: false, error: "Không có quyền admin" };
  }

  const adminId = session.user.id;

  // Update transaction status
  await db
    .update(transactions)
    .set({
      status: "rejected",
      rejectionReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, transactionId));

  // Create log
  await db.insert(reconciliationLogs).values({
    adminId,
    transactionId,
    action: "rejected",
    note: reason,
  });

  return { success: true };
}

export async function getReconciliationStatsAction() {
  const pending = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(and(
      eq(transactions.type, "commission"),
      eq(transactions.status, "pending")
    ));

  const confirmed = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(and(
      eq(transactions.type, "commission"),
      eq(transactions.status, "confirmed")
    ));

  const orphaned = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.status, "orphaned"));

  return {
    success: true,
    data: {
      pendingCount: pending[0]?.count || 0,
      confirmedCount: confirmed[0]?.count || 0,
      orphanedCount: orphaned[0]?.count || 0,
    },
  };
}

// ============================================
// GET PLATFORMS (ADMIN)
// ============================================

export async function getPlatformsAction() {
  const allPlatforms = await db
    .select({
      id: platforms.id,
      name: platforms.name,
    })
    .from(platforms)
    .where(eq(platforms.isActive, true));

  return {
    success: true,
    data: allPlatforms,
  };
}
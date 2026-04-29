"use server";

import { db } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { systemSettings, reconciliationLogs, affiliateLinks, transactions, users, platforms, type Transaction, type AffiliateLink } from "@/db/schema";
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
    transaction: Transaction;
    link: AffiliateLink | null;
    user: { id: string; email: string | null } | null;
    orderAmount: number;
    commissionAmount: number;
    commissionPercent: number;
    cashbackAmount: number;
    points: number;
  };
  error?: string;
  codeMatches?: CodeMatch[];
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

  // Get commission percent - từ input hoặc settings
  const commissionPercent = input.commissionPercent || 70;

  // Calculate cashback (Commission % của commission amount)
  const cashbackAmount = Math.floor(input.commissionAmount * commissionPercent / 100);

  // Calculate points (1000đ = 1 điểm)
  const points = Math.floor(cashbackAmount / 1000);

  // If subId is empty, create orphaned transaction immediately
  if (!input.subId || input.subId.trim() === "") {
    const result = await db.insert(transactions).values({
      userId: null,
      affiliateLinkId: null,
      platformId: input.platformId,
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
      note: `Orphaned - SubId bị trống`,
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
      error: "SubId trống. Giao dịch được lưu dưới dạng orphaned.",
    };
  }

  // Parse subId to code
  const code = parseSubIdToCode(input.subId);
  if (!code) {
    return { success: false, error: "SubId không hợp lệ. Chỉ cho phép a-z, A-Z, 0-9" };
  }

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
      platformId: input.platformId,
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
      codeMatches: links.map((l: typeof affiliateLinks.$inferSelect) => ({
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

// ============================================
// BATCH IMPORT RECONCILIATION
// ============================================

export type TransactionStatus = "pending" | "confirmed" | "rejected" | "orphaned";

export interface BatchReconciliationRow {
  subId: string;
  orderId: string;
  orderAmount: number;
  checkoutId: string;
  commissionAmount: number;
  commissionPercent?: number;
  orderStatus: string;  // "Hoàn thành" | "Đã hủy" | "Đang chờ xử lý" | ""
  status: TransactionStatus;  // Computed status từ orderStatus hoặc dropdown
  rawData: Record<string, unknown>;
}

export interface BatchReconciliationInput {
  rows: BatchReconciliationRow[];
  commissionPercent?: number;
  platformId?: number;
}

export interface BatchReconciliationResult {
  success: boolean;
  data?: {
    total: number;
    successCount: number;
    orphanedCount: number;
    failedCount: number;
    errors: { row: number; error: string }[];
  };
  error?: string;
}

// ============================================
// PREVIEW ACTION - Kiểm tra trước khi import
// ============================================

export type RowActionType = "create" | "update" | "skip";

export interface RowPreviewResult {
  rowIndex: number;
  action: RowActionType;
  reason?: string;
}

export async function previewBatchReconciliationAction(
  rows: BatchReconciliationRow[],
  platformId: number
): Promise<{ success: boolean; data?: RowPreviewResult[]; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { success: false, error: "Không có quyền admin" };
  }

  const results: RowPreviewResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Kiểm tra transaction đã tồn tại chưa
    const existingTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.orderIdExternal, row.orderId),
          eq(transactions.trash, false)
        )
      );

    // Nếu không tìm thấy theo orderId, thử tìm theo checkoutId
    if (existingTransactions.length === 0 && row.checkoutId) {
      const byCheckoutId = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.checkoutId, row.checkoutId),
            eq(transactions.trash, false)
          )
        );
      if (byCheckoutId.length > 0) {
        existingTransactions.push(...byCheckoutId);
      }
    }

    if (existingTransactions.length === 0) {
      // Không tồn tại → Tạo mới
      results.push({ rowIndex: i, action: "create" });
    } else {
      const existingTx = existingTransactions[0];
      if (existingTx.status === "pending" && row.status !== "pending") {
        // Tồn tại + pending + CSV có thay đổi → Cập nhật
        results.push({ 
          rowIndex: i, 
          action: "update",
          reason: `Cập nhật status: ${existingTx.status} → ${row.status}`
        });
      } else {
        // Tồn tại + đã confirmed/rejected/paid hoặc CSV vẫn pending → Bỏ qua
        results.push({ 
          rowIndex: i, 
          action: "skip",
          reason: `Đã tồn tại (status: ${existingTx.status})`
        });
      }
    }
  }

  return { success: true, data: results };
}

// ============================================
// PREVIEW SINGLE ROW - Kiểm tra 1 dòng
// ============================================

export async function previewSingleRowAction(
  row: BatchReconciliationRow,
  platformId: number
): Promise<{ success: boolean; data?: { rowIndex: number; action: RowActionType; reason?: string }; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { success: false, error: "Không có quyền admin" };
  }

  // Kiểm tra transaction đã tồn tại chưa
  const existingTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.orderIdExternal, row.orderId),
        eq(transactions.trash, false)
      )
    );

  // Nếu không tìm thấy theo orderId, thử tìm theo checkoutId
  if (existingTransactions.length === 0 && row.checkoutId) {
    const byCheckoutId = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.checkoutId, row.checkoutId),
          eq(transactions.trash, false)
        )
      );
    if (byCheckoutId.length > 0) {
      existingTransactions.push(...byCheckoutId);
    }
  }

  if (existingTransactions.length === 0) {
    // Không tồn tại → Tạo mới
    return { success: true, data: { rowIndex: 0, action: "create" } };
  }

  const existingTx = existingTransactions[0];
  if (existingTx.status === "pending" && row.status !== "pending") {
    // Tồn tại + pending + CSV có thay đổi → Cập nhật
    return { 
      success: true, 
      data: { 
        rowIndex: 0, 
        action: "update",
        reason: `Cập nhật status: ${existingTx.status} → ${row.status}`
      }
    };
  }

  // Tồn tại + đã confirmed/rejected/paid hoặc CSV vẫn pending → Bỏ qua
  return { 
    success: true, 
    data: { 
      rowIndex: 0, 
      action: "skip",
      reason: `Đã tồn tại (status: ${existingTx.status})`
    }
  };
}

export async function batchImportReconciliationAction(input: BatchReconciliationInput): Promise<BatchReconciliationResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { success: false, error: "Không có quyền admin" };
  }

  const adminId = session.user.id;
  const commissionPercent = input.commissionPercent || 70;
  
  let successCount = 0;
  let orphanedCount = 0;
  let failedCount = 0;
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < input.rows.length; i++) {
    const row = input.rows[i];
    try {
      const rowCommissionPercent = row.commissionPercent !== undefined ? row.commissionPercent : commissionPercent;
      const normalizedCommission = Math.floor(row.commissionAmount);
      const normalizedOrder = Math.floor(row.orderAmount);
      const cashbackAmount = Math.floor(normalizedCommission * rowCommissionPercent / 100);
      const points = Math.floor(cashbackAmount / 1000);

      // ============================================
      // BƯỚC 1: Kiểm tra transaction đã tồn tại chưa
      // Tìm theo orderIdExternal HOẶC checkoutId
      // ============================================
      const existingTransactions = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.orderIdExternal, row.orderId),
            eq(transactions.trash, false)
          )
        );

      let foundByCheckoutId = false;
      if (existingTransactions.length === 0 && row.checkoutId) {
        const byCheckoutId = await db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.checkoutId, row.checkoutId),
              eq(transactions.trash, false)
            )
          );
        if (byCheckoutId.length > 0) {
          existingTransactions.push(...byCheckoutId);
          foundByCheckoutId = true;
        }
      }

      // ============================================
      // TRƯỜNG HỢP: Transaction đã tồn tại trong DB
      // ============================================
      if (existingTransactions.length > 0) {
        const existingTx = existingTransactions[0];
        
        // Nếu status = pending VÀ row.status != pending (tức CSV có thay đổi)
        if (existingTx.status === "pending" && row.status !== "pending") {
          // Cập nhật status theo CSV
          await db
            .update(transactions)
            .set({
              status: row.status,
              commissionAmount: row.commissionAmount.toString(),
              cashbackAmount: cashbackAmount.toString(),
              commissionPercent: rowCommissionPercent,
              points,
              rawData: row.rawData,
              updatedAt: new Date(),
            })
            .where(eq(transactions.id, existingTx.id));

          await db.insert(reconciliationLogs).values({
            adminId,
            transactionId: existingTx.id,
            action: "updated",
            note: `Batch cập nhật status: ${existingTx.status} → ${row.status}`,
          });
          
          // Đếm như thành công (vì đã update)
          if (row.status === "confirmed") {
            successCount++;
          } else if (row.status === "rejected") {
            successCount++;
          } else {
            successCount++;
          }
        } else {
          // Status đã confirmed/rejected/paid HOẶC CSV vẫn là pending → bỏ qua
          // Không làm gì, đánh dấu là đã tồn tại
          successCount++; // Vẫn đếm là xử lý thành công (không tạo mới)
        }
        continue;
      }

      // ============================================
      // TRƯỜNG HỢP: Chưa có trong DB → Tạo mới
      // ============================================
      
      // Nếu không có subId → status = orphaned
      const finalStatus = !row.subId ? "orphaned" : row.status;

      const code = row.subId ? parseSubIdToCode(row.subId) : null;
      
      // Nếu có subId nhưng không tìm thấy link → orphaned
      let linkId: string | null = null;
      let userIdVal: string | null = null;

      if (code) {
        const links = await db
          .select()
          .from(affiliateLinks)
          .where(and(
            eq(affiliateLinks.code, code),
            eq(affiliateLinks.status, "open")
          ));

        if (links.length === 0) {
          // Không tìm thấy link → orphaned
          const result = await db.insert(transactions).values({
            userId: null,
            affiliateLinkId: null,
            platformId: input.platformId,
            type: "commission",
            orderIdExternal: row.orderId,
            orderAmount: row.orderAmount.toString(),
            checkoutId: row.checkoutId,
            commissionAmount: row.commissionAmount.toString(),
            cashbackAmount: cashbackAmount.toString(),
            commissionPercent: rowCommissionPercent,
            points,
            status: "orphaned",
            rawData: row.rawData,
          }).returning();

          await db.insert(reconciliationLogs).values({
            adminId,
            transactionId: result[0].id,
            action: "created",
            note: `Batch orphaned - không tìm thấy link với code: ${code}`,
          });
          orphanedCount++;
          continue;
        }

        if (links.length > 1) {
          failedCount++;
          errors.push({ row: i + 1, error: `Tìm thấy nhiều link khớp cho code: ${code}` });
          continue;
        }

        linkId = links[0].id;
        userIdVal = links[0].userId;
      }

      // Tạo transaction mới
      const result = await db.insert(transactions).values({
        userId: userIdVal,
        affiliateLinkId: linkId,
        platformId: input.platformId,
        type: "commission",
        orderIdExternal: row.orderId,
        orderAmount: row.orderAmount.toString(),
        checkoutId: row.checkoutId,
        commissionAmount: row.commissionAmount.toString(),
        cashbackAmount: cashbackAmount.toString(),
        commissionPercent: rowCommissionPercent,
        points,
        status: finalStatus,
        rawData: row.rawData,
      }).returning();

      await db.insert(reconciliationLogs).values({
        adminId,
        transactionId: result[0].id,
        action: "created",
        note: `Batch tạo mới - status: ${finalStatus}`,
      });

      if (finalStatus === "orphaned") {
        orphanedCount++;
      } else {
        successCount++;
      }

    } catch (err: unknown) {
      failedCount++;
      const errorMessage = err instanceof Error ? err.message : "Lỗi không xác định";
      errors.push({ row: i + 1, error: errorMessage });
    }
  }

  return {
    success: true,
    data: {
      total: input.rows.length,
      successCount,
      orphanedCount,
      failedCount,
      errors
    }
  };
}

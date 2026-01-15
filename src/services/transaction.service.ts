import { eq, and, sql } from "drizzle-orm";

import { db } from "@/db";
import { users, transactions, platforms, affiliateLinks } from "@/db/schema";
import type { Result } from "@/types";

// ============================================
// TYPES
// ============================================

// Đơn hàng từ API sàn (Mock)
export interface PlatformOrder {
    orderId: string;      // Mã đơn từ sàn (VD: 240115ABCXYZ)
    amount: number;       // Giá trị đơn hàng (VND)
    commission: number;   // Hoa hồng Admin nhận từ sàn
    status: "pending" | "completed" | "cancelled";
    subId: string;        // Tracking ID (format: {userId/guestId}_timestamp)
    createdAt: Date;
}

// Kết quả sync
export interface SyncResult {
    platformId: number;
    platformName: string;
    inserted: number;     // Số đơn mới được thêm
    updated: number;      // Số đơn được cập nhật status
    orphaned: number;     // Số đơn không tìm thấy user
    errors: string[];     // Danh sách lỗi (nếu có)
}

// Status mapping từ sàn sang hệ thống
const STATUS_MAP: Record<PlatformOrder["status"], "pending" | "approved" | "rejected"> = {
    pending: "pending",
    completed: "approved",
    cancelled: "rejected",
};

// ============================================
// MOCK DATA - Giả lập API sàn
// ============================================

/**
 * Giả lập API sàn trả về danh sách đơn hàng
 * Trong production sẽ gọi API thực của Shopee/TikTok
 */
export function getMockPlatformOrders(platformId: number): PlatformOrder[] {
    // Mock data với các trường hợp khác nhau
    const mockOrders: PlatformOrder[] = [
        {
            orderId: `ORD_${platformId}_${Date.now()}_001`,
            amount: 500000,
            commission: 25000, // 5% của giá trị đơn
            status: "pending",
            subId: "user1234_lkz5x901", // User đã đăng ký
            createdAt: new Date(),
        },
        {
            orderId: `ORD_${platformId}_${Date.now()}_002`,
            amount: 1200000,
            commission: 60000,
            status: "completed",
            subId: "user5678_lkz5x902", // User đã đăng ký
            createdAt: new Date(),
        },
        {
            orderId: `ORD_${platformId}_${Date.now()}_003`,
            amount: 350000,
            commission: 17500,
            status: "cancelled",
            subId: "guest999_lkz5x903", // Guest chưa đăng ký
            createdAt: new Date(),
        },
        {
            orderId: `ORD_${platformId}_${Date.now()}_004`,
            amount: 890000,
            commission: 44500,
            status: "pending",
            subId: "unknown_lkz5x904", // Không tìm thấy trong hệ thống
            createdAt: new Date(),
        },
    ];

    return mockOrders;
}

// ============================================
// USER MAPPING LOGIC
// ============================================

/**
 * Parse sub_id để tìm user_id trong database
 * sub_id format: {userId/guestSessionId}_timestamp
 * 
 * @returns userId nếu tìm thấy, null nếu không (orphan)
 */
async function parseSubIdToUserId(subId: string): Promise<string | null> {
    // Tách phần identifier từ sub_id
    const identifier = subId.split("_")[0];

    if (!identifier || identifier.length < 4) {
        console.warn(`[Sync] Invalid sub_id format: ${subId}`);
        return null;
    }

    // Bước 1: Thử tìm user bằng id (8 ký tự đầu của UUID)
    const userByIdPrefix = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`LEFT(${users.id}::text, 8) = ${identifier}`)
        .limit(1);

    if (userByIdPrefix.length > 0) {
        return userByIdPrefix[0].id;
    }

    // Bước 2: Tìm trong affiliate_links theo guestSessionId
    // Guest có thể đã đăng ký nên link đã được merge sang user
    const linkByGuestSession = await db
        .select({ userId: affiliateLinks.userId })
        .from(affiliateLinks)
        .where(
            and(
                sql`LEFT(${affiliateLinks.guestSessionId}, 8) = ${identifier}`,
                sql`${affiliateLinks.userId} IS NOT NULL`
            )
        )
        .limit(1);

    if (linkByGuestSession.length > 0 && linkByGuestSession[0].userId) {
        return linkByGuestSession[0].userId;
    }

    // Không tìm thấy user -> orphan transaction
    console.warn(`[Sync] Orphan transaction - cannot find user for sub_id: ${subId}`);
    return null;
}

// ============================================
// CASHBACK CALCULATION
// ============================================

/**
 * Tính số tiền cashback user nhận được
 * User nhận 70% hoa hồng, Admin giữ 30%
 * 
 * @param commission - Hoa hồng Admin nhận từ sàn
 * @param commissionSharePercent - % user nhận (mặc định 70)
 */
function calculateCashback(
    commission: number,
    commissionSharePercent: number = 70
): number {
    return Math.round((commission * commissionSharePercent) / 100);
}

// ============================================
// MAIN SYNC FUNCTION
// ============================================

/**
 * Đồng bộ đơn hàng từ một platform về hệ thống
 * 
 * Logic:
 * 1. Lấy danh sách đơn hàng từ API sàn (mock)
 * 2. Loop qua từng đơn:
 *    - Check order_id_external đã tồn tại chưa
 *    - Nếu chưa có -> Insert transaction mới
 *    - Nếu có rồi -> Update status nếu thay đổi
 * 3. Khi status = 'approved' -> Cộng tiền vào ví user
 */
export async function syncOrdersFromPlatform(
    platformId: number
): Promise<Result<SyncResult>> {
    try {
        // Lấy thông tin platform
        const platform = await db
            .select()
            .from(platforms)
            .where(eq(platforms.id, platformId))
            .limit(1);

        if (platform.length === 0) {
            return {
                success: false,
                error: `Platform ${platformId} không tồn tại`,
            };
        }

        const platformInfo = platform[0];
        const commissionShare = Number(platformInfo.baseCommissionShare);

        // Lấy danh sách đơn hàng từ API sàn (Mock)
        const orders = getMockPlatformOrders(platformId);

        console.log(`[Sync] Platform ${platformInfo.name}: Fetched ${orders.length} orders`);

        const result: SyncResult = {
            platformId,
            platformName: platformInfo.name,
            inserted: 0,
            updated: 0,
            orphaned: 0,
            errors: [],
        };

        // Process từng đơn hàng
        for (const order of orders) {
            try {
                // 1. Tìm user từ sub_id
                const userId = await parseSubIdToUserId(order.subId);

                if (!userId) {
                    result.orphaned++;
                    // Không insert orphan transaction - chỉ log warning
                    continue;
                }

                // 2. Tính cashback
                const cashbackAmount = calculateCashback(order.commission, commissionShare);
                const mappedStatus = STATUS_MAP[order.status];

                // 3. Check xem đơn hàng đã tồn tại chưa
                const existingTransaction = await db
                    .select()
                    .from(transactions)
                    .where(eq(transactions.orderIdExternal, order.orderId))
                    .limit(1);

                if (existingTransaction.length === 0) {
                    // === INSERT MỚI ===
                    await db.insert(transactions).values({
                        userId,
                        platformId,
                        orderIdExternal: order.orderId,
                        orderAmount: order.amount.toString(),
                        commissionReceived: order.commission.toString(),
                        cashbackAmount: cashbackAmount.toString(),
                        status: mappedStatus,
                    });

                    result.inserted++;

                    // Nếu status là approved ngay -> cộng tiền vào ví
                    if (mappedStatus === "approved") {
                        await creditUserWallet(userId, cashbackAmount);
                    }
                } else {
                    // === UPDATE NẾU STATUS THAY ĐỔI ===
                    const existingTx = existingTransaction[0];

                    if (existingTx.status !== mappedStatus) {
                        const previousStatus = existingTx.status;

                        await db
                            .update(transactions)
                            .set({
                                status: mappedStatus,
                                updatedAt: new Date(),
                            })
                            .where(eq(transactions.id, existingTx.id));

                        result.updated++;

                        // Nếu chuyển từ pending -> approved -> cộng tiền
                        if (previousStatus === "pending" && mappedStatus === "approved") {
                            await creditUserWallet(userId, cashbackAmount);
                        }
                    }
                }
            } catch (error) {
                const errMsg = `Error processing order ${order.orderId}: ${error}`;
                console.error(`[Sync] ${errMsg}`);
                result.errors.push(errMsg);
            }
        }

        console.log(`[Sync] Platform ${platformInfo.name} completed:`, result);

        return {
            success: true,
            data: result,
        };
    } catch (error) {
        console.error("[Sync] Critical error:", error);
        return {
            success: false,
            error: `Lỗi đồng bộ platform ${platformId}: ${error}`,
        };
    }
}

// ============================================
// WALLET UPDATE
// ============================================

/**
 * Cộng tiền cashback vào ví user
 * Sử dụng SQL increment để tránh race condition
 */
async function creditUserWallet(userId: string, amount: number): Promise<void> {
    await db
        .update(users)
        .set({
            walletBalance: sql`${users.walletBalance} + ${amount}`,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

    console.log(`[Wallet] Credited ${amount} VND to user ${userId}`);
}

// ============================================
// SYNC ALL PLATFORMS
// ============================================

/**
 * Đồng bộ đơn hàng từ tất cả các platform active
 * Dùng cho Cron Job
 */
export async function syncAllPlatforms(): Promise<Result<SyncResult[]>> {
    try {
        // Lấy danh sách platforms đang active
        const activePlatforms = await db
            .select()
            .from(platforms)
            .where(eq(platforms.isActive, true));

        if (activePlatforms.length === 0) {
            return {
                success: true,
                data: [],
            };
        }

        const results: SyncResult[] = [];

        // Sync từng platform
        for (const platform of activePlatforms) {
            const syncResult = await syncOrdersFromPlatform(platform.id);

            if (syncResult.success && syncResult.data) {
                results.push(syncResult.data);
            } else {
                results.push({
                    platformId: platform.id,
                    platformName: platform.name,
                    inserted: 0,
                    updated: 0,
                    orphaned: 0,
                    errors: [syncResult.error || "Unknown error"],
                });
            }
        }

        return {
            success: true,
            data: results,
        };
    } catch (error) {
        console.error("[Sync] Critical error syncing all platforms:", error);
        return {
            success: false,
            error: `Lỗi đồng bộ: ${error}`,
        };
    }
}

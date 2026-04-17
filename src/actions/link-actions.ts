"use server";

import { eq, desc, count } from "drizzle-orm";

import { db } from "@/db";
import { affiliateLinks, platforms } from "@/db/schema";
import { auth } from "@/auth";
import { createLinkSchema } from "@/lib/z-schema";
import { generateShortLink, detectPlatform, AffiliateAdapterFactory, type GeneratedLinkResult } from "@/services/affiliate.service";
import type { Result } from "@/types";

// ============================================
// CREATE LINK ACTION
// ============================================

export interface CreateLinkResult extends GeneratedLinkResult {
  linkId: string;
}

export interface UserLinksResult {
  links: unknown[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Server Action để tạo link affiliate
 * Hỗ trợ cả user đã đăng nhập và khách vãng lai (guest)
 */
export async function createLinkAction(
  formData: FormData
): Promise<Result<CreateLinkResult>> {
  try {
    // 1. Lấy session (nếu có)
    const session = await auth();
    const userId = session?.user?.id;

    const rawData = {
      originalUrl: (formData.get("originalUrl") as string)?.trim(),
      guestSessionId: formData.get("guestSessionId") as string | undefined,
    };

    const affiliateId = (formData.get("affiliateId") as string)?.trim();

    const validatedFields = createLinkSchema.safeParse(rawData);

    if (!validatedFields.success) {
      const errors = validatedFields.error.flatten().fieldErrors;
      const firstError = Object.values(errors)[0]?.[0] || "Dữ liệu không hợp lệ";
      return { success: false, error: firstError };
    }

    const { originalUrl, guestSessionId } = validatedFields.data;

    // Metadata props
    const rawUrl = (formData.get("rawUrl") as string)?.trim();
    const scrapeTitle = (formData.get("scrapeTitle") as string)?.trim();
    const scrapeImage = (formData.get("scrapeImage") as string)?.trim();

    // 3. Detect platform
    const platformType = detectPlatform(originalUrl);
    if (!platformType) {
      return {
        success: false,
        error: "Link không hợp lệ. Chỉ hỗ trợ Shopee và TikTok.",
      };
    }

    // 4. Lấy platform_id từ database
    const platformRecord = await db
      .select({ id: platforms.id, isActive: platforms.isActive })
      .from(platforms)
      .where(eq(platforms.name, platformType))
      .limit(1);

    if (platformRecord.length === 0) {
      return {
        success: false,
        error: `Sàn ${platformType} chưa được cấu hình trong hệ thống.`,
      };
    }

    if (!platformRecord[0].isActive) {
      return {
        success: false,
        error: `Sàn ${platformType === "shopee" ? "Shopee" : "TikTok"} đang bảo trì, vui lòng thử lại sau.`,
      };
    }

    const platformId = platformRecord[0].id;

    // 5. Gọi service để tạo short link
    const result = await generateShortLink(originalUrl, userId, guestSessionId, affiliateId);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Không thể tạo link, vui lòng thử lại.",
      };
    }

    // 6. Lưu vào database
    const finalMetaData: Record<string, unknown> = {
      ...(result.data.metaData || {}),
    };
    if (rawUrl) finalMetaData.originalInputUrl = rawUrl;
    if (scrapeTitle) finalMetaData.scrapeTitle = scrapeTitle;
    if (scrapeImage) finalMetaData.scrapeImage = scrapeImage;

    const newLink = await db
      .insert(affiliateLinks)
      .values({
        userId: userId || null,
        guestSessionId: !userId ? guestSessionId : null,
        originalUrl,
        shortLink: result.data.shortLink,
        code: result.data.code,
        trackingUrl: result.data.trackingUrl,
        metaData: Object.keys(finalMetaData).length > 0 ? finalMetaData : null,
        platformId,
        clicks: 0,
      })
      .returning({ id: affiliateLinks.id });

    if (newLink.length === 0) {
      return {
        success: false,
        error: "Không thể lưu link, vui lòng thử lại.",
      };
    }

    // 7. Log for tracking
    console.log(
      `[Link Created] ${userId ? `User: ${userId}` : `Guest: ${guestSessionId}`} | ` +
      `Platform: ${platformType} | Link ID: ${newLink[0].id}`
    );

    return {
      success: true,
      data: {
        linkId: newLink[0].id,
        ...result.data,
      },
    };
  } catch (error) {
    console.error("Create link action error:", error);
    return {
      success: false,
      error: "Đã xảy ra lỗi, vui lòng thử lại sau.",
    };
  }
}

// ============================================
// GET USER LINKS ACTION
// ============================================

/**
 * Lấy danh sách link của user đã đăng nhập
 */
export async function getUserLinksAction(
  page: number = 1,
  pageSize: number = 20
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Vui lòng đăng nhập" };
    }

    // Count total
    const countResult = await db
      .select({ count: count() })
      .from(affiliateLinks)
      .where(eq(affiliateLinks.userId, session.user.id));
    const totalCount = countResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    const offset = (page - 1) * pageSize;
    const links = await db
      .select({
        id: affiliateLinks.id,
        originalUrl: affiliateLinks.originalUrl,
        shortLink: affiliateLinks.shortLink,
        trackingUrl: affiliateLinks.trackingUrl,
        clicks: affiliateLinks.clicks,
        createdAt: affiliateLinks.createdAt,
        platformId: affiliateLinks.platformId,
        metaData: affiliateLinks.metaData,
      })
      .from(affiliateLinks)
      .where(eq(affiliateLinks.userId, session.user.id))
      .orderBy(desc(affiliateLinks.createdAt))
      .limit(pageSize)
      .offset(offset);

    return { 
      success: true, 
      data: {
        links,
        totalCount,
        totalPages,
        currentPage: page,
      }
    };
  } catch (error) {
    console.error("Get user links error:", error);
    return { success: false, error: "Không thể tải danh sách link" };
  }
}

// ============================================
// GET GUEST LINKS ACTION
// ============================================

/**
 * Lấy danh sách link của khách vãng lai theo guestSessionId
 */
export async function getGuestLinksAction(guestSessionId: string) {
  try {
    if (!guestSessionId) {
      return { success: false, error: "Không tìm thấy session" };
    }

    const links = await db
      .select({
        id: affiliateLinks.id,
        originalUrl: affiliateLinks.originalUrl,
        shortLink: affiliateLinks.shortLink,
        clicks: affiliateLinks.clicks,
        createdAt: affiliateLinks.createdAt,
      })
      .from(affiliateLinks)
      .where(eq(affiliateLinks.guestSessionId, guestSessionId))
      .orderBy(affiliateLinks.createdAt);

    return { success: true, data: links };
  } catch (error) {
    console.error("Get guest links error:", error);
    return { success: false, error: "Không thể tải danh sách link" };
  }
}

// ============================================
// ADMIN: CREATE MANUAL LINK ACTION
// ============================================

import { users } from "@/db/schema";
import { manualLinkSchema, type ManualLinkInput } from "@/lib/z-schema";

/**
 * Detect platform từ short link domain
 */
function detectPlatformFromShortLink(shortLink: string): "shopee" | "tiktok" | null {
  try {
    const url = new URL(shortLink);
    const hostname = url.hostname.toLowerCase();

    if (hostname.includes("shope.ee") || hostname.includes("shopee.vn")) {
      return "shopee";
    }
    if (hostname.includes("tiktok.com") || hostname.includes("vt.tiktok.com")) {
      return "tiktok";
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Admin: Thêm link affiliate thủ công vào hệ thống
 * - Có thể gán cho User hoặc để không (orphan)
 * - Auto-detect platform nếu không chọn
 */
export async function createManualLinkAction(
  data: ManualLinkInput
): Promise<Result<{ linkId: string }>> {
  try {
    // 1. Check admin permission
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Vui lòng đăng nhập" };
    }

    if (session.user.role !== "admin") {
      return { success: false, error: "Chỉ Admin mới có quyền thực hiện" };
    }

    // 2. Validate với Zod
    const validatedFields = manualLinkSchema.safeParse(data);

    if (!validatedFields.success) {
      const errors = validatedFields.error.flatten().fieldErrors;
      const firstError = Object.values(errors)[0]?.[0] || "Dữ liệu không hợp lệ";
      return { success: false, error: firstError };
    }

    const { shortLink, originalUrl, platformId, userId } = validatedFields.data;

    // 3. Determine platform
    let finalPlatformId = platformId;

    if (!finalPlatformId) {
      // Auto-detect từ short link
      const detectedPlatform = detectPlatformFromShortLink(shortLink);

      if (!detectedPlatform) {
        return {
          success: false,
          error: "Không thể xác định sàn từ link. Vui lòng chọn sàn thủ công.",
        };
      }

      // Lấy platform_id từ database
      const platformRecord = await db
        .select({ id: platforms.id })
        .from(platforms)
        .where(eq(platforms.name, detectedPlatform))
        .limit(1);

      if (platformRecord.length === 0) {
        return {
          success: false,
          error: `Sàn ${detectedPlatform} chưa được cấu hình trong hệ thống.`,
        };
      }

      finalPlatformId = platformRecord[0].id;
    }

    // 4. Verify userId nếu có
    if (userId) {
      const userExists = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userExists.length === 0) {
        return { success: false, error: "Người dùng không tồn tại" };
      }
    }

    // 5. Generate unique code for internal shortener
    const { nanoid } = await import("nanoid");
    const code = nanoid(5);

    // Build internal short link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const internalShortLink = `${baseUrl}/${code}`;

    // 6. Insert vào database
    const newLink = await db
      .insert(affiliateLinks)
      .values({
        userId: userId || null,
        guestSessionId: userId ? null : "system_import", // Mark as system import
        originalUrl: originalUrl || shortLink, // Fallback to shortLink if no originalUrl
        shortLink: internalShortLink, // Internal short link
        code, // Unique code for redirect
        trackingUrl: shortLink, // Admin provided link becomes tracking URL
        platformId: finalPlatformId,
        clicks: 0,
      })
      .returning({ id: affiliateLinks.id });

    if (newLink.length === 0) {
      return { success: false, error: "Không thể lưu link, vui lòng thử lại." };
    }

    // 6. Log
    console.log(
      `[Admin Manual Link] Added by ${session.user.email} | ` +
      `Link ID: ${newLink[0].id} | User: ${userId || "ORPHAN"}`
    );

    return { success: true, data: { linkId: newLink[0].id } };
  } catch (error: unknown) {
    console.error("Create manual link error:", error);

    // Handle unique constraint violation
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      return {
        success: false,
        error: "Link rút gọn này đã tồn tại trong hệ thống",
      };
    }

    return { success: false, error: "Đã xảy ra lỗi, vui lòng thử lại sau." };
  }
}

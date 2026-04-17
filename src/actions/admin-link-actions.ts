"use server";

import { eq, desc, count } from "drizzle-orm";

import { db } from "@/db";
import { affiliateLinks, users } from "@/db/schema";
import { auth } from "@/auth";
import type { Result } from "@/types";

// ============================================
// ADMIN: GET ALL LINKS WITH PAGINATION
// ============================================

export interface AdminLinkItem {
  id: string;
  originalUrl: string;
  shortLink: string;
  trackingUrl: string;
  clicks: number;
  createdAt: Date;
  platformId: number | null;
  userId: string | null;
  guestSessionId: string | null;
  userEmail: string | null;
  metaData: {
    scrapeImage?: string;
    scrapeTitle?: string;
    originalInputUrl?: string;
    title?: string;
    resolvedUrl?: string;
  } | null;
}

export interface AdminLinksResult {
  links: AdminLinkItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Admin action: lấy tất cả links với phân trang
 * Yêu cầu quyền admin
 */
export async function getAdminLinksAction(
  page: number = 1,
  pageSize: number = 20
): Promise<Result<AdminLinksResult>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Check admin role
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!userRecord || (userRecord.role !== "admin" && userRecord.role !== "super_admin")) {
      return { success: false, error: "Forbidden: Admin access required" };
    }

    // Count total links
    const totalResult = await db
      .select({ count: count() })
      .from(affiliateLinks);
    const totalCount = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Get links with user info
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
        userId: affiliateLinks.userId,
        guestSessionId: affiliateLinks.guestSessionId,
        userEmail: users.email,
        metaData: affiliateLinks.metaData,
      })
      .from(affiliateLinks)
      .leftJoin(users, eq(affiliateLinks.userId, users.id))
      .orderBy(desc(affiliateLinks.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      success: true,
      data: {
        links: links as AdminLinkItem[],
        totalCount,
        totalPages,
        currentPage: page,
      },
    };
  } catch (error) {
    console.error("Get admin links error:", error);
    return { success: false, error: "Không thể tải danh sách link" };
  }
}

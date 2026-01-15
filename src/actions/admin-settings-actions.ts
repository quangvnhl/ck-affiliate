"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { platforms } from "@/db/schema";
import { auth } from "@/auth";
import type { Result } from "@/types";

// ============================================
// TYPES
// ============================================

export interface PlatformConfig {
    id: number;
    name: string;
    isActive: boolean;
    commissionShare: number;
    apiConfig: {
        appId?: string;
        apiKey?: string;
        apiSecret?: string;
    } | null;
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
// GET ALL PLATFORMS (ADMIN)
// ============================================

export async function getAdminPlatformsAction(): Promise<Result<PlatformConfig[]>> {
    try {
        const permCheck = await checkAdminPermission();
        if (!permCheck.success) {
            return { success: false, error: permCheck.error };
        }

        const platformList = await db
            .select()
            .from(platforms)
            .orderBy(platforms.id);

        const result: PlatformConfig[] = platformList.map((p) => ({
            id: p.id,
            name: p.name,
            isActive: p.isActive,
            commissionShare: Number(p.baseCommissionShare),
            apiConfig: p.apiConfig as PlatformConfig["apiConfig"],
        }));

        return { success: true, data: result };
    } catch (error) {
        console.error("Get admin platforms error:", error);
        return { success: false, error: "Lỗi tải cấu hình sàn" };
    }
}

// ============================================
// UPDATE PLATFORM CONFIG (ADMIN)
// ============================================

export async function updatePlatformConfigAction(
    platformId: number,
    config: {
        isActive?: boolean;
        commissionShare?: number;
        apiConfig?: {
            appId?: string;
            apiKey?: string;
            apiSecret?: string;
        };
    }
): Promise<Result<PlatformConfig>> {
    try {
        const permCheck = await checkAdminPermission();
        if (!permCheck.success) {
            return { success: false, error: permCheck.error };
        }

        // Validate commission share
        if (config.commissionShare !== undefined) {
            if (config.commissionShare < 0 || config.commissionShare > 100) {
                return { success: false, error: "Tỷ lệ hoa hồng phải từ 0-100%" };
            }
        }

        // Build update object
        const updateData: {
            isActive?: boolean;
            baseCommissionShare?: string;
            apiConfig?: unknown;
        } = {};

        if (config.isActive !== undefined) {
            updateData.isActive = config.isActive;
        }

        if (config.commissionShare !== undefined) {
            updateData.baseCommissionShare = config.commissionShare.toString();
        }

        if (config.apiConfig !== undefined) {
            updateData.apiConfig = config.apiConfig;
        }

        const updated = await db
            .update(platforms)
            .set(updateData)
            .where(eq(platforms.id, platformId))
            .returning();

        if (updated.length === 0) {
            return { success: false, error: "Không tìm thấy platform" };
        }

        const p = updated[0];
        console.log(`[Admin] Platform ${p.name} config updated`);

        return {
            success: true,
            data: {
                id: p.id,
                name: p.name,
                isActive: p.isActive,
                commissionShare: Number(p.baseCommissionShare),
                apiConfig: p.apiConfig as PlatformConfig["apiConfig"],
            },
        };
    } catch (error) {
        console.error("Update platform config error:", error);
        return { success: false, error: "Lỗi cập nhật cấu hình" };
    }
}

// ============================================
// TOGGLE PLATFORM STATUS (ADMIN)
// ============================================

export async function togglePlatformStatusAction(
    platformId: number
): Promise<Result<{ isActive: boolean }>> {
    try {
        const permCheck = await checkAdminPermission();
        if (!permCheck.success) {
            return { success: false, error: permCheck.error };
        }

        // Lấy status hiện tại
        const platform = await db
            .select({ isActive: platforms.isActive })
            .from(platforms)
            .where(eq(platforms.id, platformId))
            .limit(1);

        if (platform.length === 0) {
            return { success: false, error: "Không tìm thấy platform" };
        }

        const newStatus = !platform[0].isActive;

        await db
            .update(platforms)
            .set({
                isActive: newStatus,
            })
            .where(eq(platforms.id, platformId));

        console.log(`[Admin] Platform ${platformId} status changed to ${newStatus}`);

        return { success: true, data: { isActive: newStatus } };
    } catch (error) {
        console.error("Toggle platform status error:", error);
        return { success: false, error: "Lỗi cập nhật trạng thái" };
    }
}

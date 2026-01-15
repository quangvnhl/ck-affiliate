import { NextResponse } from "next/server";
import { syncAllPlatforms } from "@/services/transaction.service";

// ============================================
// CRON JOB: Sync Orders from Platforms
// ============================================
// Endpoint: GET /api/cron/sync
// Security: Requires Authorization header with CRON_SECRET
// Usage: Gọi từ Vercel Cron hoặc external scheduler (mỗi 30 phút)

export async function GET(request: Request) {
    try {
        // 1. Xác thực CRON_SECRET
        const authHeader = request.headers.get("Authorization");
        const cronSecret = process.env.CRON_SECRET;

        // Kiểm tra biến môi trường có được set không
        if (!cronSecret) {
            console.error("[Cron Sync] CRON_SECRET environment variable not set");
            return NextResponse.json(
                { success: false, error: "Server configuration error" },
                { status: 500 }
            );
        }

        // Kiểm tra Authorization header
        const expectedAuth = `Bearer ${cronSecret}`;
        if (authHeader !== expectedAuth) {
            console.warn("[Cron Sync] Unauthorized access attempt");
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        // 2. Thực hiện sync
        console.log("[Cron Sync] Starting order sync...");
        const startTime = Date.now();

        const result = await syncAllPlatforms();

        const duration = Date.now() - startTime;
        console.log(`[Cron Sync] Completed in ${duration}ms`);

        // 3. Trả về kết quả
        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        // Tính tổng kết quả
        const summary = {
            totalInserted: 0,
            totalUpdated: 0,
            totalOrphaned: 0,
            totalErrors: 0,
        };

        for (const platformResult of result.data || []) {
            summary.totalInserted += platformResult.inserted;
            summary.totalUpdated += platformResult.updated;
            summary.totalOrphaned += platformResult.orphaned;
            summary.totalErrors += platformResult.errors.length;
        }

        return NextResponse.json({
            success: true,
            message: "Order sync completed",
            duration: `${duration}ms`,
            summary,
            details: result.data,
        });
    } catch (error) {
        console.error("[Cron Sync] Unhandled error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

// Cấu hình cho Vercel Cron (nếu deploy trên Vercel)
// Thêm vào vercel.json:
// {
//   "crons": [
//     {
//       "path": "/api/cron/sync",
//       "schedule": "*/30 * * * *"
//     }
//   ]
// }

import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { affiliateLinks } from "@/db/schema";

/**
 * Dynamic Route Handler for Internal Shortener
 * 
 * Handles GET /{code} requests:
 * 1. Looks up the code in the database
 * 2. If found, increments clicks and redirects to trackingUrl
 * 3. If not found, redirects to homepage
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;

        // 1. Look up the code in database
        const link = await db.query.affiliateLinks.findFirst({
            where: eq(affiliateLinks.code, code),
            columns: {
                id: true,
                trackingUrl: true,
            },
        });

        // 2. If not found, redirect to homepage
        if (!link) {
            console.log(`[Redirect] Code not found: ${code}`);
            return NextResponse.redirect(new URL("/", request.url));
        }

        // 3. Increment clicks counter (async, fire-and-forget)
        db.update(affiliateLinks)
            .set({ clicks: sql`${affiliateLinks.clicks} + 1` })
            .where(eq(affiliateLinks.id, link.id))
            .execute()
            .catch((err) => console.error("[Redirect] Failed to increment clicks:", err));

        // 4. Log for tracking
        console.log(`[Redirect] Code: ${code} -> ${link.trackingUrl}`);

        // 5. Redirect to the tracking URL (307 = Temporary Redirect, preserves method)
        return NextResponse.redirect(link.trackingUrl, 307);
    } catch (error) {
        console.error("[Redirect] Error:", error);
        // On error, redirect to homepage
        return NextResponse.redirect(new URL("/", request.url));
    }
}

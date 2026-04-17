"use server";

import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { platforms } from "@/db/schema";
import type { Result } from "@/types";

const getAffiliateIdCached = cache(async (): Promise<Result<string>> => {
  try {
    const platform = await db
      .select({
        name: platforms.name,
        apiConfig: platforms.apiConfig,
      })
      .from(platforms)
      .where(eq(platforms.name, "shopee"))
      .limit(1);

    if (platform.length === 0) {
      return { success: false, error: "Platform not found" };
    }

    const config = platform[0].apiConfig as {
      affiliate_id?: string;
    } | null;

    if (!config?.affiliate_id) {
      return { success: false, error: "Affiliate ID not configured" };
    }

    return { success: true, data: config.affiliate_id };
  } catch (error) {
    console.error("Get affiliate ID error:", error);
    return { success: false, error: "Failed to get affiliate ID" };
  }
});

export async function getShopeeAffiliateIdAction(): Promise<Result<string>> {
  return getAffiliateIdCached();
}

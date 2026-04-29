"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { affiliateLinks } from "@/db/schema";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function blockLinkAction(linkId: string, note: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { success: false, error: "Không có quyền admin" };
  }

  await db
    .update(affiliateLinks)
    .set({
      status: "blocked",
      note: note,
    })
    .where(eq(affiliateLinks.id, linkId));

  return { success: true };
}

export async function unblockLinkAction(linkId: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { success: false, error: "Không có quyền admin" };
  }

  await db
    .update(affiliateLinks)
    .set({
      status: "open",
      note: null,
    })
    .where(eq(affiliateLinks.id, linkId));

  return { success: true };
}

export async function getAdminLinksAction(status?: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { success: false, error: "Không có quyền admin" };
  }

  const links = await db
    .select({
      id: affiliateLinks.id,
      originalUrl: affiliateLinks.originalUrl,
      shortLink: affiliateLinks.shortLink,
      code: affiliateLinks.code,
      clicks: affiliateLinks.clicks,
      status: affiliateLinks.status,
      note: affiliateLinks.note,
      userId: affiliateLinks.userId,
      createdAt: affiliateLinks.createdAt,
      metaData: affiliateLinks.metaData,
    })
    .from(affiliateLinks)
    .orderBy(affiliateLinks.createdAt)
    .limit(100);

  let filteredLinks = links;
  if (status && status !== "all") {
    filteredLinks = links.filter((l) => l.status === status);
  }

  return {
    success: true,
    data: filteredLinks,
  };
}
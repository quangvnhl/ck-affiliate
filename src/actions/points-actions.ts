"use server";

import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions, systemSettings, affiliateLinks, users, withdrawalRequests } from "@/db/schema";
import { auth } from "@/auth";

export async function getUserPointsAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Vui lòng đăng nhập" };
  }

  const userId = session.user.id;

  // Get exchange rate from settings
  const exchangeRateSetting = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, "points_exchange_rate"))
    .limit(1);

  const exchangeRate = exchangeRateSetting.length > 0
    ? parseInt(exchangeRateSetting[0].value as string)
    : 1000;

  // Get minimum withdrawal
  const minWithdrawalSetting = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, "minimum_withdrawal"))
    .limit(1);

  const minimumWithdrawal = minWithdrawalSetting.length > 0
    ? parseInt(minWithdrawalSetting[0].value as string)
    : 10;

  // Get total earned points (commission, confirmed, not trashed)
  const earnedQuery = await db
    .select({ total: sql<number>`sum(${transactions.points})` })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      eq(transactions.type, "commission"),
      eq(transactions.status, "confirmed"),
      eq(transactions.trash, false)
    ));

  const earnedPoints = Number(earnedQuery[0]?.total) || 0;

  // Get total withdrawn points (withdrawal, not rejected, not trashed)
  // Note: withdrawal points are stored as negative values
  const withdrawnQuery = await db
    .select({ total: sql<number>`sum(${transactions.points})` })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      eq(transactions.type, "withdrawal"),
      sql`${transactions.status} != 'rejected'`,
      eq(transactions.trash, false)
    ));

  const withdrawnPoints = Number(withdrawnQuery[0]?.total) || 0;

  // Calculate available points (Điểm của tôi)
  const totalPoints = earnedPoints + withdrawnPoints; // withdrawnPoints is negative

  // Get withdrawing points (Điểm đang rút)
  const withdrawingQuery = await db
    .select({ total: sql<number>`sum(${transactions.points})` })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      eq(transactions.type, "withdrawal"),
      sql`${transactions.status} IN ('pending', 'approved', 'processing')`,
      eq(transactions.trash, false)
    ));

  const withdrawingPoints = Math.abs(Number(withdrawingQuery[0]?.total) || 0);

  return {
    success: true,
    data: {
      totalPoints,
      withdrawingPoints,
      availablePoints: totalPoints,
      exchangeRate,
      minimumWithdrawal,
      exchangeMessage: `${totalPoints} điểm = ${(totalPoints * exchangeRate).toLocaleString("vi-VN")}đ`,
    },
  };
}

export async function createWithdrawalByPointsAction(points: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Vui lòng đăng nhập" };
  }

  const userId = session.user.id;

  // Get settings
  const exchangeRateSetting = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, "points_exchange_rate"))
    .limit(1);

  const exchangeRate = exchangeRateSetting.length > 0
    ? parseInt(exchangeRateSetting[0].value as string)
    : 1000;

  const minWithdrawalSetting = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, "minimum_withdrawal"))
    .limit(1);

  const minimumWithdrawal = minWithdrawalSetting.length > 0
    ? parseInt(minWithdrawalSetting[0].value as string)
    : 10;

  // Validate
  if (points < minimumWithdrawal) {
    return { success: false, error: `Tối thiểu ${minimumWithdrawal} điểm` };
  }

  // Check if user has enough points
  const earnedQuery = await db
    .select({ total: sql<number>`sum(${transactions.points})` })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      eq(transactions.type, "commission"),
      eq(transactions.status, "confirmed"),
      eq(transactions.trash, false)
    ));

  const earnedPoints = Number(earnedQuery[0]?.total) || 0;

  const withdrawnQuery = await db
    .select({ total: sql<number>`sum(${transactions.points})` })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      eq(transactions.type, "withdrawal"),
      sql`${transactions.status} != 'rejected'`,
      eq(transactions.trash, false)
    ));

  const withdrawnPoints = Number(withdrawnQuery[0]?.total) || 0;
  const totalPoints = earnedPoints + withdrawnPoints;

  if (points > totalPoints) {
    return { success: false, error: `Không đủ điểm. Bạn có ${totalPoints} điểm` };
  }

  const userInfos = await db
    .select({
      bankName: users.bankName,
      bankAccountNumber: users.bankAccountNumber,
      bankAccountHolder: users.bankAccountHolder,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userInfos.length === 0) {
    return { success: false, error: "Người dùng không tồn tại" };
  }

  const userInfo = userInfos[0];
  if (!userInfo.bankName || !userInfo.bankAccountNumber || !userInfo.bankAccountHolder) {
    return { success: false, error: "Vui lòng cập nhật thông tin ngân hàng trước khi rút điểm" };
  }

  // Convert points to VND
  const amountVND = points * exchangeRate;

  // Create withdrawal transaction (negative points)
  const result = await db.insert(transactions).values({
    userId,
    type: "withdrawal",
    points: -points,
    cashbackAmount: amountVND.toString(),
    status: "confirmed", // Confirmed immediately to deduct points from available balance
  }).returning();

  // Create withdrawal request
  await db.insert(withdrawalRequests).values({
    userId,
    transactionId: result[0].id,
    amount: amountVND.toString(),
    bankSnapshot: {
      bankName: userInfo.bankName,
      accountNumber: userInfo.bankAccountNumber,
      accountHolder: userInfo.bankAccountHolder,
    },
    status: "pending",
  });

  return {
    success: true,
    data: {
      points,
      amountVND,
      message: `Yêu cầu rút ${points} điểm (${amountVND.toLocaleString("vi-VN")}đ) đã được tạo`,
    },
  };
}
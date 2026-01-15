import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  timestamp,
  integer,
  boolean,
  jsonb,
  serial,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// 1. BẢNG USERS
// Lưu thông tin người dùng, số dư ví, thông tin ngân hàng
// ============================================
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique(),
  passwordHash: varchar("password_hash"),

  // Role Based Access Control
  role: varchar("role", { length: 20 }).default("user").notNull(), // 'admin', 'user'
  status: varchar("status", { length: 20 }).default("active").notNull(), // 'active', 'banned'

  // Tài chính
  walletBalance: decimal("wallet_balance", { precision: 15, scale: 2 }).default("0.00").notNull(),
  totalWithdrawn: decimal("total_withdrawn", { precision: 15, scale: 2 }).default("0.00").notNull(),

  // Thông tin thanh toán (User cập nhật để nhận tiền)
  bankName: varchar("bank_name", { length: 100 }),
  bankAccountNumber: varchar("bank_account_number", { length: 50 }),
  bankAccountHolder: varchar("bank_account_holder", { length: 100 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// 2. BẢNG PLATFORMS
// Cấu hình các sàn thương mại điện tử (Shopee, TikTok)
// ============================================
export const platforms = pgTable("platforms", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(), // 'shopee', 'tiktok'
  isActive: boolean("is_active").default(true).notNull(),
  apiConfig: jsonb("api_config"), // Lưu Key/Secret/AppID (Mã hóa ở tầng Application)
  baseCommissionShare: decimal("base_commission_share", { precision: 5, scale: 2 }).default("70.00").notNull(),
});

// ============================================
// 3. BẢNG AFFILIATE LINKS
// Lưu các link affiliate đã tạo (cho cả user đã đăng ký và khách vãng lai)
// ============================================
export const affiliateLinks = pgTable(
  "affiliate_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id), // Null nếu là khách vãng lai

    // QUAN TRỌNG: Dùng để map dữ liệu khi khách đăng ký thành viên
    guestSessionId: varchar("guest_session_id", { length: 100 }),

    originalUrl: text("original_url").notNull(),
    shortLink: text("short_link").notNull(),
    platformId: integer("platform_id").references(() => platforms.id),

    clicks: integer("clicks").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Indexes để tối ưu truy vấn
    index("idx_links_user").on(table.userId),
    index("idx_links_guest").on(table.guestSessionId),
  ]
);

// ============================================
// 4. BẢNG TRANSACTIONS
// Dòng tiền VÀO - Cashback từ đơn hàng
// ============================================
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    platformId: integer("platform_id").references(() => platforms.id),

    orderIdExternal: varchar("order_id_external", { length: 100 }), // Mã đơn hàng từ sàn

    orderAmount: decimal("order_amount", { precision: 15, scale: 2 }),
    commissionReceived: decimal("commission_received", { precision: 15, scale: 2 }),
    cashbackAmount: decimal("cashback_amount", { precision: 15, scale: 2 }),

    status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'approved', 'rejected'
    rejectionReason: text("rejection_reason"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // Index để check trùng đơn hàng nhanh
    index("idx_trans_order").on(table.orderIdExternal),
  ]
);

// ============================================
// 5. BẢNG WITHDRAWAL REQUESTS
// Dòng tiền RA - Yêu cầu rút tiền
// ============================================
export const withdrawalRequests = pgTable(
  "withdrawal_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),

    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),

    // Snapshot thông tin ngân hàng TẠI THỜI ĐIỂM RÚT
    bankSnapshot: jsonb("bank_snapshot").notNull(),

    status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'approved', 'rejected'

    adminNote: text("admin_note"),
    proofImageUrl: text("proof_image_url"),
    processedAt: timestamp("processed_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Index để Admin lọc đơn pending nhanh
    index("idx_withdraw_status").on(table.status),
  ]
);

// ============================================
// RELATIONS - Định nghĩa quan hệ giữa các bảng
// ============================================

// User Relations
export const usersRelations = relations(users, ({ many }) => ({
  // Một user có nhiều affiliate links
  affiliateLinks: many(affiliateLinks),
  // Một user có nhiều transactions (cashback)
  transactions: many(transactions),
  // Một user có nhiều withdrawal requests
  withdrawalRequests: many(withdrawalRequests),
}));

// Platform Relations
export const platformsRelations = relations(platforms, ({ many }) => ({
  // Một platform có nhiều affiliate links
  affiliateLinks: many(affiliateLinks),
  // Một platform có nhiều transactions
  transactions: many(transactions),
}));

// Affiliate Link Relations
export const affiliateLinksRelations = relations(affiliateLinks, ({ one }) => ({
  // Một link thuộc về một user (có thể null nếu là khách)
  user: one(users, {
    fields: [affiliateLinks.userId],
    references: [users.id],
  }),
  // Một link thuộc về một platform
  platform: one(platforms, {
    fields: [affiliateLinks.platformId],
    references: [platforms.id],
  }),
}));

// Transaction Relations
export const transactionsRelations = relations(transactions, ({ one }) => ({
  // Một transaction thuộc về một user
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  // Một transaction thuộc về một platform
  platform: one(platforms, {
    fields: [transactions.platformId],
    references: [platforms.id],
  }),
}));

// Withdrawal Request Relations
export const withdrawalRequestsRelations = relations(withdrawalRequests, ({ one }) => ({
  // Một withdrawal request thuộc về một user
  user: one(users, {
    fields: [withdrawalRequests.userId],
    references: [users.id],
  }),
}));

// ============================================
// TYPE EXPORTS - Infer types từ schema
// ============================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Platform = typeof platforms.$inferSelect;
export type NewPlatform = typeof platforms.$inferInsert;

export type AffiliateLink = typeof affiliateLinks.$inferSelect;
export type NewAffiliateLink = typeof affiliateLinks.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type NewWithdrawalRequest = typeof withdrawalRequests.$inferInsert;

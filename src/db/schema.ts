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

    // QUAN TRỌNG: Dùng map dữ liệu khi khách đăng ký thành viên
    guestSessionId: varchar("guest_session_id", { length: 100 }),

    originalUrl: text("original_url").notNull(),
    shortLink: text("short_link").notNull(), // Internal short link (e.g., https://domain.com/abc12)
    platformId: integer("platform_id").references(() => platforms.id),

    // Internal Shortener fields
    code: varchar("code", { length: 10 }).unique().notNull(), // Unique short code for redirect
    trackingUrl: text("tracking_url").notNull(), // Original platform affiliate link
    cleanUrl: text("clean_url"), // Clean URL without query params (existing DB column)

    // Metadata (title, resolved URL, etc.)
    metaData: jsonb("meta_data"),

    clicks: integer("clicks").default(0).notNull(),

    // Status để block link khi cần
    status: varchar("status", { length: 20 }).default("open").notNull(), // 'open', 'blocked'
    note: text("note"), // Ghi lý do block

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Indexes để tối ưu truy vấn
    index("idx_links_user").on(table.userId),
    index("idx_links_guest").on(table.guestSessionId),
    index("idx_links_code").on(table.code), // Fast lookup for redirects
    index("idx_links_status").on(table.status), // Filter links by status
  ]
);

// ============================================
// 4. BẢNG TRANSACTIONS
// Dòng tiền VÀO (commission) và RA (withdrawal)
// ============================================
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    affiliateLinkId: uuid("affiliate_link_id").references(() => affiliateLinks.id),
    platformId: integer("platform_id").references(() => platforms.id),

    // Type: commission (vào) hoặc withdrawal (ra)
    type: varchar("type", { length: 20 }).default("commission").notNull(), // 'commission', 'withdrawal'

    orderIdExternal: varchar("order_id_external", { length: 100 }), // Mã đơn hàng từ sàn
    orderAmount: decimal("order_amount", { precision: 15, scale: 2 }),
    checkoutId: varchar("checkout_id", { length: 100 }),
    commissionAmount: decimal("commission_amount", { precision: 15, scale: 2 }),
    cashbackAmount: decimal("cashback_amount", { precision: 15, scale: 2 }),
    commissionPercent: integer("commission_percent").default(70), // % hoa hồng (từ setting hoặc mặc định)

    // Points: điểm quy đổi (dương: vào, âm: ra)
    points: integer("points"),

    status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'confirmed', 'rejected', 'paid'
    rejectionReason: text("rejection_reason"),

    rawData: jsonb("raw_data"), // Lưu thông tin đầy đủ từ Shopee

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // Index để check trùng đơn hàng nhanh
    index("idx_trans_order").on(table.orderIdExternal),
    // Index để query points theo user + status
    index("idx_trans_user_status").on(table.userId, table.status),
  ]
);

// ============================================
// 4.1 BẢNG SYSTEM SETTINGS
// Lưu cấu hình hệ thống (tỷ giá điểm, % hoa hồng, v.v.)
// ============================================
export const systemSettings = pgTable(
  "system_settings",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 100 }).unique().notNull(),
    value: jsonb("value").notNull(), // Lưu dạng JSON (vd: "1000" cho points_exchange_rate)
    description: text("description"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

// ============================================
// 4.2 BẢNG RECONCILIATION LOGS
// Log các thao tác đối soát của admin
// ============================================
export const reconciliationLogs = pgTable(
  "reconciliation_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id").references(() => users.id),
    transactionId: uuid("transaction_id").references(() => transactions.id),

    action: varchar("action", { length: 50 }).notNull(), // 'created', 'confirmed', 'rejected', 'paid'
    note: text("note"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

// ============================================
// 4.3 BẢNG DISPUTES
// Khiếu nại từ user về kết quả đối soát
// ============================================
export const disputes = pgTable(
  "disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id").references(() => transactions.id),
    userId: uuid("user_id").references(() => users.id),

    reason: text("reason").notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'reviewed', 'resolved'
    adminNote: text("admin_note"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
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

    // Status: pending → approved → processing → paid (hoặc rejected)
    status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'approved', 'processing', 'paid', 'rejected'

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

// Affiliate Link Relations - Thêm transactions relation
export const affiliateLinksRelations = relations(affiliateLinks, ({ one, many }) => ({
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
  // Một link có nhiều transactions
  transactions: many(transactions),
}));

// Transaction Relations
export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  platform: one(platforms, {
    fields: [transactions.platformId],
    references: [platforms.id],
  }),
  affiliateLink: one(affiliateLinks, {
    fields: [transactions.affiliateLinkId],
    references: [affiliateLinks.id],
  }),
}));

export const systemSettingsRelations = relations(systemSettings, ({ many }) => ({
  systemSettings: many(systemSettings),
}));

export const reconciliationLogsRelations = relations(reconciliationLogs, ({ one }) => ({
  admin: one(users, {
    fields: [reconciliationLogs.adminId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [reconciliationLogs.transactionId],
    references: [transactions.id],
  }),
}));

export const disputesRelations = relations(disputes, ({ one }) => ({
  transaction: one(transactions, {
    fields: [disputes.transactionId],
    references: [transactions.id],
  }),
  user: one(users, {
    fields: [disputes.userId],
    references: [users.id],
  }),
}));

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

export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;

export type ReconciliationLog = typeof reconciliationLogs.$inferSelect;
export type NewReconciliationLog = typeof reconciliationLogs.$inferInsert;

export type Dispute = typeof disputes.$inferSelect;
export type NewDispute = typeof disputes.$inferInsert;

export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type NewWithdrawalRequest = typeof withdrawalRequests.$inferInsert;

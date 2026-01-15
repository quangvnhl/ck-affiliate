// Định nghĩa các TypeScript Types cho toàn bộ ứng dụng

// Result type cho xử lý lỗi thống nhất (theo AI_INSTRUCTIONS)
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// User Role
export type UserRole = "admin" | "user";

// User Status
export type UserStatus = "active" | "banned";

// Transaction Status
export type TransactionStatus = "pending" | "approved" | "rejected";

// Withdrawal Status
export type WithdrawalStatus = "pending" | "approved" | "rejected";

// Platform name
export type PlatformName = "shopee" | "tiktok";

// Thông tin ngân hàng (snapshot khi rút tiền)
export interface BankSnapshot {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

// API Config của Platform (được mã hóa)
export interface PlatformApiConfig {
  appId?: string;
  apiKey?: string;
  apiSecret?: string;
}

// Các hằng số cấu hình cho ứng dụng

// Cấu hình phân trang
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

// Cấu hình rút tiền
export const WITHDRAWAL = {
  MIN_AMOUNT: 50000, // 50,000 VND
  MAX_AMOUNT: 10000000, // 10,000,000 VND
} as const;

// Trạng thái giao dịch
export const TRANSACTION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

// Trạng thái yêu cầu rút tiền
export const WITHDRAWAL_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

// Vai trò người dùng
export const USER_ROLE = {
  ADMIN: "admin",
  USER: "user",
} as const;

// Trạng thái tài khoản
export const USER_STATUS = {
  ACTIVE: "active",
  BANNED: "banned",
} as const;

// Tên các sàn thương mại
export const PLATFORM = {
  SHOPEE: "shopee",
  TIKTOK: "tiktok",
} as const;

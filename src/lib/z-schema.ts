import { z } from "zod";

// ============================================
// AUTH SCHEMAS
// ============================================

// Schema đăng nhập
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email không được để trống" })
    .email({ message: "Email không hợp lệ" }),
  password: z
    .string()
    .min(1, { message: "Mật khẩu không được để trống" }),
});

// Schema đăng ký - Password phải có tối thiểu 8 ký tự, 1 chữ hoa, 1 số
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email không được để trống" })
    .email({ message: "Email không hợp lệ" }),
  password: z
    .string()
    .min(8, { message: "Mật khẩu phải có ít nhất 8 ký tự" })
    .regex(/[A-Z]/, { message: "Mật khẩu phải có ít nhất 1 chữ hoa" })
    .regex(/[0-9]/, { message: "Mật khẩu phải có ít nhất 1 số" }),
  confirmPassword: z
    .string()
    .min(1, { message: "Vui lòng xác nhận mật khẩu" }),
  // Optional: Guest session ID để merge dữ liệu khi đăng ký
  guestSessionId: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

// Type inferred từ schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// ============================================
// BANKING INFO SCHEMAS
// ============================================

// Schema cập nhật thông tin ngân hàng
export const bankInfoSchema = z.object({
  bankName: z
    .string()
    .min(1, { message: "Vui lòng chọn ngân hàng" }),
  bankAccountNumber: z
    .string()
    .min(6, { message: "Số tài khoản không hợp lệ" })
    .max(20, { message: "Số tài khoản quá dài" })
    .regex(/^\d+$/, { message: "Số tài khoản chỉ được chứa số" }),
  bankAccountHolder: z
    .string()
    .min(1, { message: "Vui lòng nhập tên chủ tài khoản" })
    .max(100, { message: "Tên chủ tài khoản quá dài" })
    // Viết hoa không dấu
    .transform((val) => val.toUpperCase()),
});

export type BankInfoInput = z.infer<typeof bankInfoSchema>;

// ============================================
// WITHDRAWAL SCHEMAS
// ============================================

// Schema yêu cầu rút tiền
export const withdrawalSchema = z.object({
  amount: z
    .number()
    .min(50000, { message: "Số tiền rút tối thiểu là 50,000 VND" })
    .max(10000000, { message: "Số tiền rút tối đa là 10,000,000 VND" }),
});

export type WithdrawalInput = z.infer<typeof withdrawalSchema>;

// ============================================
// AFFILIATE LINK SCHEMAS
// ============================================

// Schema tạo link affiliate
export const createLinkSchema = z.object({
  originalUrl: z
    .string()
    .min(1, { message: "Vui lòng nhập link sản phẩm" })
    .url({ message: "Link không hợp lệ" })
    .refine(
      (url) => {
        // Chỉ chấp nhận link từ Shopee hoặc TikTok
        const validDomains = [
          "shopee.vn",
          "shope.ee",
          "tiktok.com",
          "vt.tiktok.com",
          "shp.ee",
          "shopeefood.vn",
        ];
        try {
          const hostname = new URL(url).hostname;
          return validDomains.some((domain) => hostname.includes(domain));
        } catch {
          return false;
        }
      },
      { message: "Chỉ hỗ trợ link từ Shopee hoặc TikTok" }
    ),
  guestSessionId: z.string().optional(),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;

// ============================================
// MANUAL LINK ENTRY SCHEMAS (ADMIN)
// ============================================

// Schema cho Admin thêm link thủ công
export const manualLinkSchema = z.object({
  shortLink: z
    .string()
    .min(1, { message: "Short link không được để trống" })
    .url({ message: "Short link phải là URL hợp lệ" }),
  originalUrl: z
    .string()
    .url({ message: "Original URL không hợp lệ" })
    .optional()
    .or(z.literal("")),
  platformId: z
    .number()
    .optional(), // Nếu không chọn -> auto-detect từ shortLink
  userId: z
    .string()
    .uuid({ message: "User ID không hợp lệ" })
    .optional()
    .nullable(), // Null = không gán user (orphan link)
});

export type ManualLinkInput = z.infer<typeof manualLinkSchema>;

# FEATURE CONTEXT: Role-Based Access Control (RBAC) & Admin Dashboard

## 1. ĐỊNH NGHĨA QUYỀN (ROLE DEFINITIONS)
Hệ thống có 2 vai trò chính được lưu trong bảng `users`, cột `role`:
- **`user` (Default):**
    - Chỉ xem được dữ liệu của chính mình (Link, Wallet, Transaction).
    - Chỉ được truy cập `/dashboard`.
- **`admin` (Superuser):**
    - Xem được TOÀN BỘ dữ liệu hệ thống.
    - Duyệt yêu cầu rút tiền.
    - Cấu hình API Key các sàn.
    - Truy cập được `/admin` và tất cả route con.

## 2. CHIẾN LƯỢC BẢO MẬT (SECURITY LAYERS)

### Layer 1: Edge Middleware (Next.js Middleware)
- **File:** `middleware.ts`.
- **Logic:**
    - Intercept tất cả request vào `/admin/*`.
    - Giải mã Session (NextAuth).
    - Nếu không có session -> Redirect `/login`.
    - Nếu `session.user.role !== 'admin'` -> Redirect `/403` (Forbidden) hoặc về trang chủ.

### Layer 2: Server Actions Protection (BẮT BUỘC)
AI thường hay quên bước này. Tuyệt đối không tin tưởng client.
- Mọi Server Action nhạy cảm (VD: `approveWithdrawal`, `updatePlatformConfig`) phải có đoạn check ở dòng đầu tiên:
  ```typescript
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    throw new Error("Unauthorized: Admin access required");
  }
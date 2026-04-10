# Kiến trúc Hệ thống (ARCHITECTURE)

## Tech Stack Tổng quan
- **Framework**: Next.js 15 (App Router).
- **Ngôn ngữ**: TypeScript.
- **UI/Styling**: Tailwind CSS v4, Shadcn UI, Lucide React.
- **Database**: PostgreSQL kết nối qua Drizzle ORM.
- **Authentication**: NextAuth.js (v5 Beta).

## Cấu trúc Thư mục Hệ thống (`src/`)
- `app/`: Chia 3 nhóm Route Groups chính:
  - `(auth)`: Dành riêng cho SignIn/SignUp.
  - `(dashboard)`: Giao diện bảo vệ dành cho User thông thường (trang `/links`, `/wallet`, `/settings`).
  - `(admin)`: Khu vực biệt lập cho Admin (`/admin/dashboard`, `/admin/users`, `/admin/transactions`).
- `actions/`: Chứa các hàm **Server Actions** (`"use server"`) đóng vai trò là Controllers biên dịch dữ liệu, tương tác trực tiếp với Database/DB Schema qua Drizzle.
- `services/`: Phân lớp Business Logic cấp thấp (vd: `affiliate.service.ts` - chịu trách nhiệm resolve các link từ Shopee/TikTok).
- `db/`: Cấu hình file `schema.ts`. Các entities chính: **users, platforms, affiliateLinks, transactions, withdrawalRequests**.
- `components/`:
  - `ui/`: File render pure cơ bản của Shadcn UI.
  - `features/`: Module/Component cấp cao tái sử dụng (vd: `hero-link-generator.tsx`).

## Lồng ghép Dữ liệu (Data Flow) - Tạo Link
1. User nhập URL Shopee vào form trang Home (Client Component).
2. Gọi Server Action `createLinkAction()` truyền payload URL và mode (`quick` / `standard`).
3. Server Action chuyển qua Service -> Server Service `resolveRedirects()` tìm đích đến cuối cùng và bóc tách metadata.
4. Ghi bản ghi vào Auth DB (nếu user login) hoặc dưới dạng Guest (dùng `guestSessionId`).
5. Trả về `shortLink` / `trackingUrl` nội bộ cho Client hiển thị.

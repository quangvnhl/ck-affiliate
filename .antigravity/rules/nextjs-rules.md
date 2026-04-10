# Next.js 15 Coding Rules

## 1. App Router Principles
- Tuân thủ nghiêm ngặt **React Server Components (RSC)** mặc định. 
- Chỉ dùng `"use client"` trên cùng file khi thiết yếu (vd: Event Listeners như `onClick`, Hooks như `useState`, `useEffect`, hoặc dùng các context liên quan tới Window API).
- Giữ logic lấy dữ liệu (Data Fetching) tại Server Component, truyền Data dạng Props xuống Client Component.

## 2. Server Actions thay thế API Route
- Với các tác vụ Create/Update/Delete, tạo các hàm được định cấu hình là `"use server"` bên trong thư mục `src/actions/`.
- Hạn chế sử dụng `route.ts` (API Endpoints truyền thống) ngoại trừ trường hợp cung cấp webhook ra cho dịch vụ bên thứ 3 (như bot tele, cron jobs).
- Các Server Action cần được gọi bên trong hàm `useTransition` ở component phía client để kiểm soát trạng thái loading.

## 3. SEO & Metadata
- Khi tạo page tĩnh hoặc động, luôn tận dụng chuẩn sinh thẻ `<title>` và `<meta>` của Next.js qua việc export biến `metadata` ở page layout hoặc sử dụng `generateMetadata()` cho Dynamic route.

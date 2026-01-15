# UI/UX CONTEXT & DESIGN SYSTEM

## 1. TRIẾT LÝ THIẾT KẾ (DESIGN PHILOSOPHY)
- **Style:** Minimalist, Clean, Trustworthy (Tin cậy - vì liên quan đến tiền bạc).
- **Approach:** Mobile-First (Ưu tiên di động). Hầu hết user tạo link affiliate trên điện thoại.
- **Color Palette:**
    - **Primary:** Brand Color (Ví dụ: Amber-600 hoặc Orange-600). Dùng cho nút CTA chính.
    - **Background:** White / Slate-50.
    - **Surface:** White (Cards, Modals) với shadow nhẹ (`shadow-sm`, `shadow-md`).
    - **Text:** Neutral-900 (Tiêu đề), Neutral-600 (Nội dung phụ).

## 2. THƯ VIỆN COMPONENT (MANDATORY)
- **Base Library:** Shadcn UI (dựa trên Radix UI).
- **Icons:** Lucide React.
- **Font:** Inter (Google Fonts).

## 3. QUY TẮC TAILWIND CSS (STYLING RULES)
- **Không dùng Arbitrary Values:** Tránh dùng kiểu `w-[123px]` hay `top-[15px]`. Hãy dùng utility chuẩn (`w-32`, `top-4`).
- **Spacing:** Sử dụng hệ số 4 (p-2, p-4, m-8, gap-4).
- **Layouts:**
    - Sử dụng `Flexbox` cho các thành phần nhỏ.
    - Sử dụng `CSS Grid` cho bố cục trang lớn (Dashboard Layout).
- **Light Mode:** Chỉ sử dụng light mode, không hỗ trợ dark mode.

## 4. CẤU TRÚC GIAO DIỆN (LAYOUT STRUCTURE)

### A. Public Layout (Landing Page, Login)
- **Header:** Logo, Menu (Về chúng tôi, Hướng dẫn), Button "Đăng nhập/Đăng ký".
- **Main:** Full width, centered container.
- **Footer:** Copyright, Link chính sách.

### B. Dashboard Layout (Sau khi login)
- **Sidebar (Desktop) / Drawer (Mobile):**
    - Menu: Tổng quan, Tạo Link, Quản lý đơn hàng, Ví tiền, Cài đặt.
    - Trạng thái Active: Highlight background + Text bold.
- **Top Bar:** Breadcrumb, User Avatar (Dropdown menu: Profile, Logout), Thông báo.
- **Content Area:** Padding chuẩn `p-4` hoặc `p-6`.

## 5. UI PATTERNS & FEEDBACK
- **Loading State:**
    - KHÔNG dùng text "Loading...".
    - BẮT BUỘC dùng **Skeleton** (`shadcn/skeleton`) mô phỏng hình dáng nội dung đang tải.
- **Empty State:** Khi list (đơn hàng, link) trống, phải hiển thị Icon minh họa + Text hướng dẫn + Nút CTA (Ví dụ: "Bạn chưa có link nào? Tạo ngay!").
- **Toast Notifications:** Dùng `Sonner` hoặc `Toast` để báo: "Copy link thành công", "Lỗi kết nối", "Đã lưu cài đặt".
- **Modal/Dialog:** Dùng cho các form quan trọng (Rút tiền) hoặc xác nhận xóa.

## 6. ZUSTAND FOR UI STATE
Sử dụng `useUIStore` để quản lý các trạng thái toàn cục của giao diện:
- `isSidebarOpen` (cho mobile toggle).
- `isGlobalLoading` (cho thanh loading bar trên cùng nếu cần).
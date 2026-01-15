# UI CONTEXT: Admin Dark Mode & Theming Strategy

## 1. CHIẾN LƯỢC KỸ THUẬT (TECHNICAL STRATEGY)
- **Library:** Sử dụng `next-themes` để quản lý việc switch theme (light/dark/system).
- **Core Principle:** Sử dụng **Semantic CSS Variables** của Shadcn UI.
    - **SAI:** Code cứng `className="bg-white dark:bg-slate-950"`.
    - **ĐÚNG:** Code `className="bg-background"`. Màu sắc sẽ tự thay đổi dựa trên định nghĩa biến `--background` trong file `globals.css`.
- **Persistence:** Lưu trạng thái theme vào `localStorage`.
- **Hydration Mismatch:** Sử dụng prop `suppressHydrationWarning` ở thẻ `<html>` trong `layout.tsx` để tránh lỗi React hydration khi reload trang.

## 2. BẢNG MÀU ADMIN (COLOR PALETTE TOKENS)
Admin Panel cần cảm giác chuyên nghiệp, lạnh và sâu (Deep & Cool).

### Global CSS Configuration (`globals.css`)
Cấu hình biến CSS cho Dark Mode dựa trên hệ màu **Slate** (Xanh xám):

```css
@layer base {
  :root {
    --background: 0 0% 100%; /* White */
    --foreground: 222.2 84% 4.9%; /* Slate-950 */
    /* ... các biến Light mode khác */
  }
 
  .dark {
    --background: 222.2 84% 4.9%; /* Slate-950 (Nền chính tối sẫm) */
    --foreground: 210 40% 98%; /* Slate-50 (Chữ trắng sáng) */
    
    --card: 222.2 84% 4.9%; /* Trùng nền hoặc sáng hơn xíu */
    --card-foreground: 210 40% 98%;
 
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
 
    --primary: 217.2 91.2% 59.8%; /* Blue-500 (Giữ nguyên màu brand) */
    --primary-foreground: 222.2 47.4% 11.2%;
 
    --muted: 217.2 32.6% 17.5%; /* Slate-800 (Dùng cho nền phụ, hover) */
    --muted-foreground: 215 20.2% 65.1%; /* Slate-400 (Text phụ) */
 
    --border: 217.2 32.6% 17.5%; /* Viền nhạt để chia cắt các khối */
    --input: 217.2 32.6% 17.5%;
  }
}
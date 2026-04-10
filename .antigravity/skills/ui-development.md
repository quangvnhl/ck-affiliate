# Styling & UI Development Skill

## Shadcn UI & Tailwind CSS Best Practices

1. **Utility-First Mindset**: Luôn tận dụng Tailwind system trước khi khởi tạo custom CSS. Chỉ ghi đè CSS thông qua `cn()` (Tailwind-merge) nhằm giúp mã nguồn component tránh tình trạng tranh chấp styles cục bộ (Style conflicts).

2. **Tái sử dụng Component (Shadcn)**:
   - Các Component nhỏ mang tính công cụ chuẩn (`Button`, `Dialog`, `Input`, `Card`...) LUÔN LUÔN import từ `src/components/ui/`.
   - Tránh việc tự viết lại UI logic cơ bản. Nếu cần cập nhật behavior/style toàn cục của Button, hãy sửa thẳng vào source Shadcn của file UI đó (ví dụ `src/components/ui/button.tsx`).

3. **Chăm sóc Giao Diện Bóng Đêm (Dark Mode Focus)**:
   - Toàn bộ giao diện hệ thống đang sử dụng kiến trúc Slate/Emerald/Pink có Dark Mode support (via `dark:` class modifier).
   - Hãy kiểm tra mọi nền màu tĩnh (như `bg-white`) phải đi kèm biến đổi màn hình tối (`dark:bg-slate-900`) hoặc chỉ sử dụng biến màu CSS custom `bg-background`, `text-foreground`.
   - Luôn test button states (hover, disabled, active) khi đổi chế độ.

4. **Animations & Transitions**:
   - Sử dụng thẻ class `transition-all duration-200` cho hầu hết các hành động trỏ chuột. Tận dụng `tw-animate-css` (đã config trong package) nếu có popup lớn.

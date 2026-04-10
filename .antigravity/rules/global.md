# Quy tắc Lập trình Toàn cầu (Global Core Rules)

## 1. Format Code chung (General Formatting)
- Code luôn sử dụng **TypeScript strict mode**. Type/Interface rõ ràng để bảo vệ cấu trúc (Đặc biệt với object trả về từ function, phải tường minh type của Response thay vì dùng kiểu `any`).
- Format sử dụng chuẩn Prettier chung, không để code quá dài qua 120 dòng (giữ nhỏ gọn chia Component).
- Quy chuẩn Naming:
  - Components: `PascalCase` (.tsx)
  - Functions/Variables: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Tên File Cấu trúc (NextApp): `kebab-case.ts` (vd: `dashboard-layout.tsx`).

## 2. Giao tiếp Ngôn ngữ
- **Tiếng Anh**: Variable, Function names, Component names, System Error Exceptions (phục vụ log lỗi kĩ thuật nội bộ).
- **Tiếng Việt**: Client Facing Copy (Nội dung hiển thị ra giao diện trên UI), Client Facing Notifications (Toast Message - Sonner), Inline code docstrings / comments để dễ dàng maintain cùng teams.

## 3. Tư duy Lỗi (Error Handling Focus)
- Mọi action truy xuất Database bắt buộc bọc trong `try...catch`. Lỗi xuất ra phải cung cấp đủ chi tiết (ví dụ: in ra `console.error` nội bộ, nhưng đối với client chỉ thông báo `{ success: false, message: 'Đã xảy ra lỗi hệ thống' }` để tránh lộ payload SQL).

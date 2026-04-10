# Hệ cơ sở Dữ liệu - Drizzle ORM Rules

## 1. Safety & Cảnh báo Data Loss
- Database dùng cấu trúc Relational SQL (Postgres). Mọi thay đổi schema (`src/db/schema.ts`) phải được Review thủ công bởi người dùng trước khi tiến hành run command push/migrate. Bất kì cột nào bị đổi tên thay vì sửa đều có thể phá hỏng kiến trúc bảo mật. 

## 2. Quy trình Query
- Hạn chế dùng Magic Query String, hãy tận dụng Relational Query Planner (bằng hàm `db.query.tableName.findFirst`) cho các Read Model cấp cao dễ đọc.
- Với các phép Query đa bảng (Join) phức tạp và có phân trang, hãy dùng Query Builder cơ bản (`db.select().from().leftJoin()`) kết hợp `desc` của Drizzle để tối đa hoá hiệu suất bộ đệm.

## 3. Kỷ luật Dòng Tiền (Transaction Rule)
Bất kỳ xử lý nào đụng đến ví `walletBalance` của bảng `users`:
- Bắt buộc kiểm tra quyền quản trị Admin/Super Admin thật tỉ mỉ hoặc phiên sở hữu tài khoản.
- Bắt buộc phải log lịch sử tại bảng `transactions`.
- Tương lai (nếu cần scale), mọi lệnh sửa số dư phải nằm trong block `db.transaction(async (tx) => { ... })` để tránh Race Condition.

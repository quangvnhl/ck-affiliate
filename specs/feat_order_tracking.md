# FEATURE CONTEXT: Order Tracking & Cashback Calculation

## 1. MÔ TẢ CHỨC NĂNG
Tự động đồng bộ đơn hàng từ các sàn về hệ thống, xác định đơn hàng đó thuộc về user nào và tính toán số tiền hoa hồng họ được nhận.

## 2. CHIẾN LƯỢC ĐỒNG BỘ (SYNC STRATEGY)
- **Phương pháp:** Sử dụng API Polling (Cron Job chạy mỗi 30 phút) hoặc Webhook (nếu sàn hỗ trợ).
- **Endpoint:** `/api/cron/sync-orders` (Bảo mật bằng Secret Key).

## 3. LOGIC TÍNH TIỀN (CORE LOGIC)
Khi quét được một đơn hàng mới từ API Sàn:
1.  **Parse Tracking ID:** Đọc trường `sub_id` hoặc `utm_source` từ dữ liệu đơn hàng để lấy `user_id`.
2.  **Check Duplicate:** Kiểm tra `order_id_external` trong bảng `transactions`. Nếu tồn tại -> Bỏ qua hoặc Cập nhật trạng thái.
3.  **Calculate Commission:**
    - `TotalCommission` = Số tiền sàn trả cho Admin.
    - `UserCashback` = `TotalCommission` * 0.7 (User nhận 70%, Admin giữ 30%).
4.  **Status Mapping:**
    - Sàn trả `Pending` -> Hệ thống lưu `pending`.
    - Sàn trả `Completed` -> Hệ thống lưu `approved` -> **Cộng tiền vào ví User**.
    - Sàn trả `Cancelled` -> Hệ thống lưu `rejected` -> **Không cộng tiền**.

## 4. YÊU CẦU DATABASE
- Sử dụng `db.transaction()` khi cập nhật trạng thái đơn hàng để đảm bảo tính toàn vẹn dữ liệu.
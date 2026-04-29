# Công thức đối soát (Reconciliation Formula)

## 1. Công thức tính toán
Khi một đơn hàng phát sinh từ sàn thương mại điện tử (ví dụ Shopee), hệ thống thực hiện đối soát dựa trên các thông số sau:

- **Order Amount:** Giá trị đơn hàng.
- **Commission Amount:** Tổng số tiền hoa hồng sàn trả cho hệ thống.
- **Commission Percent:** Tỷ lệ phần trăm hoa hồng chia lại cho người dùng (thường lấy từ system settings, ví dụ 70%).

### Tính toán Cashback (VNĐ)
Số tiền hoàn lại (Cashback) cho người dùng được tính bằng:
`cashbackAmount = commissionAmount * (commissionPercent / 100)`

### Tính toán Điểm (Points)
Hệ thống sử dụng tỷ giá quy đổi mặc định là: **1000 VNĐ = 1 điểm**.
Số điểm người dùng nhận được từ giao dịch:
`points = Math.floor(cashbackAmount / 1000)` (thường làm tròn để ra điểm số nguyên).

## 2. Xử lý SubID (Shopee)
Khi nhận file dữ liệu raw từ Shopee, mỗi đơn hàng sẽ có tham chiếu đến một SubID để xác định Affiliate Link nào đã tạo ra đơn hàng.
- Định dạng SubID trả về từ Shopee thường có dạng: `code----`
- Backend thực hiện parsing: `split('-')[0]` để lấy chuỗi `code` của short link (ví dụ: `abc12`).
- **Validation:** Hệ thống chỉ chấp nhận và trích xuất các ký tự chữ và số (alphanumeric) để đảm bảo không bị lỗi dữ liệu trước khi map với bảng `affiliate_links`.

# NGHIỆP VỤ & CÔNG THỨC TÍNH TOÁN

## 1. Luồng tạo Link (Cho cả Khách & Member)
1.  Người dùng dán Link gốc sản phẩm (VD: https://shopee.vn/san-pham-a).
2.  Hệ thống tự động nhận diện Sàn (Shopee/TikTok) qua Regex.
3.  Hệ thống dùng API Credential của Admin để gọi sang sàn lấy Link Rút Gọn (ShortLink).
4.  **Quan trọng:** Phải gắn kèm `sub_id` (chứa user_id hoặc guest_session_id) vào link rút gọn để tracking đơn hàng sau này.
5.  Trả về link tiếp thị cho người dùng.

## 2. Logic tính tiền Cashback (Hoa hồng)
Admin nhận tiền từ sàn, sau đó chia lại một phần cho User.

**Công thức:**
`Tiền User nhận = (Giá trị đơn hàng * % Hoa hồng sàn trả) * % Chia sẻ của tôi`

- **% Hoa hồng sàn trả:** Lấy động từ API sàn hoặc cấu hình cứng nếu API không trả về.
- **% Chia sẻ của tôi:** Cấu hình trong Admin (Ví dụ: Tôi chia lại 70% số tiền tôi nhận được cho User).

## 3. Đồng bộ đơn hàng (Webhook/Cron)
- Hệ thống chạy Cron Job quét đơn hàng thành công từ API các sàn.
- Cơ chế khớp đơn: Dựa vào `sub_id` trong dữ liệu đơn hàng để tìm ra `user_id`.
- Luồng trạng thái: `Chờ duyệt` -> `Đã duyệt` (Cộng tiền vào ví) -> `Hủy` (Nếu khách trả hàng/hoàn tiền).
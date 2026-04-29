# Kiến trúc hệ thống Điểm (Points Architecture)

## 1. Quyết định kiến trúc
- **Không lưu trường `point_balance` cứng** vào bảng `users`.
- Thay vào đó, **Điểm (Points) được tính toán động (reduce)** từ các bản ghi `transactions`.
- Lý do: Đảm bảo an toàn tuyệt đối về mặt dữ liệu, tránh tình trạng điểm số bị lệch hoặc âm điểm do lỗi hệ thống trong quá trình cập nhật đồng thời (race condition).

## 2. Loại giao dịch (Transaction Types)
Bảng `transactions` đóng vai trò là sổ cái (ledger) ghi nhận mọi biến động điểm của người dùng:
- **Dòng tiền VÀO (`type = 'commission'`):** 
  - Ghi nhận điểm thưởng từ các đơn hàng thành công (Cashback). 
  - Điểm chỉ được cộng vào số dư khả dụng khi trạng thái giao dịch là `status = 'confirmed'`.
  - Giá trị điểm (`points`) sẽ mang dấu dương (+).
- **Dòng tiền RA (`type = 'withdrawal'`):**
  - Ghi nhận yêu cầu rút điểm của người dùng.
  - Mỗi khi user tạo yêu cầu rút, hệ thống tạo một transaction mới với loại `withdrawal`.
  - Giá trị điểm (`points`) sẽ mang dấu âm (-), tương ứng với số điểm bị trừ.

## 3. Tính toán số dư hiện tại
Số dư điểm hiện tại của một user được tính bằng tổng (sum) của cột `points` từ tất cả các bản ghi trong bảng `transactions` thỏa mãn điều kiện:
- `user_id` khớp với user cần tính.
- `status = 'confirmed'` (đối với dòng tiền vào). Dòng tiền ra `withdrawal` cũng phải được tính nếu nó đã được trừ (thường là 'pending' đã bị trừ ngay lúc tạo để phong tỏa).

## 4. Ưu điểm
- **Traceability:** Mọi biến động điểm đều được lưu vết, dễ dàng audit và truy xuất lịch sử.
- **Data Integrity:** Không sợ mất đồng bộ giữa bảng `users` và bảng `transactions`.

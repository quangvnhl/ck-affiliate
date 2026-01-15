# FEATURE CONTEXT: Wallet & Withdrawal System

## 1. MÔ TẢ CHỨC NĂNG
Quản lý số dư của người dùng và xử lý yêu cầu rút tiền về tài khoản ngân hàng.

## 2. QUY TẮC AN TOÀN TÀI CHÍNH (HARD RULES)
1.  **No Negative Balance:** Số dư ví tuyệt đối không được âm.
2.  **Double-Spend Protection:** Ngăn chặn user gửi 2 request rút tiền cùng lúc (Race Condition).
3.  **Minimum Threshold:** Số tiền rút tối thiểu: 50.000 VNĐ.

## 3. LUỒNG RÚT TIỀN (WITHDRAWAL FLOW)
1.  User nhập số tiền và thông tin ngân hàng.
2.  Server Action `requestWithdrawal(amount)`:
    - **Bước 1 (Transaction Start):** Mở DB Transaction.
    - **Bước 2 (Lock & Check):** `SELECT wallet_balance FROM users WHERE id = ... FOR UPDATE`. (Khóa dòng này lại).
    - **Bước 3 (Validate):** Nếu `wallet_balance < amount` -> Throw Error "Số dư không đủ".
    - **Bước 4 (Deduct):** `UPDATE users SET wallet_balance = wallet_balance - amount`.
    - **Bước 5 (Record):** `INSERT INTO withdrawal_requests (amount, status='pending')`.
    - **Bước 6 (Commit):** Lưu Transaction.

## 4. UI/UX
- Hiển thị lịch sử biến động số dư rõ ràng (Cộng tiền từ đơn hàng, Trừ tiền do rút).
- Sử dụng `React Query` để re-fetch số dư ngay sau khi thực hiện lệnh rút.
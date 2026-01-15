# FEATURE CONTEXT: User Management & Guest Conversion

## 1. MÔ TẢ CHỨC NĂNG
Quản lý vòng đời người dùng: Đăng ký, Đăng nhập, Quản lý hồ sơ cá nhân, Thông tin thanh toán (Ngân hàng). Đặc biệt xử lý logic gộp dữ liệu từ Guest sang Member.

## 2. CHIẾN LƯỢC XÁC THỰC (AUTHENTICATION STRATEGY)
- **Library:** Sử dụng **NextAuth.js (Auth.js)** phiên bản tương thích Next.js App Router.
- **Providers:**
    - Credentials (Email/Password).
    - Google (Optional - ưu tiên sau).
- **Session Strategy:** JWT (JSON Web Token) để stateless, phù hợp với serverless deployment (Neon Tech).
- **Security:** Password phải được hash bằng `bcrypt` hoặc `argon2` trước khi lưu xuống DB.

## 3. LOGIC "GUEST TO MEMBER" (QUAN TRỌNG)
Đây là tính năng "Killer Feature" giúp giữ chân người dùng.

**Vấn đề:** Khách vãng lai (Guest) đã tạo link affiliate và có thể đã có click/hoa hồng. Dữ liệu này đang gắn với `guest_id` (trong Cookie/LocalStorage).
**Giải pháp:**
1.  **Khi Guest Đăng ký/Đăng nhập lần đầu:**
    - Client gửi kèm `guest_id` (nếu có trong cookie) lên Server Action `registerUser`.
2.  **Post-Registration Hook:**
    - Sau khi `INSERT` user mới thành công.
    - Thực hiện câu lệnh SQL Update:
      ```sql
      UPDATE affiliate_links 
      SET user_id = NEW_USER_ID 
      WHERE user_id IS NULL AND guest_session_id = GUEST_ID;
      ```
    - Tương tự với bảng `transactions` (nếu có).
3.  **Cleanup:** Xóa `guest_id` khỏi Cookie sau khi merge xong.

## 4. QUẢN LÝ THÔNG TIN THANH TOÁN (BANKING INFO)
User cần nhập thông tin để nhận tiền Cashback.
- **Dữ liệu cần lưu:**
    - Tên ngân hàng.
    - Số tài khoản.
    - Tên chủ tài khoản (Phải viết hoa không dấu để đối soát tự động).
- **Validation:** Không cho phép trùng số tài khoản giữa các user khác nhau (để tránh cheat).

## 5. CẤU TRÚC DỮ LIỆU & TYPE (TYPESCRIPT)
- **Zod Schema (`SignUpSchema`):**
    - Email: `z.string().email()`
    - Password: Tối thiểu 8 ký tự, 1 chữ hoa, 1 số.
- **Interface:**
    - `UserProfile`: Chỉ chứa info public.
    - `UserSensitive`: Chứa info ngân hàng (chỉ trả về khi đúng chủ sở hữu gọi).

## 6. UI/UX GUIDELINES
- **Form:** Sử dụng `react-hook-form` kết hợp `zod resolver`.
- **Feedback:** Hiển thị Toast Message (Success/Error) rõ ràng tiếng Việt.
- **Loading State:** Disable nút "Đăng ký" khi đang submit để tránh double-submit.
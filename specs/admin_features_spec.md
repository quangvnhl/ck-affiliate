# ADMIN PANEL FEATURE SPECIFICATIONS

## 1. DASHBOARD OVERVIEW (TRANG TỔNG QUAN)
Đây là màn hình đầu tiên Admin nhìn thấy (`/admin/dashboard`).
- **Thống kê KPI (Cards):**
    - **Tổng doanh thu tạm tính:** Tổng tiền hoa hồng từ sàn (chưa trừ phần của user).
    - **Số dư ví người dùng:** Tổng nợ phải trả cho User.
    - **Chờ rút tiền:** Số lượng yêu cầu rút tiền đang `pending`.
    - **Click hôm nay:** Tổng traffic qua link affiliate.
- **Biểu đồ (Charts):**
    - **Doanh thu theo ngày (Revenue Trend):** Bar chart 7 ngày gần nhất.
    - **Tỷ trọng sàn:** Pie chart (Shopee vs TikTok).
- **Danh sách mới nhất:** 5 yêu cầu rút tiền mới nhất + 5 User đăng ký mới nhất.

## 2. QUẢN LÝ TÀI CHÍNH (FINANCIAL MANAGEMENT)

### A. Duyệt rút tiền (`/admin/withdrawals`) - *QUAN TRỌNG NHẤT*
- **Giao diện:** Bảng dữ liệu (DataTable).
- **Cột hiển thị:** Mã yêu cầu, User Email, Tên ngân hàng, Số tài khoản, Số tiền, Ngày tạo, Trạng thái.
- **Tính năng lọc:** Lọc theo trạng thái (Pending, Approved, Rejected).
- **Hành động (Action):**
    - **Duyệt (Approve):**
        1. Admin chuyển khoản thủ công qua ngân hàng.
        2. Bấm nút "Đã chuyển tiền" trên web -> Upload ảnh biên lai (Optional).
        3. System: Update status -> 'approved'.
    - **Từ chối (Reject):**
        1. Nhập lý do từ chối (VD: "Sai số tài khoản").
        2. System: Hoàn lại tiền vào ví User (`wallet_balance` + amount). Update status -> 'rejected'.

### B. Lịch sử giao dịch (`/admin/transactions`)
- Xem toàn bộ dòng tiền vào (từ đơn hàng) và ra (rút tiền).
- **Chức năng:** Đối soát. Nếu User kêu thiếu tiền, Admin vào đây tìm theo `Order ID` của sàn.

## 3. QUẢN LÝ NGƯỜI DÙNG (`/admin/users`)
- **Giao diện:** Bảng danh sách User.
- **Hành động:**
    - **Xem chi tiết:** Xem số dư hiện tại, tổng tiền đã rút, danh sách link đã tạo.
    - **Khóa tài khoản (Ban):** Nút Toggle "Active/Inactive". Nếu bị khóa, user không thể đăng nhập và link affiliate của họ sẽ ngừng hoạt động (hoặc chuyển hoa hồng về Admin).
    - **Cộng/Trừ tiền thủ công:** Dùng để xử lý sự cố (VD: Cộng thưởng event). Phải có log ghi lại lý do cộng tiền.

## 4. QUẢN LÝ CẤU HÌNH HỆ THỐNG (`/admin/settings`)
Admin có thể thay đổi tham số vận hành mà không cần sửa code/deploy lại.

### A. Cấu hình Sàn (Platform Config)
- **Shopee:**
    - App ID / API Key / Secret Key.
    - Global Commission Rate: % chia sẻ mặc định (VD: 70%).
- **TikTok:** Tương tự.
- **Tính năng:** Nút "Test Connection" để kiểm tra xem API Key có còn sống không.

### B. Cấu hình Rút tiền
- Số tiền rút tối thiểu (VD: 50.000 VNĐ).
- Thông báo hệ thống (Banner thông báo bảo trì hiển thị ngoài trang User).

## 5. CÔNG CỤ TIỆN ÍCH (TOOLS)
- **Link Tester:** Ô input để Admin dán link gốc -> Hệ thống trả về kết quả xem API có hoạt động không, ra link gì, `sub_id` gắn đúng không.
- **Manual Sync:** Nút bấm để kích hoạt Cron Job đồng bộ đơn hàng ngay lập tức (thay vì chờ đến giờ chạy tự động).

## 6. YÊU CẦU KỸ THUẬT (TECHNICAL REQUIREMENTS)
- **Data Table:** Sử dụng thư viện `TanStack Table` (React Table) để hỗ trợ sort, filter, pagination phía Server (Server-side rendering) cho hiệu năng cao khi dữ liệu lớn.
- **Export Excel:** Các bảng Rút tiền và Giao dịch phải có nút "Export .CSV" để kế toán đối soát.
- **Security:** Mọi hành động ghi (Create/Update/Delete) phải bắt buộc check `session.user.role === 'admin'`.
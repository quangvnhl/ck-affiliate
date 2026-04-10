# Dự án: CK Affiliate
## Bối cảnh (Project Context)

### Tổng quan Nền tảng
**CK Affiliate** là một giải pháp nền tảng (platform) hỗ trợ các người dùng cuối và quản trị viên quản lý, chia sẻ và theo dõi dòng tiền tiếp thị liên kết (Affiliate Marketing). Hệ thống khởi đầu hỗ trợ hai sàn TMĐT lớn là **Shopee** và **TikTok Shop**, cho phép tự động giải mã các link thường và link rút gọn, tạo mã chia sẻ mới và phân tách 70% giá trị hoa hồng lại cho người dùng.

### Target Audience (Người dùng mục tiêu)
1. **User thông thường**: Tạo link chia sẻ, nhận thông báo lượt click, theo dõi số dư ví (Balance) và gửi yêu cầu Rút tiền (Withdrawal).
2. **Quản trị viên (Admin/Super Admin)**: Quản lý người dùng, duyệt yêu cầu rút tiền thủ công, cấu trúc hoa hồng nền tảng (Commission Share) và can thiệp link thủ công.

### Những thách thức kỹ thuật lớn
1. **Redirect & Tracking:** Cần resolve (phân giải) chuỗi redirect từ link rút gọn của user về link gốc của trang sản phẩm để bóc tách thông tin (Title, Original URL) bằng kỹ năng Scraping/Fetch linh hoạt.
2. **Transaction Integrity:** Quản lý tiền bạc đòi hỏi sự nghiêm ngặt tuyệt đối khi thay đổi cột `walletBalance`, luôn đi kèm dòng ghi log `transactions`.
3. **UX Hiện đại:** Trải nghiệm tạo link "Siêu nhanh" (Quick mode) cần mượt mà, chuyển đổi dark/light mode thanh lịch.

# FEATURE CONTEXT: Manual Affiliate Link Entry

## 1. MÔ TẢ CHỨC NĂNG (FEATURE OVERVIEW)
Cho phép Admin (hoặc Hệ thống) thêm một link affiliate **đã tồn tại sẵn** vào Database.
Hệ thống phải xử lý linh hoạt 2 trường hợp:
1.  **Assigned Link:** Gán link cho một User cụ thể (User sở hữu link và nhận hoa hồng).
2.  **Unassigned/System Link:** Link không thuộc về User nào (Hoa hồng thuộc về Admin hoặc chờ Claim).

## 2. USE CASES (TRƯỜNG HỢP SỬ DỤNG)
- Admin import danh sách link từ file Excel/Hệ thống cũ.
- Admin tạo link giúp User khi User gặp lỗi không tự tạo được.
- Tạo "Public Link" để chạy chiến dịch marketing chung của sàn.

## 3. LOGIC XỬ LÝ (CORE LOGIC)

### A. Input Validation (Zod Schema)
- **Short Link:** Bắt buộc. Phải kiểm tra Unique (không được trùng trong DB).
- **Original URL:** Tùy chọn (Optional) - vì đôi khi import link cũ không còn nhớ link gốc.
- **Platform:** Bắt buộc (Shopee/TikTok). Nếu không chọn -> Tự động detect từ domain của Short Link.
- **User ID:** Tùy chọn (Nullable).

### B. Logic "Gán User" (Assignment Logic)
Khi lưu vào bảng `affiliate_links`:

1.  **Trường hợp 1: Có User ID**
    - Kiểm tra `user_id` có tồn tại trong bảng `users` không.
    - Nếu có -> Lưu `user_id`.
    - `guest_session_id` -> Set `NULL`.

2.  **Trường hợp 2: Không có User ID (Unassigned)**
    - `user_id` -> Set `NULL`.
    - `guest_session_id` -> Set `NULL` (hoặc một chuỗi định danh "system_import").
    - **Ý nghĩa:** Các giao dịch phát sinh từ link này sẽ có `sub_id` không khớp với user nào -> Transaction sẽ ở trạng thái 'orphan' (mồ côi) -> Tiền về Admin.

### C. Cơ chế Parse Platform
- Nếu input không chọn Platform, hệ thống phải chạy Regex trên `short_link`:
    - Chứa `shope.ee` hoặc `shopee.vn` -> Platform ID = Shopee.
    - Chứa `tiktok.com` hoặc `vt.tiktok.com` -> Platform ID = TikTok.
    - Không nhận diện được -> Throw Error yêu cầu chọn thủ công.

## 4. YÊU CẦU KỸ THUẬT (TECHNICAL SPECS)
- **Server Action:** `createManualLinkAction(data)`.
- **Database Interaction:**
    - Sử dụng `db.insert(affiliate_links)`.
    - Handle lỗi `PostgresError`: Nếu mã lỗi trùng lặp (Unique Violation) -> Trả về thông báo tiếng Việt "Link rút gọn này đã tồn tại trong hệ thống".

## 5. UI/UX (ADMIN VIEW)
Tại trang `/admin/links/create`:
- **Form Layout:**
    - **User Selection:** Sử dụng `Combobox` (Shadcn UI) cho phép search theo Email hoặc Tên. Có tùy chọn "Không gán người dùng" (Clear selection).
    - **Platform Select:** Dropdown chọn sàn.
    - **Inputs:** Short Link (Bắt buộc), Original Link (Optional).
- **Feedback:**
    - Thành công: Toast "Đã thêm link vào hệ thống".
    - Reset form để nhập tiếp link khác nhanh chóng.
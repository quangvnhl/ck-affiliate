# FEATURE CONTEXT: Link Generation (Tạo Link Tiếp Thị)

## 1. MÔ TẢ CHỨC NĂNG
Hệ thống nhận vào một URL sản phẩm (Shopee/TikTok), nhận diện sàn, gọi API rút gọn link và gắn kèm mã định danh người dùng (Tracking ID).

## 2. LUỒNG XỬ LÝ (LOGIC FLOW)
1.  **Input Validation:**
    - Kiểm tra URL có hợp lệ không (Regex).
    - Xác định `platform_id` dựa trên domain (VD: `shopee.vn` -> Shopee, `shop.tiktok.com` -> TikTok).
2.  **User Identification (Quan trọng):**
    - Nếu User đã đăng nhập: Lấy `user_id`.
    - Nếu là Khách (Guest): Tạo một `guest_id` lưu vào Browser Fingerprint/LocalStorage. (Lưu ý: Guest tạo link vẫn được ghi nhận, nhưng phải đăng ký mới được rút tiền).
3.  **Adapter Pattern Execution:**
    - Gọi `AffiliateFactory.getAdapter(platform)`.
    - Thực thi hàm `generateShortLink(url, sub_id)`.
    - **Quy tắc sub_id:** `sub_id` phải chứa `user_id` để tracking sau này.
4.  **Persistence (Lưu Database):**
    - Lưu record vào bảng `affiliate_links`.
5.  **Output:** Trả về Short Link + QR Code.

## 3. YÊU CẦU KỸ THUẬT (TECHNICAL CONSTRAINTS)
- **Zustand:** Sử dụng store `useLinkStore` để lưu trạng thái loading và lịch sử link vừa tạo.
- **Server Action:** Tên hàm `generateLinkAction(formData)`.
- **Error Handling:** Nếu API sàn lỗi, phải trả về thông báo tiếng Việt thân thiện (VD: "Hệ thống Shopee đang bảo trì, vui lòng thử lại sau").
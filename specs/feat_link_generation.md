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

### A. Chiến lược tạo Link (Strategy Pattern)
Hệ thống hỗ trợ 2 chế độ tạo link, cấu hình trong bảng `platforms`:
1.  **API Mode (Ưu tiên):** Gọi GraphQL API để lấy ShortLink chính thống.
2.  **Manual Mode (Fallback):** Tự động ghép chuỗi URL theo công thức Universal Link. Dùng khi chưa có API Key hoặc API bị lỗi quota.

### B. Cơ chế Manual Construction (Quan trọng)
Khi sử dụng chế độ Manual cho Shopee, áp dụng công thức sau:

**Công thức chuẩn:**
`https://s.shopee.vn/an_redir?origin_link={ENCODED_URL}&affiliate_id={AFF_ID}&sub_id={TRACKING_ID}`

**Quy tắc tham số:**
1.  `origin_link`: URL gốc sản phẩm, bắt buộc phải **Encode URI Component** (VD: `https%3A%2F%2Fshopee.vn...`).
2.  `affiliate_id`: Lấy từ cấu hình `platforms.api_config.affiliate_id`.
3.  `sub_id`:
    - Mục tiêu: Phải chứa định danh người dùng để tính Cashback.
    - **Logic ghép:** `{DEFAULT_SUB_ID}_{USER_ID}`.
    - Trong đó:
        - `DEFAULT_SUB_ID`: Mã định danh hệ thống (Lấy từ cấu hình, VD: "CKWEB").
        - `USER_ID`: UUID của người dùng hoặc Guest ID.
    - *Lưu ý:* Nếu chỉ dùng `DEFAULT_SUB_ID` tĩnh, hệ thống sẽ KHÔNG biết đơn hàng thuộc về user nào để trả thưởng.

### C. Ví dụ dữ liệu Config (JSON)
Trong bảng `platforms`, cột `api_config` cần lưu:
```json
{
  "mode": "manual", // hoặc "api"
  "affiliate_id": "123456789",
  "default_sub_id": "CKSYSTEM",
  "app_id": "...", // Dùng cho API mode
  "secret": "..."  // Dùng cho API mode
}
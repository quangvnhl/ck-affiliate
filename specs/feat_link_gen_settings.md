# FEATURE CONTEXT: Configurable Link Generation Methods

## 1. MỤC TIÊU
Cho phép Admin cấu hình phương thức tạo link Shopee thông qua giao diện Settings. Hệ thống sẽ hỗ trợ 2 chế độ:
1.  **System Link (Mặc định):** Sử dụng logic cũ (Clean URL -> Internal Shortener).
2.  **Shopee Link (External API):** Gọi API bên thứ 3 để lấy link rút gọn chính chủ từ Shopee.

## 2. DATABASE & CONFIGURATION
Cập nhật bảng `platforms` (cột `api_config`) hoặc tạo bảng `system_settings` riêng. Để đơn giản và gắn liền với Shopee, ta sẽ cập nhật cấu hình trong bảng `platforms` cho bản ghi Shopee.

**Cấu trúc JSON `api_config` cập nhật:**
```json
{
  "link_gen_method": "shopee_api", // hoặc "system_default"
  "external_api_url": "[https://ck-aff-local.cukinacha.com/api/get-link](https://ck-aff-local.cukinacha.com/api/get-link)",
  // ... các config cũ (app_id, secret...)
}
```

## 3. LOGIC XỬ LÝ (CORE LOGIC)
### A. Quy trình tạo link (Updated Flow)
Tại `AffiliateService.generateLink:`
1. Lấy cấu hình Platform Shopee từ DB.
2. Kiểm tra `api_config.link_gen_method`:
    - Case 1: `system_default`: Chạy logic cũ (Clean URL -> Metadata -> Internal Shortener).
    - Case 2: `shopee_api`: Chạy logic mới (Gọi External API).

### B. Logic "Shopee Link" (New Method)
1. Request: 
    - Method: GET
    - URL: ${external_api_url}?url=${original_url}
2. Response Handling:
    - Parse JSON response.
    - Lấy `data.data.batchCustomLink[0]`.
    - `shortLink` -> Lưu vào cột `tracking_url` (Link đích để redirect tới).
    - `longLink` -> Lưu vào cột `clean_url` (Link gốc sạch).
3. Lưu trữ:
    - Vẫn sinh `code` ngẫu nhiên (Internal Shortener) để tracking clicks nội bộ.
    - Link nội bộ (ckaffiliate.com/xyz) sẽ redirect tới `shortLink` (Link Shopee rút gọn) thay vì link dài loằng ngoằng.

## 4. UI/UX (ADMIN SETTINGS)
Tại trang `/admin/settings`:

- Thêm Radio Group hoặc Select box: "Phương thức tạo link".
    - Option 1: Hệ thống tự tạo (System Default).
    - Option 2: Shopee API (External).
- Nếu chọn Option 2: Hiển thị ô Input để nhập "API Endpoint URL".

## 5. EXTERNAL API SPEC (REFERENCE)
Request Example: `GET https://ck-aff-local.cukinacha.com/api/get-link?url=https://shopee.vn/sp-i.123.456`
```JSON
{
  "success": true,
  "data": {
    "data": {
      "batchCustomLink": [
        {
          "shortLink": "[https://s.shopee.vn/6fb9M5lt1R](https://s.shopee.vn/6fb9M5lt1R)", // -> tracking_url
          "longLink": "[https://shopee.vn/](https://shopee.vn/)..." // -> clean_url
        }
      ]
    }
  }
}
```
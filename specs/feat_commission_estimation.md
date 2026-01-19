# FEATURE CONTEXT: Shopee Commission Estimation

## 1. MỤC TIÊU
Khi người dùng tạo link Shopee, hệ thống tự động gọi API của Shopee để lấy thông tin hoa hồng ước tính. Dữ liệu này được dùng để hiển thị số tiền hoàn lại (Cashback) dự kiến cho người dùng (50% - 80%).

## 2. API INTEGRATION
**Endpoint:** `https://mall.shopee.vn/api/v4/generic_sharing/get_sharing_info`
**Method:** `GET`
**Query Params:**
- `url`: Link gốc sản phẩm (Original URL hoặc Clean URL).

**Response Schema (Quan trọng):**
Dữ liệu nằm sâu trong cấu trúc JSON. Cần traverse chính xác:
```javascript
response.data.sharing_banner.sections[0].content // Array
```
Lấy phần tử cuối cùng trong mảng `content`. Giá trị nằm ở key `text` (VD: "₫12.255").

## 3. LOGIC XỬ LÝ (BACKEND)
### A. Service: fetchCommissionEstimate(url: string)
Thêm hàm này vào `AffiliateService` hoặc `MetadataService`.

1. Fetching:
    - Gọi API với `original_url`.
    - Header: Bắt buộc giả lập `User-Agent` mobile hoặc browser để không bị chặn.

2. Parsing (Trích xuất số tiền):
    - Truy cập: `data?.sharing_banner?.sections[0]?.content`.
    - Lấy phần tử cuối cùng (`array[length-1]`).
    - Lấy giá trị text.
    - Sanitization:
        - Chuỗi gốc: "₫12.255" hoặc "12.255đ".
        - Xóa ký tự tiền tệ và dấu chấm phân cách ngàn.
        - Parse sang Number (Integer).
        - Ví dụ: "₫12.255" -> `12255`.

3. Lưu trữ (Storage):
    - Lưu giá trị này vào cột meta_data trong bảng `affiliate_links`.
    - Key: `est_commission` (number).

### B. Integration Flow
Trong hàm `generateLink` (AffiliateService):
    - ***Bước 1***: Resolve URL -> Clean URL.
    - ***Bước 2***: Chạy song song (Parallel) 2 tác vụ:
        - Task A: `extractMetadata` (Lấy ảnh, title).
        - Task B: `fetchCommissionEstimate` (Lấy tiền).
    - ***Bước 3***: Merge kết quả vào object `meta_data`.
    - ***Bước 4***: Insert vào DB.

## 4. UI/UX (FRONTEND)
Cập nhật component hiển thị kết quả tạo link `HeroLinkGenerator`.
### A. Logic hiển thị
- Input: `est_commission` (VD: 12255).
- Tính toán Cashback Range:
    - Min (50%): `est_commission * 0.5`
    - Max (80%): `est_commission * 0.8`
- Format tiền tệ: VNĐ (VD: 6.127đ - 9.804đ).

### B. Giao diện (Box Info)
Vị trí: Bên dưới nút "Mở Link" hoặc "Copy Link". Style: Box background màu cam nhạt (Shopee theme) hoặc xanh lá (Cashback theme).

Nội dung text:
"💰 Hoa hồng ước tính: 12.255đ" "🎁 Hoàn tiền cho bạn: 6.100đ - 9.800đ"

Lưu ý: Nếu API trả về 0 hoặc lỗi, ẩn box này đi.
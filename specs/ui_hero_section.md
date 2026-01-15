# UI COMPONENT SPEC: Hero Section & Quick Link Generator

## 1. MỤC TIÊU THIẾT KẾ (DESIGN GOAL)
- **Vị trí:** Nằm ngay màn hình đầu tiên (Above the fold).
- **Trọng tâm:** Ô Input phải là điểm nhấn lớn nhất (Dominant element).
- **Thông điệp:** "Dán link Shopee/TikTok - Nhận hoa hồng ngay lập tức".
- **Đối tượng:** Tối ưu cho cả Khách vãng lai (Guest) chưa đăng nhập.

## 2. QUY TẮC GIAO DIỆN (UI RULES)
- **Container:** Căn giữa màn hình (Centered Layout).
- **Input Component:**
    - **Size:** Lớn (Large). Class Tailwind gợi ý: `h-14` hoặc `h-16`. `text-lg`.
    - **Placeholder:** "Dán link sản phẩm của bạn vào đây (VD: https://shopee.vn/...)"
    - **Icon:** Có icon Search hoặc Link ở bên trái Input để tăng tính trực quan.
    - **Right Element:** Nút "Tạo Link" phải dính liền hoặc nằm ngay cạnh Input.
- **Button (CTA):**
    - Màu sắc: Primary Brand Color (Nổi bật nhất trang).
    - Text: "Tạo Link Ngay" hoặc Icon mũi tên (trên mobile).
    - State: Có Loading Spinner khi đang gọi API.

## 3. TRẢI NGHIỆM NGƯỜI DÙNG (UX FLOW)
1.  **Paste & Go:** Người dùng paste link -> Hệ thống tự validate format URL (Regex).
2.  **Error Feedback:**
    - Nếu link sai format: Hiện dòng text đỏ nhỏ ngay dưới input: "Link không hợp lệ. Chỉ hỗ trợ Shopee/TikTok".
    - Không dùng alert popup gây khó chịu.
3.  **Success State (Kết quả):**
    - Sau khi tạo xong, **KHÔNG reload trang**.
    - Hiển thị **Result Card** ngay bên dưới Input với hiệu ứng Animation (Fade in/Slide down).
    - **Nội dung Result Card:**
        - Link rút gọn (Text to copy).
        - Nút "Copy" (Bấm vào đổi text thành "Copied!" trong 2s).
        - Thumbnail sản phẩm (Box bên trái).
        - Tên sản phẩm (Box bên phải).
        - Giá sản phẩm (Box bên phải).
        - Giá sau khi áp dụng hoa hồng (Box bên phải).
        - Hoa hồng (70%) (Box bên phải).
        - QR Code (Tùy chọn, icon nhỏ gọn bên dưới, bấm vào để mở modal QR Code).
        - Nút "Chia sẻ Facebook/Zalo" nhanh (Nhỏ gọn bên dưới).

## 4. KỸ THUẬT (TECHNICAL IMPLEMENTATION)
- **Component Name:** `HeroLinkGenerator.tsx`.
- **State Management:**
    - Dùng `useState` nội bộ cho giá trị input.
    - Dùng `useLinkStore` (Zustand) để lưu kết quả `generatedLink`.
- **Interaction:**
    - Sự kiện `onKeyDown`: Cho phép bấm Enter để submit.
    - Sự kiện `onPaste`: Tự động trim khoảng trắng thừa.

## 5. MẪU TAILWIND (STYLE GUIDE)
- **Input Wrapper:** `relative flex items-center w-full max-w-2xl mx-auto shadow-lg rounded-full overflow-hidden border-2 border-transparent focus-within:border-primary`
- **Input Field:** `w-full h-14 pl-6 pr-32 outline-none text-lg bg-white`
- **Button:** `absolute right-1 top-1 bottom-1 px-8 rounded-full font-bold transition-transform active:scale-95`
- **QR Code:** `w-12 h-12 cursor-pointer`
- **Share Button:** `w-12 h-12 cursor-pointer`
- **Result Card:** `w-full max-w-2xl mx-auto shadow-lg rounded-lg overflow-hidden border border-gray-200`
- **Result Card Header:** `p-4 flex items-center justify-between`
- **Result Card Body:** `p-4`
- **Result Card Footer:** `p-4 flex items-center justify-between`
- **Copy Button:** `px-4 py-2 rounded-full font-bold transition-transform active:scale-95`

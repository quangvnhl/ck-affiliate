-- DATABASE SCHEMA DESIGN (PostgreSQL - Neon Tech)
-- Updated: Added Banking Info, Withdrawal Requests, and Guest Tracking

-- 1. Bảng Users (Mở rộng thêm thông tin ngân hàng và trạng thái)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE, 
  password_hash VARCHAR,
  
  -- Role Based Access Control
  role VARCHAR(20) DEFAULT 'user', -- 'admin', 'user'
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'banned' (Admin có thể khóa nick)
  
  -- Tài chính
  wallet_balance DECIMAL(15, 2) DEFAULT 0.00, -- Số dư khả dụng hiện tại
  total_withdrawn DECIMAL(15, 2) DEFAULT 0.00, -- Tổng số tiền đã rút thành công (để thống kê)
  
  -- Thông tin thanh toán (User cập nhật để nhận tiền)
  bank_name VARCHAR(100), -- VD: Vietcombank, TPBank
  bank_account_number VARCHAR(50),
  bank_account_holder VARCHAR(100), -- Tên chủ tài khoản (Viết hoa không dấu)
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Bảng Platforms (Cấu hình sàn)
CREATE TABLE platforms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL, -- 'shopee', 'tiktok'
  is_active BOOLEAN DEFAULT TRUE, -- Admin có thể tạm tắt 1 sàn nếu sàn đó bảo trì
  api_config JSONB, -- Lưu Key/Secret/AppID (Mã hóa ở tầng Application)
  base_commission_share DECIMAL(5, 2) DEFAULT 70.00 -- % User nhận được (VD: 70%)
);

-- 3. Bảng Affiliate Links (Thêm guest_session_id)
CREATE TABLE affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  guest_session_id VARCHAR(100),
  
  -- Link sản phẩm gốc do user nhập (VD: shopee.vn/ao-thun...)
  original_url TEXT NOT NULL, 
  
  -- Link Shopee dài đã ghép tracking (VD: https://s.shopee.vn/an_redir?...)
  -- Hệ thống sẽ redirect user tới link này
  tracking_url TEXT NOT NULL, 
  
  -- Mã định danh ngắn (VD: "x9Az1")
  code VARCHAR(10) UNIQUE NOT NULL, 
  
  -- Link hiển thị cuối cùng (VD: https://ckaffiliate.com/x9Az1)
  short_link TEXT NOT NULL,
  
  platform_id INT REFERENCES platforms(id),
  clicks INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES (Thêm index cho code để Redirect nhanh)
CREATE INDEX idx_links_code ON affiliate_links(code);

-- 4. Bảng Transactions (Dòng tiền VÀO - Cashback từ đơn hàng)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  platform_id INT REFERENCES platforms(id),
  
  order_id_external VARCHAR(100), -- Mã đơn hàng từ sàn (VD: 240115ABCXYZ)
  
  order_amount DECIMAL(15, 2), -- Giá trị đơn hàng gốc
  commission_received DECIMAL(15, 2), -- Tổng hoa hồng Sàn trả cho Admin
  cashback_amount DECIMAL(15, 2), -- Tiền User thực nhận (đã nhân %)
  
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' (chờ đối soát), 'approved' (đã cộng ví), 'rejected' (khách hủy đơn)
  rejection_reason TEXT, -- Lý do từ chối (nếu có)
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Bảng Withdrawal Requests (Dòng tiền RA - Yêu cầu rút tiền) -> MỚI HOÀN TOÀN
CREATE TABLE withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  
  amount DECIMAL(15, 2) NOT NULL, -- Số tiền muốn rút
  
  -- Snapshot thông tin ngân hàng TẠI THỜI ĐIỂM RÚT (đề phòng user đổi số tk sau khi lệnh đã tạo)
  bank_snapshot JSONB NOT NULL, 
  
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved' (đã chuyển), 'rejected' (hoàn tiền)
  
  admin_note TEXT, -- Ghi chú của Admin (VD: "Sai tên chủ tài khoản")
  proof_image_url TEXT, -- Link ảnh biên lai chuyển tiền (Admin upload)
  processed_at TIMESTAMP, -- Thời điểm Admin duyệt/từ chối
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES (Tối ưu hiệu năng truy vấn)
CREATE INDEX idx_links_user ON affiliate_links(user_id);
CREATE INDEX idx_links_guest ON affiliate_links(guest_session_id); -- Tìm nhanh link của khách
CREATE INDEX idx_trans_order ON transactions(order_id_external); -- Check trùng đơn hàng nhanh
CREATE INDEX idx_withdraw_status ON withdrawal_requests(status); -- Admin lọc đơn pending nhanh
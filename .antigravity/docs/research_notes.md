# Báo Cáo Nghiên Cứu - CK Affiliate Features

## Tổng Quan

Báo cáo này phân tích các tính năng quản lý đối soát đơn hàng cho CK Affiliate sau khi làm rõ các yêu cầu nghiệp vụ.

---

## 1. Các Yêu Cầu Đã Được Làm Rõ

### 1.1. Toggle Filter "Links có Purchases"

**Quyết định**: Không dùng `buy_count` trong affiliate_links. Thay vào đó tính từ bảng transactions.

- Link "có purchases" = có transaction với `status = 'confirmed'`

### 1.2. Index trên code

**Kết luận**: Không cần - B-tree index đã tồn tại.

### 1.3. Reconciliation - SubId Parse

- Input: `x9Az1----` → split('-')[0] → `x9Az1`
- Chỉ cho phép a-z, A-Z, 0-9

### 1.4. Status Workflow

```
pending → confirmed (hoặc) rejected → paid
```

### 1.5. Dispute

- Tạo bảng disputes: user_id, transaction_id, reason, status, admin_note
- **Admin xử lý disputes**

### 1.6. Commission %

- **Load từ system_settings**, mặc định 70%

### 1.7. Minimum Withdrawal

- **10 điểm** (tương đương 10.000 VND)

### 1.8. Orphaned Transactions

- **Giữ vĩnh viễn** trong hệ thống

### 1.9. Link Status - affiliate_links

- Thêm trường `status`: `open` | `blocked`
- Thêm trường `note`: TEXT (ghi lý do block)
- **/links**: Chỉ hiển thị `status = 'open'`
- **/[code]**: Thêm điều kiện `status = 'open'` - nếu blocked thì KHÔNG redirect

#### Redirect Flow (/[code])

```
/[code] Redirect:
  - status = 'open' → Redirect đến sản phẩm ✅
  - status = 'blocked' → Hiển thị thông báo "Link không hoạt động" ❌
```

---

## 2. Đánh Giá 2 Phương Án Quản Lý Points

### Phương án 1: Lưu point_balance vào bảng users

```typescript
ALTER TABLE users ADD COLUMN point_balance INTEGER DEFAULT 0;
```

| Tiêu chí | Đánh giá |
|---------|---------|
| Query hiển thị | ✅ Nhanh - đọc trực tiếp |
| Đồng bộ | ❌ Cần transaction atomic khi cộng/trừ |
| Rủi ro | ❌ Sai sót có thể dẫn đến âm điểm |
| Migration | ❌ Thay đổi schema users |

### Phương án 2: Tính toán từ transactions

```typescript
const userPoints = await db
  .select({ points: transactions.points })
  .from(transactions)
  .where(and(
    eq(transactions.userId, userId),
    eq(transactions.status, 'confirmed')
  ))
  .then(rows => rows.reduce((sum, r) => sum + (r.points || 0), 0));
```

| Tiêu chí | Đánh giá |
|---------|---------|
| Query hiển thị | ⚠️ Chậm hơn nếu nhiều records |
| Đồng bộ | ✅ Luôn chính xác, không cần sync |
| Rủi ro | ✅ Không thể âm điểm |
| Migration | ✅ Không thay đổi schema |

### Khuyến nghị: Chọn Phương án 2

**Lý do**:
1. **An toàn hơn**: Không thể bị âm điểm do bug logic
2. **Dữ liệu chính xác**: points = tổng từ các transaction confirmed
3. **Không cần migration users**: Giữ nguyên schema hiện tại
4. **Audit trail**: Mỗi point đều có transaction gốc

---

## 3. Logic Trừ Points Khi Rút Tiền (Phương án 2)

### Giải pháp: Tạo withdrawal transaction

Khi user yêu cầu rút tiền:
1. Tạo bản ghi trong bảng transactions với:
   - `type = 'withdrawal'` (phân biệt với commission)
   - `points = -số điểm user yêu cầu`
   - `status = 'pending'`

```sql
ALTER TABLE transactions ADD COLUMN type VARCHAR(20) DEFAULT 'commission';
-- 'commission' = tiền hoa hồng vào
-- 'withdrawal' = tiền rút ra (âm)
```

### Luồng hoàn chỉnh

```
1. Admin đối soát → Tạo transaction (type='commission', points=+350, status='confirmed')
2. User xem points = SUM(points) WHERE user_id=? AND status='confirmed' = 350

3. User yêu cầu rút 100 điểm
   → Tạo transaction (type='withdrawal', points=-100, status='pending')
   
4. User xem points = 350 - 100 = 250 (đang chờ)

5. Admin duyệt rút tiền
   → Cập nhật status='confirmed'
   → User xem points = 350 - 100 = 250 (đã xác nhận)
```

### Kiểm tra đủ điểm

```typescript
async function canWithdraw(userId: string, requestedPoints: number) {
  const currentPoints = await getUserPoints(userId);
  return currentPoints >= requestedPoints;
}
```

---

## 4. Schema Mới

### 4.1. affiliate_links - Thêm status + note

```sql
ALTER TABLE affiliate_links ADD COLUMN status VARCHAR(20) DEFAULT 'open';
ALTER TABLE affiliate_links ADD COLUMN note TEXT;
-- 'open' = link hoạt động
-- 'blocked' = link bị khóa
```

**Query filters**:
- `/links`: Chỉ hiển thị `status = 'open'`
- `/[code]`: Chỉ redirect khi `status = 'open'`

### 4.2. Bảng transactions (mở rộng)

```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  affiliate_link_id INTEGER REFERENCES affiliate_links(id),
  type VARCHAR(20) DEFAULT 'commission',
  order_id_external VARCHAR(100),
  order_amount INTEGER,
  checkout_id VARCHAR(100),
  commission_amount INTEGER,
  cashback_amount INTEGER,
  commission_percent INTEGER DEFAULT 70,
  points INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  rejection_reason TEXT,
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_status ON transactions(user_id, status);
```

### 4.3. Bảng reconciliation_logs

```sql
CREATE TABLE reconciliation_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES users(id),
  transaction_id INTEGER REFERENCES transactions(id),
  action VARCHAR(50),
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.4. Bảng disputes

```sql
CREATE TABLE disputes (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER REFERENCES transactions(id),
  user_id INTEGER REFERENCES users(id),
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.5. Bảng system_settings

```sql
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO system_settings (key, value, description) VALUES
  ('points_exchange_rate', '1000', '1 point = 1000 VND'),
  ('minimum_withdrawal', '10', 'Minimum withdrawal: 10 points'),
  ('default_commission_percent', '70', 'Default commission: 70%');
```

### 4.6. Thay đổi bảng users

```sql
ALTER TABLE users ADD COLUMN bank JSONB;

UPDATE users SET bank = jsonb_build_object(
  'bank_name', bank_name,
  'bank_account_number', bank_account_number,
  'bank_account_holder', bank_account_holder
) WHERE bank_name IS NOT NULL;

-- Sau xác nhận:
-- ALTER TABLE users DROP COLUMN bank_name;
-- ALTER TABLE users DROP COLUMN bank_account_number;
-- ALTER TABLE users DROP COLUMN bank_account_holder;
-- ALTER TABLE users DROP COLUMN wallet_balance;
-- ALTER TABLE users DROP COLUMN total_withdraw;
```

### 4.7. withdrawal_requests - thêm processing

```
Workflow: pending → approved → processing → paid (hoặc rejected)
```

---

## 5. API Cần Tạo

### 5.1. Admin Reconciliation

```
POST /api/admin/reconciliation
Body: { subId, orderId, amount, checkoutId, commissionAmount }
```

### 5.2. Get User Points

```
GET /api/users/me/points
Response: { points: number, pending: number, available: number }
```

### 5.3. Create Withdrawal Request

```
POST /api/withdrawals
Body: { points: number }
```

### 5.4. Get Transactions by Link

```
GET /api/links/[id]/transactions
```

### 5.5. Block/Unblock Link (Admin)

```
POST /api/admin/links/[id]/block
Body: { note: string }
```

---

## 6. Thứ Tự Triển Khai

| Priority | Tính năng |
|----------|-----------|
| 1 | Tạo bảng system_settings |
| 2 | affiliate_links thêm status + note |
| 3 | Mở rộng bảng transactions (thêm type, points) |
| 4 | Admin Reconciliation UI |
| 5 | Dashboard - Xem points + Rút điểm |
| 6 | /links - Chi tiết transaction + Dispute |
| 7 | Merge bank fields |

---

## 7. Orphaned Transactions

- **Giữ vĩnh viễn** trong hệ thống
- Khi subid không khớp với link nào:
  - Tạo transaction với `user_id = NULL`
  - `status = 'orphaned'`
  - Giữ lại để admin có thể query và xử lý thủ công

---

*Báo cáo cập nhật: 28/04/2026*
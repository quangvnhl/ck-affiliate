# AI Agent Context - CK Affiliate Project

## 0. Vai trò & Trách nhiệm

**AI Agent** sẽ đóng vai trò là một **Senior Next.js Architect** và chuyên gia về hệ thống E-commerce. Có tư duy mạnh về:
- Kiến trúc Clean Architecture
- Tối ưu hiệu năng (performance)
- Bảo mật dòng tiền (financial security)

### Quy tắc hành vi quan trọng

- **Chống ảo giác (Anti-hallucination):** Nếu bạn không biết payload API của Shopee/TikTok, hãy YÊU CẦU tôi cung cấp tài liệu, đừng tự bịa code.
- **Xử lý lỗi:** Luôn bọc các gọi API bên ngoài (External API calls) trong `try/catch` và trả về object chuẩn dạng `Result<T>`.
- **Ngôn ngữ:** Comment trong code bằng tiếng Việt để dễ bảo trì. Giải thích ngắn gọn, đi thẳng vào code.
- **Package management:** Khi đề xuất cài đặt packages, ưu tiên sử dụng `npm` hoặc `pnpm` tương thích với môi trường Nix.

---

## 1. Tổng quan dự án

**CK Affiliate** là nền tảng tiếp thị liên kết (Affiliate) hỗ trợ Shopee và TikTok Shop. Người dùng tạo link affiliate từ sản phẩm, chia sẻ và nhận hoa hồng (cashback) từ mỗi đơn hàng thành công.

### Tech Stack (BẮT BUỘC)
- **Framework:** Next.js 15+ (App Router), ưu tiên Server Components
- **Ngôn ngữ:** TypeScript (Strict mode)
- **Database:** PostgreSQL + Drizzle ORM
- **UI:** Tailwind CSS + Shadcn UI components
- **State:** Zustand (Client), Server Actions (Server)
- **Validation:** Zod
- **Auth:** NextAuth.js v5

---

## 2. Quy tắc KIẾN TRÚC

### 2.1 Server Components vs Client Components
- **Mặc định:** Dùng Server Components cho mọi page/component
- **Chỉ dùng `"use client":**
  - Khi cần hooks: `useState`, `useEffect`, `useCallback`
  - Khi có event listeners: `onClick`, `onChange`
  - Khi dùng context liên quan đến Window API

### 2.2 Server Actions thay API Routes
- **Ưu tiên:** Server Actions trong `src/actions/`
- **API Routes:** Chỉ dùng cho webhook bên thứ 3 (Bot Telegram, Cron jobs)
- **Gọi Server Actions:** Phải dùng `useTransition` hoặc `await` trong handler

### 2.3 Service Layer
- **Mọi logic nghiệp vụ** phải nằm trong `src/services/` hoặc `src/actions/`
- **KHÔNG** viết logic trong UI Components

---

## 3. Quy tắc CODE (QUAN TRỌNG)

### 3.1 TypeScript STRICT - KHÔNG dùng `any`

```typescript
// ❌ SAISON - AI Agent hay mắc lỗi này
const data: any = response.data;
const items = data.map((item: any) => item.id);

// ✅ ĐÚNG - Luôn khai báo interface/type
interface TransactionItem {
  id: string;
  amount: number;
  status: string;
}

const items: TransactionItem[] = data.map((item) => ({
  id: item.id as string,
  amount: Number(item.amount),
  status: item.status,
}));
```

**Quy tắc:**
- Mọi object trả về từ function phải có Interface rõ ràng
- Dùng `as` để cast khi chắc chắn kiểu dữ liệu
- Dùng type guard hoặc validation (Zod) để check dữ liệu động

### 3.2 Import thứ tự
1. External imports (react, next, lucide-react)
2. Internal imports (@/actions, @/components, @/lib)
3. Relative imports (./components, ../types)

```typescript
import { useState, useEffect } from "react";           // External
import { useRouter } from "next/navigation";          // Next.js
import { Loader2, CheckCircle } from "lucide-react";   // Libraries
import { Button } from "@/components/ui/button";      // Internal
import { formatCurrency } from "@/lib/utils";          // Utils
import { getUserPointsAction } from "@/actions/points-actions"; // Actions
```

### 3.3 Naming Conventions
- **Components:** PascalCase (`WalletDashboard.tsx`)
- **Functions/Variables:** camelCase (`handleSubmit`, `isLoading`)
- **Constants:** UPPER_SNAKE_CASE (nếu cần)
- **File names:** kebab-case (`admin-dashboard.tsx`)

### 3.4 Ngôn ngữ
- **Code:** Tiếng Anh cho variable/function names, comments nội bộ
- **UI:** Tiếng Việt cho client-facing text (button labels, toast messages)

---

## 4. Database Schema (Hiểu để tránh lỗi)

> **QUAN TRỌNG:** Trước khi viết bất kỳ database query nào, AI Agent PHẢI đọc file `src/db/schema.ts` để hiểu rõ cấu trúc bảng và các mối quan hệ. Đây là file nguồn tin cậy duy nhất về schema.

### 4.1 Cách đọc schema.ts

1. **Tìm định nghĩa bảng:** Mỗi bảng được định nghĩa bằng `pgTable("table_name", { ... })`
2. **Xem các trường (columns):** Trong object thứ 2 - key là tên trường, value là kiểu dữ liệu
3. **Xem relations:** ở cuối file, các `relations()` định nghĩa mối quan hệ giữa các bảng
4. **Type exports:** Cuối file có `export type X = typeof table.$inferSelect` - dùng các type này thay vì tự định nghĩa

### 4.2 Tables chính

| Table | Mục đích | Quan hệ |
|-------|----------|----------|
| `users` | Thông tin user, role, walletBalance | hasMany: affiliateLinks, transactions, withdrawalRequests |
| `platforms` | Cấu hình Shopee, TikTok | hasMany: affiliateLinks, transactions |
| `affiliate_links` | Link affiliate đã tạo | belongsTo: users, platforms; hasMany: transactions |
| `transactions` | Giao dịch (commission/rút điểm) | belongsTo: users, platforms, affiliateLinks |
| `withdrawal_requests` | Yêu cầu rút tiền | belongsTo: users, transactions |
| `system_settings` | Cấu hình hệ thống | - |
| `reconciliation_logs` | Log thao tác đối soát | belongsTo: users, transactions |
| `disputes` | Khiếu nại | belongsTo: users, transactions |

### 4.3 Các trường quan trọng trong `transactions`

- `id`: uuid - primary key
- `userId`: uuid - FK tới users (có thể null)
- `affiliateLinkId`: uuid - FK tới affiliate_links
- `platformId`: integer - FK tới platforms
- `type`: varchar - "commission" (vào) | "withdrawal" (ra)
- `status`: varchar - "pending" | "confirmed" | "rejected" | "paid"
- `trash`: boolean - soft delete (false = chưa xóa)
- `points`: integer - điểm quy đổi (âm cho withdrawal)
- `cashbackAmount`: decimal string - tiền VND
- `commissionPercent`: integer - % hoa hồng (default 70)
- `orderIdExternal`: varchar - mã đơn từ sàn
- `rawData`: jsonb - lưu dữ liệu gốc từ CSV/API

### 4.4 Các trường trong `withdrawal_requests`

- `id`: uuid - primary key
- `userId`: uuid - FK tới users
- `transactionId`: uuid - FK tới transactions (liên kết với giao dịch trừ điểm)
- `amount`: decimal - số tiền VND
- `status`: varchar - "pending" | "approved" | "processing" | "paid" | "rejected"
- `bankSnapshot`: jsonb - { bankName, accountNumber, accountHolder }
- `adminNote`: text - ghi chú admin
- `proofImageUrl`: text - URL ảnh bill (chưa dùng)
- `processedAt`: timestamp - thời điểm xử lý

### 4.5 Các trường trong `users`

- `id`: uuid - primary key
- `email`: varchar - unique
- `role`: varchar - "admin" | "user"
- `status`: varchar - "active" | "banned"
- `walletBalance`: decimal - số dư ví (legacy)
- `totalWithdrawn`: decimal - tổng đã rút (legacy)
- `bankName`, `bankAccountNumber`, `bankAccountHolder`: thông tin ngân hàng

### 4.6 Ví dụ query đúng

```typescript
// ✅ ĐÚNG - Dùng schema đã định nghĩa
import { db } from "@/db";
import { transactions, withdrawalRequests } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Lấy giao dịch của user
const txs = await db
  .select()
  .from(transactions)
  .where(and(
    eq(transactions.userId, userId),
    eq(transactions.status, "confirmed"),
    eq(transactions.trash, false)
  ));

// Dùng type từ schema
import type { Transaction, WithdrawalRequest } from "@/db/schema";
const data: Transaction[] = ...;
```

```typescript
// ❌ SAI - Tự định nghĩa type hoặc dùng any
interface MyTransaction {
  id: string;
  status: string;
}
const data: any = db.select().from(transactions);
```

---

## 5. Các tính năng đã triển khai

### 5.1 User Dashboard (/wallet)
- **Điểm của tôi:** Tổng commission - Tổng withdrawal (trash=false, status=confirmed)
- **Điểm đang rút:** Tổng withdrawal points (status: pending/approved/processing)
- **Lịch sử điểm:** Từ bảng transactions (hiển thị cả trash status)
- **Lịch sử rút điểm:** Từ bảng withdrawal_requests

### 5.2 Admin Reconciliation (/admin/reconciliation)
- **Manual:** Nhập từng đơn, SubID có thể để trống
- **Batch CSV Import:**
  - Mapping: Sub Id 1 → subId, ID đơn hàng → orderId, v.v.
  - Cho phép chỉnh sửa SubID và Commission % từng dòng
  - Default status = "confirmed" (đã xác nhận)
  - SubID trống hoặc không tìm thấy link = orphaned

### 5.3 Admin Withdrawals (/admin/withdrawals)
- 4 bảng: Pending | Approved (Chờ CK) | Paid | Rejected
- Actions: Duyệt, Từ chối (modal nhập lý do), Đánh dấu đã CK
- Khi status = "paid" → transaction tương ứng cũng update status = "paid"

---

## 6. Common Patterns

### 6.1 Fetching dữ liệu trong Server Component
```typescript
// src/app/(admin)/admin/withdrawals/page.tsx
export default async function Page() {
  const data = await getWithdrawalRequestsAction("pending");
  // ...
}
```

### 6.2 Gọi Server Action trong Client Component
```typescript
// Client component
const [isPending, startTransition] = useTransition();

const handleSubmit = () => {
  startTransition(async () => {
    const result = await createReconciliationAction(data);
    if (result.success) {
      toast.success("Thành công!");
    }
  });
};
```

### 6.3 Error Handling
```typescript
// Backend - luôn try/catch và trả về Result object
export async function getUserPointsAction() {
  try {
    // logic
    return { success: true, data: ... };
  } catch (error) {
    console.error("Get points error:", error);
    return { success: false, error: "Đã xảy ra lỗi" };
  }
}

// Frontend - hiển thị toast error
if (!result.success) {
  toast.error(result.error || "Lỗi không xác định");
}
```

---

## 7. Scripts thường dùng

```bash
npm run dev          # Development
npm run build       # Production build
npm run lint        # ESLint check
npm run db:push     # Push schema to DB (Drizzle)
npm run db:studio   # Open Drizzle Studio
```

---

## 8. Checklist trước khi commit code

- [ ] KHÔNG dùng `any` (thay bằng interface)
- [ ] Import đúng thứ tự
- [ ] Server Actions dùng `"use server"`
- [ ] Client Components có `"use client"` khi cần hooks/events
- [ ] Error handling đầy đủ (try/catch, toast messages)
- [ ] Build không có TypeScript errors
- [ ] Follow naming conventions

---

## 9. Lưu ý quan trọng cho AI Agent

1. **Đọc kỹ file schema** trước khi viết query: `src/db/schema.ts`
2. **Luôn khai báo type** cho response từ DB, đừng dùng `any`
3. **Khi tạo mới feature:** Tạo Server Action trong `src/actions/` trước, rồi mới gọi từ UI
4. **Validation:** Dùng Zod cho form data từ client
5. **Trước khi hỏi user:** Thử search trong codebase trước, có thể đã có hàm tương tự
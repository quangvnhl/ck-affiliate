# 🔗 CK Affiliate

<p align="center">
  <strong>Nền tảng tiếp thị liên kết Shopee & TikTok Shop</strong>
</p>

<p align="center">
  <a href="#tính-năng">Tính năng</a> •
  <a href="#công-nghệ">Công nghệ</a> •
  <a href="#cài-đặt">Cài đặt</a> •
  <a href="#sử-dụng">Sử dụng</a> •
  <a href="#cấu-trúc">Cấu trúc</a>
</p>

---

## 📖 Giới thiệu

**CK Affiliate** là nền tảng giúp bạn kiếm tiền từ việc chia sẻ link sản phẩm từ Shopee và TikTok Shop. Tạo link tiếp thị trong vài giây, chia sẻ và nhận **70% hoa hồng** từ mỗi đơn hàng thành công.

### 🎯 Điểm nổi bật

- ✅ **Không cần đăng ký** - Tạo link ngay, đăng ký sau
- ✅ **Hoa hồng cao** - Nhận 70% commission từ các sàn
- ✅ **Đa sàn** - Hỗ trợ Shopee và TikTok Shop
- ✅ **Rút tiền nhanh** - Chuyển khoản trực tiếp về tài khoản

---

## ✨ Tính năng

### Người dùng
- 🔗 Tạo link affiliate từ Shopee/TikTok
- 📊 Dashboard theo dõi link và hoa hồng
- 💰 Ví tiền và yêu cầu rút tiền
- 🏦 Quản lý thông tin ngân hàng
- 📱 Giao diện responsive trên mọi thiết bị

### Admin
- 📈 Bảng điều khiển với KPIs tổng quan
- 👥 Quản lý người dùng (ban/unban, điều chỉnh số dư)
- 💳 Quản lý giao dịch và duyệt rút tiền
- ⚙️ Cấu hình hệ thống và platforms
- 🔗 Thêm link thủ công

---

## 🛠 Công nghệ

| Layer | Công nghệ |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + Shadcn UI |
| **Database** | PostgreSQL + Drizzle ORM |
| **Auth** | NextAuth.js v5 |
| **Validation** | Zod |

---

## 🚀 Cài đặt

### Yêu cầu

- Node.js 18+
- PostgreSQL 15+
- npm / yarn / pnpm

### Các bước

```bash
# 1. Clone repository
git clone https://github.com/your-org/ck-affiliate.git
cd ck-affiliate

# 2. Cài đặt dependencies
npm install

# 3. Tạo file môi trường
cp .env.example .env.local

# 4. Cấu hình database trong .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/ck_affiliate"
AUTH_SECRET="your-secret-key"

# 5. Chạy migration
npm run db:push

# 6. Khởi động development server
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) để xem kết quả.

---

## 📁 Cấu trúc

```
ck-affiliate/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (admin)/        # Admin routes
│   │   ├── (auth)/         # Auth routes
│   │   ├── (dashboard)/    # User dashboard
│   │   └── page.tsx        # Homepage
│   ├── actions/            # Server Actions
│   ├── components/         # React components
│   │   ├── features/       # Feature components
│   │   └── ui/             # Shadcn UI
│   ├── db/                 # Drizzle ORM
│   ├── lib/                # Utilities
│   ├── services/           # Business logic
│   └── types/              # TypeScript types
├── docs/                   # Documentation
├── specs/                  # Specifications
└── drizzle/               # Migrations
```

---

## 🗃 Database Schema

```
┌──────────────────┐       ┌──────────────────┐
│      users       │       │    platforms     │
├──────────────────┤       ├──────────────────┤
│ id               │       │ id               │
│ email            │       │ name             │
│ password         │       │ isActive         │
│ role             │       │ commissionShare  │
│ walletBalance    │       └────────┬─────────┘
│ bankInfo         │                │
└────────┬─────────┘                │
         │                          │
         ▼                          ▼
┌──────────────────────────────────────────────┐
│              affiliate_links                  │
├──────────────────────────────────────────────┤
│ id | userId | platformId | shortLink | clicks│
└──────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐    ┌──────────────────────┐
│   transactions   │    │ withdrawal_requests  │
├──────────────────┤    ├──────────────────────┤
│ cashback records │    │ withdrawal requests  │
└──────────────────┘    └──────────────────────┘
```

---

## 🔧 Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run start      # Start production
npm run lint       # ESLint check
npm run db:push    # Push schema to DB
npm run db:studio  # Open Drizzle Studio
```

---

## 📚 Tài liệu

- [📊 Báo cáo dự án](docs/PROJECT_REPORT.md)
- [🏗 Cấu trúc dự án](docs/project_structure.md)
- [📝 Business Logic](docs/business_logic.md)
- [🗄 Database Schema](docs/database_schema.sql)

---

## 🤝 Đóng góp

1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

---

## 📄 License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

<p align="center">
  Made with ❤️ by CK Affiliate Team
</p>

# PROJECT STRUCTURE CONTEXT

## 1. NGUYÊN TẮC TỔ CHỨC (CORE PRINCIPLES)
- **Root Directory:** Sử dụng thư mục `src/` cho toàn bộ source code (trừ config files).
- **App Router Strategy:** Sử dụng **Route Groups** (tên thư mục nằm trong ngoặc tròn `( )`) để phân chia layout và luồng người dùng rạch ròi.
- **Separation of Concerns:**
    - UI (Giao diện) -> `src/components`
    - Business Logic (Nghiệp vụ) -> `src/services`
    - Data Mutations (Ghi dữ liệu) -> `src/actions` (Server Actions)
    - Global State -> `src/store`

## 2. CÂY THƯ MỤC CHUẨN (DIRECTORY TREE)
AI phải tuân thủ nghiêm ngặt cấu trúc này khi tạo file mới.

```text
├── src/
│   ├── app/
│   │   ├── (auth)/                 # Route Group cho Đăng nhập/Đăng ký
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── layout.tsx          # Layout riêng cho Auth (center screen)
│   │   │
│   │   ├── (dashboard)/            # Route Group cho User đã đăng nhập
│   │   │   ├── dashboard/
│   │   │   ├── wallet/
│   │   │   ├── links/
│   │   │   └── layout.tsx          # Layout có Sidebar + Header
│   │   │
│   │   ├── (admin)/                # Route Group cho Admin (Bảo vệ chặt chẽ)
│   │   │   ├── admin/
│   │   │   │   ├── users/
│   │   │   │   ├── withdrawals/
│   │   │   │   └── dashboard/
│   │   │   └── layout.tsx          # Layout riêng cho Admin
│   │   │
│   │   ├── api/                    # Route Handlers (Chỉ dùng cho Webhooks/Cron)
│   │   │   ├── cron/
│   │   │   └── webhooks/
│   │   │
│   │   ├── globals.css             # Tailwind imports
│   │   ├── layout.tsx              # Root Layout (Providers, Fonts)
│   │   └── page.tsx                # Trang chủ (Landing Page - Public)
│   │
│   ├── actions/                    # SERVER ACTIONS (Giao tiếp DB từ Server Component)
│   │   ├── auth-actions.ts         # Login, Register
│   │   ├── link-actions.ts         # Create Short Link
│   │   └── wallet-actions.ts       # Request Withdrawal
│   │
│   ├── components/
│   │   ├── ui/                     # Atomic Components (Shadcn UI: Button, Input...)
│   │   ├── shared/                 # Các thành phần dùng chung (Navbar, Footer)
│   │   ├── features/               # Các khối chức năng lớn (Business Components)
│   │   │   ├── hero-link-generator.tsx
│   │   │   ├── wallet-card.tsx
│   │   │   └── link-history-table.tsx
│   │   └── providers/              # React Context Providers (QueryClient, Theme)
│   │
│   ├── db/                         # DATABASE CONFIG
│   │   ├── schema.ts               # Drizzle Schema Definitions
│   │   └── index.ts                # DB Connection Export
│   │
│   ├── lib/                        # UTILITIES
│   │   ├── utils.ts                # cn(), formatCurrency()...
│   │   ├── constants.ts            # Các biến cố định (Config)
│   │   └── z-schema.ts             # Zod Schemas dùng chung
│   │
│   ├── services/                   # BUSINESS LOGIC LAYER (Pure Typescript)
│   │   ├── affiliate.service.ts    # Logic gọi API sàn, tạo link
│   │   ├── transaction.service.ts  # Logic tính toán tiền nong
│   │   └── user.service.ts         # Logic quản lý user
│   │
│   ├── store/                      # CLIENT STATE (Zustand)
│   │   ├── use-link-store.ts
│   │   └── use-ui-store.ts
│   │
│   └── types/                      # TYPESCRIPT DEFINITIONS
│       ├── next-auth.d.ts
│       └── index.ts
│
├── public/                         # Static Assets (Images, Icons)
├── drizzle.config.ts               # Config cho Drizzle Kit
├── middleware.ts                   # Next.js Middleware (Auth Guard)
└── ...config files
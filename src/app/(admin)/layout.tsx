import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Receipt,
  Settings,
  LogOut,
  Shield,
  Link2,
  Home,
} from "lucide-react";

import { auth } from "@/auth";
import { AdminMobileSidebar } from "@/components/shared/admin-mobile-sidebar";

// Admin Layout - Dark Mode Theme với Slate Deep Colors
// Middleware đã check quyền admin, nhưng thêm layer bảo vệ ở đây
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Double-check admin role (Layer 2 protection)
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="dark">
      <div className="lg:flex min-h-screen bg-slate-900 text-slate-50">
        {/* Admin Sidebar */}
        <aside className="hidden w-64 flex-shrink-0 border-r border-slate-700 bg-slate-950 lg:flex lg:flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b border-slate-700 px-6">
            <Shield className="h-6 w-6 text-blue-500" />
            <span className="text-lg font-bold">Admin Panel</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            <NavItem href="/" icon={Home}>
              Trang chủ
            </NavItem>
            <NavItem href="/admin/dashboard" icon={LayoutDashboard}>
              Tổng quan
            </NavItem>
            <NavItem href="/admin/withdrawals" icon={Wallet}>
              Duyệt rút tiền
            </NavItem>
            <NavItem href="/admin/users" icon={Users}>
              Người dùng
            </NavItem>
            <NavItem href="/admin/transactions" icon={Receipt}>
              Giao dịch
            </NavItem>
            <NavItem href="/admin/links/create" icon={Link2}>
              Thêm link
            </NavItem>
            <NavItem href="/admin/links" icon={Link2}>
              Quản lý Links
            </NavItem>
            <NavItem href="/admin/reconciliation" icon={Receipt}>
              Đối soát
            </NavItem>
            <NavItem href="/admin/settings" icon={Settings}>
              Cài đặt
            </NavItem>
          </nav>

          {/* User info */}
          <div className="border-t border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-medium">
                {session.user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">
                  {session.user.email}
                </p>
                <p className="text-xs text-slate-400">Administrator</p>
              </div>
            </div>
            <Link
              href="/api/auth/signout"
              className="mt-3 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          {/* Admin Header */}
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm px-4 lg:px-6">
            {/* Mobile menu button */}
            <div className="flex items-center gap-3 lg:hidden">
              <AdminMobileSidebar userEmail={session.user.email || ""} />
              <Shield className="h-5 w-5 text-blue-500" />
              <span className="font-bold">Admin</span>
            </div>

            {/* Breadcrumb / Title */}
            <div className="hidden lg:block">
              <span className="text-sm text-slate-400">
                Quản trị hệ thống CK Affiliate
              </span>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1 text-xs font-medium text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Online
              </span>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-slate-900 p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

// Navigation Item Component
function NavItem({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-50 transition-colors"
    >
      <Icon className="h-5 w-5" />
      {children}
    </Link>
  );
}

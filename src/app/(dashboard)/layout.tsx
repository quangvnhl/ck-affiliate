import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Link2,
  Wallet,
  Settings,
  LogOut,
  Sparkles,
  Shield,
  Home,
} from "lucide-react";

import { auth } from "@/auth";
import { MobileSidebar } from "@/components/shared/mobile-sidebar";

// Layout cho Dashboard (User đã đăng nhập) - Sidebar + Header
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Kiểm tra đăng nhập
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
          <Sparkles className="h-6 w-6 text-amber-600" />
          <span className="text-lg font-bold text-slate-900">CK Affiliate</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          <NavItem href="/" icon={Home}>
            Trang chủ
          </NavItem>
          <NavItem href="/dashboard" icon={LayoutDashboard}>
            Tổng quan
          </NavItem>
          <NavItem href="/links" icon={Link2}>
            Link của tôi
          </NavItem>
          <NavItem href="/wallet" icon={Wallet}>
            Ví tiền
          </NavItem>
          <NavItem href="/settings" icon={Settings}>
            Cài đặt
          </NavItem>
          {session.user.role === "admin" && (
            <div className="border-t border-slate-200 py-2">
              <NavItem href="/admin/dashboard" icon={Shield}>
                Quản trị
              </NavItem>
            </div>
          )}
        </nav>

        {/* User info */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-600 text-sm font-medium text-white">
              {session.user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {session.user.email}
              </p>
              <p className="text-xs text-slate-500">Thành viên</p>
            </div>
          </div>
          <Link
            href="/api/auth/signout"
            className="mt-3 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-sm px-4 lg:px-6">
          {/* Mobile menu button */}
          <div className="flex items-center gap-3 lg:hidden">
            <MobileSidebar userEmail={session.user.email || ""} userRole={session.user.role} />
            <Sparkles className="h-5 w-5 text-amber-600" />
            <span className="font-semibold text-slate-900">CK Affiliate</span>
          </div>

          {/* Desktop breadcrumb */}
          <div className="hidden lg:block">
            <span className="text-sm text-slate-500">
              Xin chào, {session.user.email?.split("@")[0]}!
            </span>
          </div>

          {/* Quick balance */}
          <div className="flex items-center gap-4">
            <Link
              href="/wallet"
              className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <Wallet className="h-4 w-4" />
              <span>Ví tiền</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white px-4 py-4 lg:px-6">
          <p className="text-center text-xs text-slate-500">
            © {new Date().getFullYear()} CK Affiliate. Kiếm tiền từ Shopee & TikTok Affiliate.
          </p>
        </footer>
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
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-amber-50 hover:text-amber-700 transition-colors"
    >
      <Icon className="h-5 w-5" />
      {children}
    </Link>
  );
}

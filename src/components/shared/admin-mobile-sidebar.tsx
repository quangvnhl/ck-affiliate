"use client";

import Link from "next/link";
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
    Menu,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle,
} from "@/components/ui/sheet";

interface AdminMobileSidebarProps {
    userEmail: string;
}

// Component NavItem nội bộ - Dark mode style
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

// Mobile Sidebar cho Admin Dashboard - Dark mode
export function AdminMobileSidebar({ userEmail }: AdminMobileSidebarProps) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-slate-300 hover:bg-slate-800 hover:text-slate-50">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Mở menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent
                side="left"
                className="w-64 p-0 border-slate-700 bg-slate-950 text-slate-50"
            >
                <SheetTitle className="sr-only">Menu quản trị</SheetTitle>

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
                    <NavItem href="/admin/settings" icon={Settings}>
                        Cài đặt
                    </NavItem>
                </nav>

                {/* User info */}
                <div className="border-t border-slate-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-medium">
                            {userEmail?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium">
                                {userEmail}
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
            </SheetContent>
        </Sheet>
    );
}

"use client";

import Link from "next/link";
import {
    LayoutDashboard,
    Link2,
    Wallet,
    Settings,
    LogOut,
    Sparkles,
    Menu,
    Shield,
    Home,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle,
} from "@/components/ui/sheet";

interface MobileSidebarProps {
    userEmail: string;
    userRole?: string;
}

// Component NavItem nội bộ
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

// Mobile Sidebar cho User Dashboard
export function MobileSidebar({ userEmail, userRole }: MobileSidebarProps) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5 text-slate-600" />
                    <span className="sr-only">Mở menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
                <SheetTitle className="sr-only">Menu điều hướng</SheetTitle>

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
                    {userRole === "admin" && (
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
                            {userEmail?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                                {userEmail}
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
            </SheetContent>
        </Sheet>
    );
}

import Link from "next/link";
import {
  DollarSign,
  Wallet,
  Clock,
  MousePointerClick,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  TrendingUp,
} from "lucide-react";

import { formatCurrency } from "@/lib/utils";

// Mock data cho stats
const stats = {
  totalRevenue: 15750000,
  revenueChange: 12.5,
  totalUserBalance: 8250000,
  balanceChange: -3.2,
  pendingWithdrawals: 12,
  todayClicks: 1847,
  clicksChange: 8.7,
};

// Mock data cho recent items
const recentWithdrawals = [
  { id: "wd-001", email: "user1@example.com", amount: 500000, status: "pending" },
  { id: "wd-002", email: "user2@example.com", amount: 1250000, status: "pending" },
  { id: "wd-003", email: "user3@example.com", amount: 750000, status: "approved" },
];

const recentUsers = [
  { id: "u-001", email: "newuser1@example.com", createdAt: "2025-01-15" },
  { id: "u-002", email: "newuser2@example.com", createdAt: "2025-01-14" },
  { id: "u-003", email: "newuser3@example.com", createdAt: "2025-01-14" },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Tổng quan</h1>
        <p className="mt-1 text-sm text-slate-400">
          Thống kê và hoạt động hệ thống CK Affiliate
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Tổng doanh thu"
          value={formatCurrency(stats.totalRevenue)}
          change={stats.revenueChange}
          icon={DollarSign}
          iconColor="text-green-400"
        />
        <KPICard
          title="Số dư ví User"
          value={formatCurrency(stats.totalUserBalance)}
          change={stats.balanceChange}
          icon={Wallet}
          iconColor="text-blue-400"
          subtitle="Nợ phải trả"
        />
        <KPICard
          title="Chờ rút tiền"
          value={stats.pendingWithdrawals.toString()}
          icon={Clock}
          iconColor="text-yellow-400"
          subtitle="yêu cầu"
        />
        <KPICard
          title="Click hôm nay"
          value={stats.todayClicks.toLocaleString()}
          change={stats.clicksChange}
          icon={MousePointerClick}
          iconColor="text-purple-400"
        />
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Withdrawals */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-50">Yêu cầu rút tiền mới</h2>
            <Link
              href="/admin/withdrawals"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Xem tất cả →
            </Link>
          </div>
          <div className="space-y-3">
            {recentWithdrawals.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-50">{item.email}</p>
                  <p className="text-xs text-slate-400">{item.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-50">
                    {formatCurrency(item.amount)}
                  </p>
                  <StatusBadge status={item.status as "pending" | "approved"} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Users */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-50">User mới đăng ký</h2>
            <Link
              href="/admin/users"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Xem tất cả →
            </Link>
          </div>
          <div className="space-y-3">
            {recentUsers.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                    {item.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-50">{item.email}</p>
                    <p className="text-xs text-slate-400">{item.createdAt}</p>
                  </div>
                </div>
                <Users className="h-4 w-4 text-slate-400" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <h2 className="font-semibold text-slate-50 mb-4">Hành động nhanh</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/withdrawals"
            className="inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 transition-colors"
          >
            <Clock className="h-4 w-4" />
            Duyệt rút tiền ({stats.pendingWithdrawals})
          </Link>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Users className="h-4 w-4" />
            Quản lý User
          </Link>
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            <TrendingUp className="h-4 w-4" />
            Cấu hình hệ thống
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================
// KPI CARD COMPONENT
// ============================================

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  subtitle?: string;
}

function KPICard({ title, value, change, icon: Icon, iconColor, subtitle }: KPICardProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{title}</span>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold text-slate-50">{value}</span>
        {subtitle && (
          <span className="ml-1 text-sm text-slate-400">{subtitle}</span>
        )}
      </div>
      {change !== undefined && (
        <div className="mt-2 flex items-center gap-1">
          {change >= 0 ? (
            <ArrowUpRight className="h-4 w-4 text-green-400" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-400" />
          )}
          <span
            className={`text-sm ${
              change >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {Math.abs(change)}%
          </span>
          <span className="text-xs text-slate-500">vs tuần trước</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// STATUS BADGE COMPONENT
// ============================================

function StatusBadge({ status }: { status: "pending" | "approved" }) {
  const styles = {
    pending: "bg-yellow-500/20 text-yellow-400",
    approved: "bg-green-500/20 text-green-400",
  };

  const labels = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

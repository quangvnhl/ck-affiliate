"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Wallet,
  Loader2,
  Search,
  MoreHorizontal,
  Ban,
  CheckCircle,
  DollarSign,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAdminUsersAction,
  getAdminUserStatsAction,
  toggleUserStatusAction,
  adjustUserBalanceAction,
  type AdminUserItem,
  type AdminStats,
} from "@/actions/admin-user-actions";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustUserId, setAdjustUserId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const [usersResult, statsResult] = await Promise.all([
      getAdminUsersAction(),
      getAdminUserStatsAction(),
    ]);

    if (usersResult.success && usersResult.data) {
      setUsers(usersResult.data);
    }
    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (userId: string) => {
    const result = await toggleUserStatusAction(userId);
    if (result.success) {
      loadData();
    }
    setActionUserId(null);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Quản lý người dùng</h1>
        <p className="mt-1 text-sm text-slate-400">
          Xem, khóa/mở khóa và quản lý tài khoản người dùng
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Tổng người dùng"
          value={stats?.totalUsers || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Đang hoạt động"
          value={stats?.activeUsers || 0}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          label="Đã bị khóa"
          value={stats?.bannedUsers || 0}
          icon={UserX}
          color="red"
        />
        <StatCard
          label="Tổng số dư ví"
          value={formatCurrency(stats?.totalWalletBalance || 0)}
          icon={Wallet}
          color="amber"
          isText
        />
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Tìm theo email hoặc ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-slate-50 placeholder:text-slate-500"
          />
        </div>
        <span className="text-sm text-slate-400">
          {filteredUsers.length} người dùng
        </span>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/30 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Số dư ví
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Links
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Ngày tạo
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-50">{user.email}</p>
                      <p className="text-xs text-slate-500">{user.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={user.status} />
                </td>
                <td className="px-4 py-3 text-slate-50">
                  {formatCurrency(Number(user.walletBalance))}
                </td>
                <td className="px-4 py-3 text-slate-400">{user.linksCount}</td>
                <td className="px-4 py-3 text-sm text-slate-400">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="relative">
                    <button
                      onClick={() => setActionUserId(actionUserId === user.id ? null : user.id)}
                      className="rounded-lg p-2 hover:bg-slate-700"
                    >
                      <MoreHorizontal className="h-4 w-4 text-slate-400" />
                    </button>

                    {/* Action Dropdown */}
                    {actionUserId === user.id && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-slate-700 bg-slate-800 shadow-lg">
                        <button
                          onClick={() => handleToggleStatus(user.id)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                        >
                          {user.status === "active" ? (
                            <>
                              <Ban className="h-4 w-4 text-red-400" />
                              Khóa tài khoản
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-400" />
                              Mở khóa
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setAdjustUserId(user.id);
                            setShowAdjustModal(true);
                            setActionUserId(null);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                        >
                          <DollarSign className="h-4 w-4 text-amber-400" />
                          Điều chỉnh số dư
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-600" />
            <p className="mt-4 text-slate-400">Không tìm thấy người dùng</p>
          </div>
        )}
      </div>

      {/* Adjust Balance Modal */}
      {showAdjustModal && adjustUserId && (
        <AdjustBalanceModal
          userId={adjustUserId}
          onClose={() => {
            setShowAdjustModal(false);
            setAdjustUserId(null);
          }}
          onSuccess={() => {
            setShowAdjustModal(false);
            setAdjustUserId(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// ============================================
// COMPONENTS
// ============================================

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  isText = false,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "green" | "red" | "amber";
  isText?: boolean;
}) {
  const colors = {
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    green: "bg-green-500/20 text-green-400 border-green-500/30",
    red: "bg-red-500/20 text-red-400 border-red-500/30",
    amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5" />
        <p className="text-sm opacity-80">{label}</p>
      </div>
      <p className={`mt-2 ${isText ? "text-xl" : "text-2xl"} font-bold`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isActive
          ? "bg-green-500/20 text-green-400"
          : "bg-red-500/20 text-red-400"
        }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-green-400" : "bg-red-400"}`} />
      {isActive ? "Active" : "Banned"}
    </span>
  );
}

function AdjustBalanceModal({
  userId,
  onClose,
  onSuccess,
}: {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      setError("Số tiền không hợp lệ");
      setIsSubmitting(false);
      return;
    }

    const result = await adjustUserBalanceAction(userId, numAmount, reason);

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "Đã xảy ra lỗi");
      return;
    }

    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-slate-800 p-6 shadow-xl border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-50">Điều chỉnh số dư</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-700">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-400 border border-red-500/30">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Số tiền</label>
            <Input
              type="number"
              placeholder="VD: 50000 (cộng) hoặc -50000 (trừ)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-slate-900 border-slate-700 text-slate-50"
              required
            />
            <p className="text-xs text-slate-500">
              Số dương = cộng tiền, số âm = trừ tiền
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Lý do</label>
            <Input
              type="text"
              placeholder="VD: Thưởng event, hoàn tiền lỗi..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-slate-900 border-slate-700 text-slate-50"
              required
              minLength={5}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-700"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

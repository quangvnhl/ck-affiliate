import { Wallet, Clock, CheckCircle, XCircle, BanknoteIcon } from "lucide-react";
import { WithdrawalsTable } from "./withdrawals-table";
import { getWithdrawalRequestsAction } from "@/actions/admin-actions";

export const dynamic = "force-dynamic";

export default async function AdminWithdrawalsPage() {
  // Fetch data
  const [pendingRes, approvedRes, paidRes, rejectedRes] = await Promise.all([
    getWithdrawalRequestsAction("pending"),
    getWithdrawalRequestsAction("approved"), // Also handles processing if needed, but we'll fetch approved
    getWithdrawalRequestsAction("paid"),
    getWithdrawalRequestsAction("rejected"),
  ]);

  const pendingWithdrawals = pendingRes.success ? pendingRes.data || [] : [];
  const approvedWithdrawals = approvedRes.success ? approvedRes.data || [] : [];
  const paidWithdrawals = paidRes.success ? paidRes.data || [] : [];
  const rejectedWithdrawals = rejectedRes.success ? rejectedRes.data || [] : [];

  // Thống kê nhanh
  const pendingCount = pendingWithdrawals.length;
  const totalPendingAmount = pendingWithdrawals.reduce((sum, w) => sum + parseInt(String(w.amount)), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Duyệt rút tiền</h1>
          <p className="mt-1 text-sm text-slate-400">
            Xem và xử lý các yêu cầu rút tiền từ người dùng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-blue-400" />
          <span className="text-sm text-slate-400">
            {pendingCount} đang chờ | {new Intl.NumberFormat("vi-VN").format(totalPendingAmount)}đ
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Đang chờ duyệt"
          value={pendingCount}
          color="yellow"
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="Đã duyệt (Chờ CK)"
          value={approvedWithdrawals.length}
          color="blue"
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <StatCard
          label="Đã thanh toán"
          value={paidWithdrawals.length}
          color="green"
          icon={<BanknoteIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Đã từ chối"
          value={rejectedWithdrawals.length}
          color="red"
          icon={<XCircle className="h-4 w-4" />}
        />
      </div>

      {/* Tables Section */}
      <div className="space-y-8">
        
        {/* Table 1: Pending */}
        <section>
          <h2 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5" /> 
            1. Đang chờ duyệt ({pendingWithdrawals.length})
          </h2>
          <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
            {pendingWithdrawals.length > 0 ? (
              <WithdrawalsTable data={pendingWithdrawals} tableType="pending" />
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Không có yêu cầu chờ duyệt</p>
            )}
          </div>
        </section>

        {/* Table 2: Approved / Processing */}
        <section>
          <h2 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" /> 
            2. Đã duyệt - Chờ thanh toán ({approvedWithdrawals.length})
          </h2>
          <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
            {approvedWithdrawals.length > 0 ? (
              <WithdrawalsTable data={approvedWithdrawals} tableType="approved" />
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Không có yêu cầu chờ thanh toán</p>
            )}
          </div>
        </section>

        {/* Table 3: Paid */}
        <section>
          <h2 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
            <BanknoteIcon className="h-5 w-5" /> 
            3. Đã thanh toán ({paidWithdrawals.length})
          </h2>
          <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
            {paidWithdrawals.length > 0 ? (
              <WithdrawalsTable data={paidWithdrawals} tableType="paid" />
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Chưa có giao dịch đã thanh toán</p>
            )}
          </div>
        </section>

        {/* Table 4: Rejected */}
        <section>
          <h2 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
            <XCircle className="h-5 w-5" /> 
            4. Đã từ chối ({rejectedWithdrawals.length})
          </h2>
          <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
            {rejectedWithdrawals.length > 0 ? (
              <WithdrawalsTable data={rejectedWithdrawals} tableType="rejected" />
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Không có giao dịch bị từ chối</p>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: "yellow" | "green" | "red" | "blue";
  icon: React.ReactNode;
}) {
  const colorClasses = {
    yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    green: "bg-green-500/20 text-green-400 border-green-500/30",
    red: "bg-red-500/20 text-red-400 border-red-500/30",
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 text-sm opacity-80">
        {icon}
        <p>{label}</p>
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

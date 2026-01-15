import { Wallet } from "lucide-react";
import { WithdrawalsTable } from "./withdrawals-table";

// Mock data cho withdrawal requests
const mockWithdrawals = [
  {
    id: "wd-001",
    userEmail: "user1@example.com",
    userId: "u-001",
    amount: "500000",
    bankSnapshot: {
      bankName: "Vietcombank",
      accountNumber: "1234567890",
      accountHolder: "NGUYEN VAN A",
    },
    status: "pending" as const,
    createdAt: new Date("2025-01-14T10:30:00"),
    processedAt: null,
    adminNote: null,
  },
  {
    id: "wd-002",
    userEmail: "user2@example.com",
    userId: "u-002",
    amount: "1250000",
    bankSnapshot: {
      bankName: "TPBank",
      accountNumber: "0987654321",
      accountHolder: "TRAN THI B",
    },
    status: "pending" as const,
    createdAt: new Date("2025-01-14T09:15:00"),
    processedAt: null,
    adminNote: null,
  },
  {
    id: "wd-003",
    userEmail: "user3@example.com",
    userId: "u-003",
    amount: "750000",
    bankSnapshot: {
      bankName: "Techcombank",
      accountNumber: "1122334455",
      accountHolder: "LE VAN C",
    },
    status: "approved" as const,
    createdAt: new Date("2025-01-13T14:20:00"),
    processedAt: new Date("2025-01-13T16:45:00"),
    adminNote: "Approved by admin@ck-affiliate.com",
  },
  {
    id: "wd-004",
    userEmail: "user4@example.com",
    userId: "u-004",
    amount: "200000",
    bankSnapshot: {
      bankName: "MB Bank",
      accountNumber: "5566778899",
      accountHolder: "PHAM THI D",
    },
    status: "rejected" as const,
    createdAt: new Date("2025-01-12T11:00:00"),
    processedAt: new Date("2025-01-12T15:30:00"),
    adminNote: "Rejected: Sai tên chủ tài khoản",
  },
  {
    id: "wd-005",
    userEmail: "user5@example.com",
    userId: "u-005",
    amount: "3000000",
    bankSnapshot: {
      bankName: "ACB",
      accountNumber: "9988776655",
      accountHolder: "HOANG VAN E",
    },
    status: "pending" as const,
    createdAt: new Date("2025-01-15T08:00:00"),
    processedAt: null,
    adminNote: null,
  },
];

export default function AdminWithdrawalsPage() {
  // Thống kê nhanh
  const pendingCount = mockWithdrawals.filter(w => w.status === "pending").length;
  const totalPendingAmount = mockWithdrawals
    .filter(w => w.status === "pending")
    .reduce((sum, w) => sum + parseInt(w.amount), 0);

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Đang chờ duyệt"
          value={pendingCount}
          color="yellow"
        />
        <StatCard
          label="Đã duyệt hôm nay"
          value={1}
          color="green"
        />
        <StatCard
          label="Đã từ chối"
          value={1}
          color="red"
        />
      </div>

      {/* Data Table */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
        <WithdrawalsTable data={mockWithdrawals} />
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "yellow" | "green" | "red";
}) {
  const colorClasses = {
    yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    green: "bg-green-500/20 text-green-400 border-green-500/30",
    red: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

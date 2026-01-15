"use client";

import { useState, useTransition } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Check, X, MoreHorizontal, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { approveWithdrawalAction, rejectWithdrawalAction } from "@/actions/admin-actions";
import { formatCurrency } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface BankSnapshot {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

interface WithdrawalRequest {
  id: string;
  userEmail: string | null;
  userId: string | null;
  amount: string;
  bankSnapshot: BankSnapshot;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  processedAt: Date | null;
  adminNote: string | null;
}

// ============================================
// TABLE COLUMNS
// ============================================

function getColumns(
  onApprove: (id: string) => void,
  onReject: (id: string) => void,
  isPending: boolean
): ColumnDef<WithdrawalRequest>[] {
  return [
    {
      accessorKey: "userEmail",
      header: "User",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-50">
            {row.original.userEmail || "N/A"}
          </p>
          <p className="text-xs text-slate-400">
            ID: {row.original.userId?.slice(0, 8)}...
          </p>
        </div>
      ),
    },
    {
      accessorKey: "bankSnapshot",
      header: "Bank Info",
      cell: ({ row }) => {
        const bank = row.original.bankSnapshot;
        return (
          <div className="text-sm">
            <p className="font-medium text-slate-50">{bank.bankName}</p>
            <p className="text-slate-400">{bank.accountNumber}</p>
            <p className="text-xs text-slate-500">{bank.accountHolder}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Số tiền",
      cell: ({ row }) => (
        <p className="font-semibold text-slate-50">
          {formatCurrency(parseInt(row.original.amount))}
        </p>
      ),
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) => {
        const status = row.original.status;
        return <StatusBadge status={status} />;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Ngày tạo",
      cell: ({ row }) => (
        <p className="text-sm text-slate-400">
          {new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(row.original.createdAt)}
        </p>
      ),
    },
    {
      id: "actions",
      header: "Hành động",
      cell: ({ row }) => {
        const withdrawal = row.original;
        
        if (withdrawal.status !== "pending") {
          return (
            <span className="text-xs text-slate-500">
              {withdrawal.status === "approved" ? "Đã duyệt" : "Đã từ chối"}
            </span>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onApprove(withdrawal.id)}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-4 w-4 mr-1" />
              Duyệt
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(withdrawal.id)}
              disabled={isPending}
              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
            >
              <X className="h-4 w-4 mr-1" />
              Từ chối
            </Button>
          </div>
        );
      },
    },
  ];
}

// ============================================
// STATUS BADGE COMPONENT
// ============================================

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const styles = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    approved: "bg-green-500/20 text-green-400 border-green-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const icons = {
    pending: Clock,
    approved: CheckCircle,
    rejected: XCircle,
  };

  const labels = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    rejected: "Đã từ chối",
  };

  const Icon = icons[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${styles[status]}`}
    >
      <Icon className="h-3 w-3" />
      {labels[status]}
    </span>
  );
}

// ============================================
// MAIN TABLE COMPONENT
// ============================================

interface WithdrawalsTableProps {
  data: WithdrawalRequest[];
}

export function WithdrawalsTable({ data }: WithdrawalsTableProps) {
  const [isPending, startTransition] = useTransition();
  const [tableData, setTableData] = useState(data);

  const handleApprove = (id: string) => {
    startTransition(async () => {
      try {
        const result = await approveWithdrawalAction(id);
        
        if (result.success) {
          toast.success("Đã duyệt yêu cầu rút tiền!");
          // Update local state
          setTableData((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, status: "approved" as const } : item
            )
          );
        } else {
          toast.error(result.error || "Không thể duyệt yêu cầu");
        }
      } catch (error) {
        toast.error("Đã xảy ra lỗi");
      }
    });
  };

  const handleReject = (id: string) => {
    // Trong production: Mở modal để nhập lý do
    const reason = "Sai thông tin ngân hàng"; // Mock reason
    
    startTransition(async () => {
      try {
        const result = await rejectWithdrawalAction(id, reason);
        
        if (result.success) {
          toast.success("Đã từ chối và hoàn tiền!");
          // Update local state
          setTableData((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, status: "rejected" as const } : item
            )
          );
        } else {
          toast.error(result.error || "Không thể từ chối yêu cầu");
        }
      } catch (error) {
        toast.error("Đã xảy ra lỗi");
      }
    });
  };

  const columns = getColumns(handleApprove, handleReject, isPending);

  return (
    <DataTable
      columns={columns}
      data={tableData}
      searchKey="userEmail"
    />
  );
}

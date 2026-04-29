"use client";

import { useState, useTransition } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Check, X, Clock, CheckCircle, XCircle, BanknoteIcon, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { approveWithdrawalAction, rejectWithdrawalAction, markWithdrawalPaidAction } from "@/actions/admin-actions";
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
  bankSnapshot: BankSnapshot | any;
  status: string;
  createdAt: Date;
  processedAt: Date | null;
  adminNote: string | null;
  proofImageUrl: string | null;
}

// ============================================
// STATUS BADGE COMPONENT
// ============================================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    approved: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    paid: "bg-green-500/20 text-green-400 border-green-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const icons: Record<string, any> = {
    pending: Clock,
    approved: CheckCircle,
    processing: CheckCircle,
    paid: BanknoteIcon,
    rejected: XCircle,
  };

  const labels: Record<string, string> = {
    pending: "Chờ duyệt",
    approved: "Chờ CK",
    processing: "Chờ CK",
    paid: "Đã CK",
    rejected: "Từ chối",
  };

  const Icon = icons[status] || Clock;
  const label = labels[status] || status;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${styles[status] || styles.pending}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ============================================
// MAIN TABLE COMPONENT
// ============================================

interface WithdrawalsTableProps {
  data: any[];
  tableType: "pending" | "approved" | "paid" | "rejected";
}

export function WithdrawalsTable({ data, tableType }: WithdrawalsTableProps) {
  const [isPending, startTransition] = useTransition();
  const [tableData, setTableData] = useState<WithdrawalRequest[]>(data);

  // Modals state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [paidModalOpen, setPaidModalOpen] = useState(false);
  const [paidId, setPaidId] = useState<string | null>(null);
  const [paidNote, setPaidNote] = useState("");

  // ============================================
  // HANDLERS
  // ============================================

  const handleApprove = (id: string) => {
    startTransition(async () => {
      try {
        const result = await approveWithdrawalAction(id);
        
        if (result.success) {
          toast.success("Đã duyệt yêu cầu rút tiền!");
          setTableData((prev) => prev.filter((item) => item.id !== id));
        } else {
          toast.error(result.error || "Không thể duyệt yêu cầu");
        }
      } catch (error) {
        toast.error("Đã xảy ra lỗi");
      }
    });
  };

  const submitReject = () => {
    if (!rejectId || !rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    
    startTransition(async () => {
      try {
        const result = await rejectWithdrawalAction(rejectId, rejectReason);
        if (result.success) {
          toast.success("Đã từ chối và hoàn tiền!");
          setTableData((prev) => prev.filter((item) => item.id !== rejectId));
          setRejectModalOpen(false);
          setRejectReason("");
          setRejectId(null);
        } else {
          toast.error(result.error || "Không thể từ chối yêu cầu");
        }
      } catch (error) {
        toast.error("Đã xảy ra lỗi");
      }
    });
  };

  const submitPaid = () => {
    if (!paidId) return;

    startTransition(async () => {
      try {
        // Here we could also pass a proofImageUrl if we implemented upload
        const result = await markWithdrawalPaidAction(paidId, undefined, paidNote);
        if (result.success) {
          toast.success("Đã cập nhật trạng thái thanh toán!");
          setTableData((prev) => prev.filter((item) => item.id !== paidId));
          setPaidModalOpen(false);
          setPaidNote("");
          setPaidId(null);
        } else {
          toast.error(result.error || "Lỗi cập nhật");
        }
      } catch (error) {
        toast.error("Đã xảy ra lỗi");
      }
    });
  };

  // ============================================
  // COLUMNS DEFINITION
  // ============================================

  const columns: ColumnDef<WithdrawalRequest>[] = [
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
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
          }).format(new Date(row.original.createdAt))}
        </p>
      ),
    },
  ];

  // Add Action column based on tableType
  if (tableType === "pending") {
    columns.push({
      id: "actions",
      header: "Hành động",
      cell: ({ row }) => {
        const id = row.original.id;
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleApprove(id)}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Check className="h-4 w-4 mr-1" />
              Duyệt
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setRejectId(id);
                setRejectModalOpen(true);
              }}
              disabled={isPending}
              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
            >
              <X className="h-4 w-4 mr-1" />
              Từ chối
            </Button>
          </div>
        );
      },
    });
  } else if (tableType === "approved") {
    columns.push({
      id: "actions",
      header: "Hành động",
      cell: ({ row }) => {
        const id = row.original.id;
        return (
          <Button
            size="sm"
            onClick={() => {
              setPaidId(id);
              setPaidModalOpen(true);
            }}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <BanknoteIcon className="h-4 w-4 mr-1" />
            Cập nhật đã CK
          </Button>
        );
      },
    });
  } else if (tableType === "rejected" || tableType === "paid") {
    columns.push({
      id: "note",
      header: "Ghi chú Admin",
      cell: ({ row }) => (
        <p className="text-xs text-slate-400 max-w-[200px] truncate" title={row.original.adminNote || ""}>
          {row.original.adminNote || "-"}
        </p>
      ),
    });
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={tableData}
        searchKey="userEmail"
      />

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu rút tiền</DialogTitle>
            <DialogDescription className="text-slate-400">
              Nhập lý do từ chối. Hệ thống sẽ tự động hoàn lại điểm cho người dùng.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="VD: Sai thông tin tài khoản ngân hàng"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)} className="border-slate-700 text-slate-300">
              Hủy
            </Button>
            <Button variant="destructive" onClick={submitReject} disabled={isPending || !rejectReason.trim()}>
              Từ chối & Hoàn tiền
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paid Modal */}
      <Dialog open={paidModalOpen} onOpenChange={setPaidModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Cập nhật đã thanh toán</DialogTitle>
            <DialogDescription className="text-slate-400">
              Xác nhận đã chuyển khoản thành công. (Tính năng upload ảnh bill sẽ được bổ sung sau)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Ghi chú (Tùy chọn)</label>
              <Input
                value={paidNote}
                onChange={(e) => setPaidNote(e.target.value)}
                placeholder="VD: CK qua MB Bank"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="flex items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 bg-slate-800/50">
              <div className="text-center">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Upload Bill (Sắp ra mắt)</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidModalOpen(false)} className="border-slate-700 text-slate-300">
              Hủy
            </Button>
            <Button onClick={submitPaid} disabled={isPending} className="bg-green-600 hover:bg-green-700 text-white">
              Xác nhận đã CK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

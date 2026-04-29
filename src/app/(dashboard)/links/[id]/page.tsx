"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, DollarSign, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLinkTransactionsAction } from "@/actions/link-actions";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function LinkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const linkId = params.id as string;

  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  useEffect(() => {
    if (linkId) {
      loadData();
    }
  }, [linkId]);

  const loadData = async () => {
    setIsLoading(true);
    const result = await getLinkTransactionsAction(linkId);
    if (result.success && result.data) {
      setTransactions(result.data.transactions);
      setTotalPoints(result.data.totalPoints);
    }
    setIsLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-400",
      confirmed: "bg-green-500/20 text-green-400",
      rejected: "bg-red-500/20 text-red-400",
      paid: "bg-blue-500/20 text-blue-400",
      orphaned: "bg-red-500/20 text-red-400",
    };
    const labels: Record<string, string> = {
      pending: "Chờ xử lý",
      confirmed: "Đã xác nhận",
      rejected: "Từ chối",
      paid: "Đã thanh toán",
      orphaned: "Orphaned",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const handleDispute = async () => {
    if (!disputeReason) return;
    setDisputeSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setDisputeSubmitting(false);
    setDisputeReason("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/links")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Chi tiết link</h1>
            <p className="mt-1 text-sm text-slate-600 font-mono">{linkId.slice(0, 8)}...</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">Tổng điểm</p>
          <p className="text-2xl font-bold text-blue-600">{totalPoints} điểm</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="font-semibold text-slate-900">Lịch sử đối soát</h3>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-600">Chưa có giao dịch nào</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tx.type === "commission" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {tx.type === "commission" ? "Hoa hồng" : "Rút tiền"}
                    </span>
                    {getStatusBadge(tx.status)}
                  </div>
                  {tx.orderIdExternal && (
                    <p className="mt-1 text-sm text-slate-600">Order: {tx.orderIdExternal}</p>
                  )}
                  <p className="text-xs text-slate-400">{formatDate(tx.createdAt)}</p>
                </div>
                <div className="text-right">
                  {tx.cashbackAmount && (
                    <p className="font-semibold text-green-600">+{formatCurrency(parseInt(tx.cashbackAmount))}</p>
                  )}
                  {tx.points && (
                    <p className="text-sm text-blue-600">+{tx.points} điểm</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dispute */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900 mb-4">
          <MessageCircle className="h-5 w-5" />
          <h3 className="font-semibold">Khiếu nại</h3>
        </div>
        <div className="space-y-2">
          <Input
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Nhập lý do khiếu nại..."
            className="border-slate-300"
          />
          <Button
            onClick={handleDispute}
            disabled={!disputeReason || disputeSubmitting}
            className="w-full"
          >
            {disputeSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gửi khiếu nại"}
          </Button>
        </div>
      </div>
    </div>
  );
}
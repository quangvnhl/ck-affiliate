"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Wallet,
    Clock,
    CheckCircle,
    ArrowDownCircle,
    ArrowUpCircle,
    Loader2,
    AlertCircle,
    X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    getWalletStats,
    getTransactionHistory,
    requestWithdrawalAction,
    type WalletStats,
    type TransactionItem,
} from "@/actions/wallet-actions";

// Format tiền VNĐ
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
}

// Format ngày
function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

// Status badge
function StatusBadge({ status }: { status: string }) {
    const styles = {
        pending: "bg-yellow-100 text-yellow-700",
        approved: "bg-green-100 text-green-700",
        rejected: "bg-red-100 text-red-700",
    };

    const labels = {
        pending: "Chờ duyệt",
        approved: "Hoàn thành",
        rejected: "Từ chối",
    };

    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending
                }`}
        >
            {labels[status as keyof typeof labels] || status}
        </span>
    );
}

// Modal rút tiền
function WithdrawModal({
    isOpen,
    onClose,
    balance,
    onSuccess,
}: {
    isOpen: boolean;
    onClose: () => void;
    balance: number;
    onSuccess: () => void;
}) {
    const [amount, setAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append("amount", amount);

        const result = await requestWithdrawalAction(formData);

        setIsSubmitting(false);

        if (!result.success) {
            setError(result.error || "Đã xảy ra lỗi");
            return;
        }

        onSuccess();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Rút tiền</h3>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 hover:bg-slate-100"
                    >
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <div className="rounded-lg bg-slate-50 p-4">
                        <p className="text-sm text-slate-600">Số dư khả dụng</p>
                        <p className="text-2xl font-bold text-slate-900">
                            {formatCurrency(balance)}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            Số tiền muốn rút
                        </label>
                        <Input
                            type="number"
                            placeholder="Nhập số tiền (tối thiểu 50,000 ₫)"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min={50000}
                            max={balance}
                            required
                        />
                        <p className="text-xs text-slate-500">
                            Tối thiểu: 50,000 ₫ | Tối đa: {formatCurrency(balance)}
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={isSubmitting || !amount}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                "Xác nhận rút tiền"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Main Wallet Dashboard Component
export function WalletDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<WalletStats | null>(null);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadData = async () => {
        setIsLoading(true);

        const [statsResult, txResult] = await Promise.all([
            getWalletStats(),
            getTransactionHistory(),
        ]);

        if (statsResult.success && statsResult.data) {
            setStats(statsResult.data);
        }

        if (txResult.success && txResult.data) {
            setTransactions(txResult.data);
        }

        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleWithdrawSuccess = () => {
        loadData(); // Refresh data
        router.refresh();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
        );
    }

    const canWithdraw = (stats?.walletBalance || 0) >= 50000;

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Số dư khả dụng */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                            <Wallet className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Số dư khả dụng</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(stats?.walletBalance || 0)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Đang chờ duyệt */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                            <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Đang chờ duyệt</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(stats?.pendingWithdrawal || 0)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tổng đã rút */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Tổng đã rút</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(stats?.totalWithdrawn || 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Withdraw Button */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                    <h3 className="font-semibold text-slate-900">Rút tiền về tài khoản</h3>
                    <p className="text-sm text-slate-600">
                        {canWithdraw
                            ? "Bạn có thể rút tiền về tài khoản ngân hàng đã đăng ký"
                            : "Số dư tối thiểu để rút tiền là 50,000 ₫"}
                    </p>
                </div>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    disabled={!canWithdraw}
                    size="lg"
                >
                    Rút tiền
                </Button>
            </div>

            {/* Transaction History */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h3 className="font-semibold text-slate-900">Lịch sử giao dịch</h3>
                </div>

                {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Wallet className="h-12 w-12 text-slate-300" />
                        <p className="mt-3 text-slate-600">Chưa có giao dịch nào</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {transactions.map((tx) => (
                            <div
                                key={tx.id}
                                className="flex items-center justify-between px-5 py-4"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${tx.type === "cashback"
                                                ? "bg-green-100"
                                                : "bg-red-100"
                                            }`}
                                    >
                                        {tx.type === "cashback" ? (
                                            <ArrowDownCircle className="h-5 w-5 text-green-600" />
                                        ) : (
                                            <ArrowUpCircle className="h-5 w-5 text-red-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">
                                            {tx.description}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {formatDate(tx.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span
                                        className={`font-semibold ${tx.type === "cashback"
                                                ? "text-green-600"
                                                : "text-red-600"
                                            }`}
                                    >
                                        {tx.type === "cashback" ? "+" : "-"}
                                        {formatCurrency(tx.amount)}
                                    </span>
                                    <StatusBadge status={tx.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Withdraw Modal */}
            <WithdrawModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                balance={stats?.walletBalance || 0}
                onSuccess={handleWithdrawSuccess}
            />
        </div>
    );
}

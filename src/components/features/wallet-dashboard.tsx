"use client";

import { useState, useEffect, useCallback } from "react";
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
    Coins,
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
import { getUserPointsAction, createWithdrawalByPointsAction } from "@/actions/points-actions";

// Format tiền VNĐ
function formatCurrency(amount: number | string | undefined): string {
    if (!amount) return "0 ₫";
    const num = typeof amount === "string" ? parseInt(amount) : amount;
    return new Intl.NumberFormat("vi-VN").format(num) + " ₫";
}

// Format ngày
function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

// Status badge
function StatusBadge({ status }: { status: string }) {
    const styles = {
        pending: "bg-yellow-100 text-yellow-700",
        approved: "bg-green-100 text-green-700",
        rejected: "bg-red-100 text-red-700",
    };
    const labels = { pending: "Chờ duyệt", approved: "Hoàn thành", rejected: "Từ chối" };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
            {labels[status as keyof typeof labels] || status}
        </span>
    );
}

// ============================================
// POINTS CARD COMPONENT
// ============================================
function PointsCard() {
    const [pointsData, setPointsData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getUserPointsAction().then((result) => {
            if (result.success && result.data) {
                setPointsData(result.data);
            }
            setIsLoading(false);
        });
    }, []);

    if (isLoading) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Coins className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                    <p className="text-sm text-slate-600">Điểm của tôi</p>
                    <p className="text-2xl font-bold text-blue-600">
                        {pointsData?.totalPoints || 0} điểm
                    </p>
                </div>
            </div>
            <p className="mt-2 text-sm text-slate-600">
                {pointsData?.exchangeMessage || `Tương đương 0đ`}
            </p>
            {pointsData?.pendingMessage && (
                <p className="mt-1 text-sm text-yellow-600">{pointsData.pendingMessage}</p>
            )}
        </div>
    );
}

// ============================================
// POINTS WITHDRAW CARD COMPONENT
// ============================================
function PointsWithdrawCard() {
    const [pointsData, setPointsData] = useState<any>(null);
    const [withdrawPoints, setWithdrawPoints] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        getUserPointsAction().then((result) => {
            if (result.success && result.data) {
                setPointsData(result.data);
            }
        });
    }, [isModalOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsSubmitting(true);

        const points = parseInt(withdrawPoints);
        const result = await createWithdrawalByPointsAction(points);

        setIsSubmitting(false);

        if (result.success) {
            setSuccess(result.data?.message || "Thành công");
            setWithdrawPoints("");
            setTimeout(() => setIsModalOpen(false), 1500);
        } else {
            setError(result.error || "Lỗi");
        }
    };

    const canWithdraw = (pointsData?.availablePoints || 0) >= (pointsData?.minimumWithdrawal || 10);

    if (!isModalOpen) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-slate-900">Rút điểm</h3>
                        <p className="text-sm text-slate-600">
                            {canWithdraw
                                ? `Tối thiểu ${pointsData?.minimumWithdrawal || 10} điểm`
                                : `Cần ${pointsData?.minimumWithdrawal || 10} điểm để rút`}
                        </p>
                    </div>
                    <Button onClick={() => setIsModalOpen(true)} disabled={!canWithdraw} size="lg">
                        Rút điểm
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Rút điểm</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Điểm khả dụng: <span className="font-bold">{pointsData?.availablePoints || 0}</span></p>
                <p className="text-xs text-blue-500">Quy đổi: {pointsData?.exchangeMessage || "0đ"}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm text-slate-600 mb-1">Số điểm muốn rút</label>
                    <Input
                        type="number"
                        value={withdrawPoints}
                        onChange={(e) => setWithdrawPoints(e.target.value)}
                        min={pointsData?.minimumWithdrawal || 10}
                        max={pointsData?.availablePoints || 0}
                        placeholder={`Tối thiểu ${pointsData?.minimumWithdrawal || 10} điểm`}
                        required
                    />
                    {withdrawPoints && (
                        <p className="mt-1 text-sm text-green-600 font-medium">
                            = {formatCurrency(parseInt(withdrawPoints) * (pointsData?.exchangeRate || 1000))}
                        </p>
                    )}
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        {success}
                    </div>
                )}

                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">
                        Hủy
                    </Button>
                    <Button type="submit" disabled={isSubmitting || !withdrawPoints} className="flex-1">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

// ============================================
// MAIN WALLET DASHBOARD
// ============================================
export function WalletDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<WalletStats | null>(null);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadData = useCallback(async () => {
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
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleWithdrawSuccess = () => {
        loadData();
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
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                            <Wallet className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Số dư khả dụng</p>
                            <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.walletBalance || 0)}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                            <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Đang chờ duyệt</p>
                            <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.pendingWithdrawal || 0)}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Tổng đã rút</p>
                            <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.totalWithdrawn || 0)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Points Section */}
            <PointsCard />
            <PointsWithdrawCard />

            {/* Legacy VND Withdraw */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                    <h3 className="font-semibold text-slate-900">Rút tiền (VND)</h3>
                    <p className="text-sm text-slate-600">
                        {canWithdraw ? "Rút về tài khoản ngân hàng" : "Số dư tối thiểu 50,000 ₫"}
                    </p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} disabled={!canWithdraw} size="lg">
                    Rút tiền
                </Button>
            </div>

            {/* Transaction History */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h3 className="font-semibold text-slate-900">Lịch sử giao dịch</h3>
                </div>

                {transactions.length === 0 ? (
                    <div className="p-12 text-center">
                        <Wallet className="mx-auto h-12 w-12 text-slate-300" />
                        <p className="mt-4 text-slate-600">Chưa có giao dịch nào</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between px-5 py-4">
                                <div className="flex items-center gap-3">
                                    {tx.type === "cashback" ? (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                                            <ArrowDownCircle className="h-4 w-4 text-green-600" />
                                        </div>
                                    ) : (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                                            <ArrowUpCircle className="h-4 w-4 text-red-600" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">
                                            {tx.type === "cashback" ? "Cashback" : "Rút tiền"}
                                        </p>
                                        <p className="text-xs text-slate-500">{formatDate(tx.createdAt)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-semibold ${tx.type === "cashback" ? "text-green-600" : "text-red-600"}`}>
                                        {tx.type === "cashback" ? "+" : "-"}{formatCurrency(String(tx.amount))}
                                    </p>
                                    <StatusBadge status={tx.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
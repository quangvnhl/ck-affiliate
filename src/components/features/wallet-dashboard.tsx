"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Wallet,
    Clock,
    CheckCircle,
    ArrowUpCircle,
    Loader2,
    AlertCircle,
    X,
    Coins,
    ArrowDownCircle,
    History,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    getTransactionHistory,
    getWithdrawalHistory,
    type PointTransactionItem,
    type WithdrawalHistoryItem,
} from "@/actions/wallet-actions";
import { getUserPointsAction, createWithdrawalByPointsAction } from "@/actions/points-actions";

function formatCurrency(amount: number | string | undefined): string {
    if (!amount) return "0 ₫";
    const num = typeof amount === "string" ? parseInt(amount) : amount;
    return new Intl.NumberFormat("vi-VN").format(num) + " ₫";
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function formatDateTime(date: Date): string {
    return new Date(date).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function PointsBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-700",
        approved: "bg-green-100 text-green-700",
        rejected: "bg-red-100 text-red-700",
        confirmed: "bg-green-100 text-green-700",
        processing: "bg-blue-100 text-blue-700",
        paid: "bg-green-100 text-green-700",
    };
    const labels: Record<string, string> = {
        pending: "Chờ duyệt",
        approved: "Đã duyệt",
        rejected: "Từ chối",
        confirmed: "Đã xác nhận",
        processing: "Đang xử lý",
        paid: "Đã CK",
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${styles[status] || styles.pending}`}>
            {labels[status] || status}
        </span>
    );
}

function TrashBadge({ isTrash }: { isTrash: boolean }) {
    if (!isTrash) return null;
    return (
        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-slate-200 text-slate-500 line-through">
            Đã xóa
        </span>
    );
}

function WithdrawalStatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-700",
        approved: "bg-blue-100 text-blue-700",
        processing: "bg-blue-100 text-blue-700",
        paid: "bg-green-100 text-green-700",
        rejected: "bg-red-100 text-red-700",
    };
    const labels: Record<string, string> = {
        pending: "Chờ duyệt",
        approved: "Chờ CK",
        processing: "Đang xử lý",
        paid: "Đã CK",
        rejected: "Từ chối",
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${styles[status] || styles.pending}`}>
            {labels[status] || status}
        </span>
    );
}

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

    const canWithdraw = (pointsData?.totalPoints || 0) >= (pointsData?.minimumWithdrawal || 10);

    if (!isModalOpen) {
        return (
            <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
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
        <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Rút điểm</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Điểm khả dụng: <span className="font-bold">{pointsData?.totalPoints || 0}</span></p>
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
                        max={pointsData?.totalPoints || 0}
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

export function WalletDashboard() {
    const [pointsData, setPointsData] = useState<any>(null);
    const [pointTransactions, setPointTransactions] = useState<PointTransactionItem[]>([]);
    const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        const [pointsResult, txResult, wdResult] = await Promise.all([
            getUserPointsAction(),
            getTransactionHistory(),
            getWithdrawalHistory(),
        ]);

        if (pointsResult.success && pointsResult.data) {
            setPointsData(pointsResult.data);
        }
        if (txResult.success && txResult.data) {
            setPointTransactions(txResult.data);
        }
        if (wdResult.success && wdResult.data) {
            setWithdrawalHistory(wdResult.data);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards - Points focused */}
            <div className="grid gap-4 md:grid-cols-3">
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
                    <p className="mt-2 text-xs text-slate-500">
                        ≈ {formatCurrency((pointsData?.totalPoints || 0) * (pointsData?.exchangeRate || 1000))}
                    </p>
                </div>

                <div className="rounded-xl border border-yellow-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                            <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Điểm đang rút</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {pointsData?.withdrawingPoints || 0} điểm
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-green-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Tổng đã rút</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(pointsData?.totalWithdrawn || 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Withdraw Points Card */}
            <PointsWithdrawCard />

            {/* Transaction History - Points */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-4 flex items-center gap-2">
                    <ArrowDownCircle className="h-5 w-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">Lịch sử điểm</h3>
                </div>

                {pointTransactions.length === 0 ? (
                    <div className="p-12 text-center">
                        <Wallet className="mx-auto h-12 w-12 text-slate-300" />
                        <p className="mt-4 text-slate-600">Chưa có giao dịch điểm nào</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {pointTransactions.map((tx) => (
                            <div key={tx.id} className={`flex items-center justify-between px-5 py-4 ${tx.trash ? "opacity-50" : ""}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                        tx.type === "commission" ? "bg-green-100" : "bg-red-100"
                                    }`}>
                                        {tx.type === "commission" ? (
                                            <ArrowDownCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <ArrowUpCircle className="h-4 w-4 text-red-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">
                                            {tx.type === "commission" ? "Cashback" : "Rút điểm"} ({Math.abs(tx.points)} điểm)
                                        </p>
                                        <p className="text-xs text-slate-500">{formatDateTime(tx.createdAt)}</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <PointsBadge status={tx.status} />
                                    <TrashBadge isTrash={tx.trash} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Withdrawal History - VNĐ */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-4 flex items-center gap-2">
                    <History className="h-5 w-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">Lịch sử rút điểm</h3>
                </div>

                {withdrawalHistory.length === 0 ? (
                    <div className="p-12 text-center">
                        <History className="mx-auto h-12 w-12 text-slate-300" />
                        <p className="mt-4 text-slate-600">Chưa có yêu cầu rút điểm nào</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {withdrawalHistory.map((wd) => (
                            <div key={wd.id} className="flex items-center justify-between px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                                        <ArrowUpCircle className="h-4 w-4 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">
                                            Rút {formatCurrency(wd.amount)}
                                        </p>
                                        <p className="text-xs text-slate-500">{formatDateTime(wd.createdAt)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <WithdrawalStatusBadge status={wd.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
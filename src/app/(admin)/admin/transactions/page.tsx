"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Receipt,
    ArrowDownCircle,
    ArrowUpCircle,
    TrendingUp,
    Clock,
    Loader2,
    Search,
    Download,
    Filter,
    AlertCircle,
    Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    getAdminTransactionsAction,
    getAdminTransactionStatsAction,
    getUsersListAction,
    claimOrphanedTransactionAction,
    rejectOrphanedTransactionAction,
    deleteOrphanedTransactionAction,
    updateTransactionStatusAction,
    type AdminTransactionItem,
    type TransactionStats,
} from "@/actions/admin-transaction-actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { or } from "drizzle-orm";
import { type } from '../../../../../.next/dev/types/routes';

export default function AdminTransactionsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [transactions, setTransactions] = useState<AdminTransactionItem[]>([]);
    const [stats, setStats] = useState<TransactionStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const statusParam = searchParams.get("status");
    const typeParam = searchParams.get("type");

    const initialStatus = statusParam && ["all", "pending", "confirmed", "rejected", "paid", "orphaned"].includes(statusParam) 
        ? statusParam as "all" | "pending" | "confirmed" | "rejected" | "paid" | "orphaned"
        : "all";
    const initialType = typeParam && ["all", "commission", "withdrawal"].includes(typeParam) 
        ? typeParam as "all" | "commission" | "withdrawal"
        : "all";

    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "confirmed" | "rejected" | "paid" | "orphaned">(initialStatus);
    const [typeFilter, setTypeFilter] = useState<"all" | "commission" | "withdrawal">(initialType);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [claimEmail, setClaimEmail] = useState("");
    const [rejectReason, setRejectReason] = useState<string>("");
    const [batchStatus, setBatchStatus] = useState<string>("");
    const [processing, setProcessing] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        const [txResult, statsResult] = await Promise.all([
            getAdminTransactionsAction(statusFilter, typeFilter),
            getAdminTransactionStatsAction(),
        ]);

        if (txResult.success && txResult.data) {
            setTransactions(txResult.data);
        }
        if (statsResult.success && statsResult.data) {
            setStats(statsResult.data);
        }
        setIsLoading(false);
    }, [statusFilter, typeFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleStatusChange = (newStatus: "all" | "pending" | "confirmed" | "rejected" | "paid" | "orphaned") => {
        setStatusFilter(newStatus);
        const params = new URLSearchParams(searchParams.toString());
        if (newStatus === "all") {
            params.delete("status");
        } else {
            params.set("status", newStatus);
        }
        router.push(`/admin/transactions?${params.toString()}`, { scroll: false });
    };

    const handleTypeChange = (newType: "all" | "commission" | "withdrawal") => {
        setTypeFilter(newType);
        const params = new URLSearchParams(searchParams.toString());
        if (newType === "all") {
            params.delete("type");
        } else {
            params.set("type", newType);
        }
        router.push(`/admin/transactions?${params.toString()}`, { scroll: false });
    };

    const filteredTransactions = transactions.filter(
        (tx) =>
            tx.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (tx.orderIdExternal && tx.orderIdExternal.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Toggle selection for checkbox
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    // Export CSV
    const handleExportCSV = () => {
        const headers = ["ID", "Type", "Email", "Amount", "Status", "Platform", "Order ID", "Date"];
        const rows = filteredTransactions.map((tx) => [
            tx.id,
            tx.type,
            tx.userEmail,
            tx.amount,
            tx.status,
            tx.platformName || "",
            tx.orderIdExternal || "",
            new Date(tx.createdAt).toISOString(),
        ]);

        const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
    };

    const handleClaimOrphaned = async () => {
        if (selectedIds.size === 0 || !claimEmail) return;
        setProcessing(true);

        // Find user by email
        const userRes = await getUsersListAction();
        const user = userRes.data?.find(u => u.email.toLowerCase() === claimEmail.toLowerCase());

        if (!user) {
            setProcessing(false);
            setSearchTerm("Không tìm thấy user với email này");
            return;
        }

        // Claim each selected transaction
        for (const txId of selectedIds) {
            await claimOrphanedTransactionAction(txId, user.id);
        }

        setProcessing(false);
        setSelectedIds(new Set());
        setClaimEmail("");
        loadData();
    };

    const handleRejectOrphaned = async () => {
        if (selectedIds.size === 0 || !rejectReason) return;
        setProcessing(true);

        for (const txId of selectedIds) {
            await rejectOrphanedTransactionAction(txId, rejectReason);
        }

        setProcessing(false);
        setSelectedIds(new Set());
        setRejectReason("");
        loadData();
    };

    const handleDeleteOrphaned = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Bạn có chắc muốn xóa ${selectedIds.size} giao dịch?`)) return;
        setProcessing(true);

        for (const txId of selectedIds) {
            await deleteOrphanedTransactionAction(txId);
        }

        setProcessing(false);
        setSelectedIds(new Set());
        loadData();
    };

    const handleBatchStatusChange = async () => {
        if (!batchStatus || selectedIds.size === 0) return;
        setProcessing(true);

        const ids = Array.from(selectedIds);
        const res = await updateTransactionStatusAction(ids, batchStatus, batchStatus === "rejected" ? rejectReason : undefined);

        setProcessing(false);
        if (res.success) {
            setSelectedIds(new Set());
            setBatchStatus("");
            setRejectReason("");
            loadData();
        } else {
            setSearchTerm(res.error || "Lỗi");
        }
    };

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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-50">Lịch sử giao dịch</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Xem toàn bộ dòng tiền vào (commission) và ra (rút tiền)
                    </p>
                </div>
                <Button onClick={handleExportCSV} variant="outline" className="border-slate-700 text-slate-300">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <StatCard
                    label="Tổng commission"
                    value={formatCurrency(stats?.totalCashback || 0)}
                    icon={ArrowDownCircle}
                    color="green"
                />
                <StatCard
                    label="Tổng đã rút"
                    value={formatCurrency(stats?.totalWithdrawn || 0)}
                    icon={ArrowUpCircle}
                    color="blue"
                />
                <StatCard
                    label="Chờ duyệt rút"
                    value={stats?.pendingWithdrawals || 0}
                    icon={Clock}
                    color="yellow"
                />
                <StatCard
                    label="Chờ xử lý"
                    value={stats?.pendingCount || 0}
                    icon={TrendingUp}
                    color="orange"
                />
                <StatCard
                    label="Không xác định"
                    value={stats?.orphanedCount || 0}
                    icon={AlertCircle}
                    color="red"
                />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Tìm theo email, ID, Order ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-slate-800 border-slate-700 text-slate-50 placeholder:text-slate-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-400">Lọc:</span>
                </div>

                {/* Type Filter */}
                <select
                    value={typeFilter}
                    onChange={(e) => {
                        handleTypeChange(e.target.value as "all" | "commission" | "withdrawal");
                        setSelectedIds(new Set());
                        setClaimEmail("");
                        setRejectReason("");
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    <option value="all">Tất cả loại</option>
                    <option value="commission">Hoa hồng</option>
                    <option value="withdrawal">Rút tiền</option>
                </select>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => {
                        handleStatusChange(e.target.value as "all" | "pending" | "confirmed" | "rejected" | "paid" | "orphaned");
                        setSelectedIds(new Set());
                        setClaimEmail("");
                        setRejectReason("");
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="pending">Chờ xử lý</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="rejected">Từ chối</option>
                    <option value="paid">Đã thanh toán</option>
                    <option value="orphaned">Không xác định</option>
                </select>

                <span className="text-sm text-slate-400">
                    {filteredTransactions.length} giao dịch
                </span>
            </div>

            {/* Batch Actions */}
            {selectedIds.size > 0 && (
                <div className="space-y-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                    <span className="text-yellow-400 text-sm ml-2">
                        {selectedIds.size} chọn
                    </span>
                    {(statusFilter === "orphaned" || statusFilter === "all") && selectedIds.size > 0 && (
                        <div className=" flex gap-2 flex-col md:flex-row md:items-center">
                            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                                <p className="text-xs text-green-400 font-medium mb-2">Gán cho user:</p>
                                <div className=" flex flex-wrap gap-2 items-center">
                                    <Input
                                        value={claimEmail}
                                        onChange={(e) => setClaimEmail(e.target.value)}
                                        placeholder="Email user..."
                                        className="w-48 bg-slate-800 border-slate-700 text-slate-50 text-sm"
                                    />
                                    <Button
                                        onClick={handleClaimOrphaned}
                                        disabled={processing}
                                        className="bg-green-600 hover:bg-green-700 text-sm py-1"
                                    >
                                        Gán
                                    </Button>
                                </div>
                            </div>
                            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                                <p className="text-xs text-red-400 font-medium mb-2">Lý do từ chối:</p>
                                <div className=" flex flex-wrap gap-2 items-center">
                                    <Input
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        placeholder="Lý do..."
                                        className="w-32 bg-slate-800 border-slate-700 text-slate-50 text-sm"
                                    />
                                    <Button
                                        onClick={handleRejectOrphaned}
                                        disabled={!rejectReason || processing}
                                        variant="destructive"
                                        className="text-sm py-1"
                                    >
                                        Từ chối
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                                <p className="text-xs text-red-400 font-medium mb-2">Xóa:</p>
                                <div className=" flex flex-wrap gap-2 items-center">
                                    <Button
                                        onClick={handleDeleteOrphaned}
                                        disabled={processing}
                                        variant="outline"
                                        className="border-red-500/50 text-red-400 hover:bg-red-500/20 text-sm py-1"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Change Status Group */}
                            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                                <p className="text-xs text-blue-400 font-medium mb-2">Đổi trạng thái:</p>
                                <div className="flex flex-wrap gap-2 items-center">
                                    <select
                                        value={batchStatus}
                                        onChange={(e) => setBatchStatus(e.target.value)}
                                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50"
                                    >
                                        <option value="">Chọn...</option>
                                        <option value="confirmed">Đã xác nhận</option>
                                        <option value="pending">Chờ xử lý</option>
                                        <option value="orphaned">Không xác định</option>
                                    </select>
                                    <Button
                                        onClick={handleBatchStatusChange}
                                        disabled={!batchStatus || processing}
                                        className="bg-blue-600 hover:bg-blue-700 text-sm py-1"
                                    >
                                        Áp dụng
                                    </Button>
                                    
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Transactions Table */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/30 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700 bg-slate-800/50">
                            <th className="px-4 py-3 w-8"></th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                Email
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                Số tiền
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                Loại
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                Trạng thái
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                Sàn / Order ID
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                Ngày
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {filteredTransactions.map((tx) => (
                            <tr
                                key={tx.id}
                                className={`hover:bg-slate-800/30 ${selectedIds.has(tx.id) ? "bg-yellow-500/20" : ""}`}
                            >
                                <td className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(tx.id)}
                                        onChange={() => toggleSelect(tx.id)}
                                        className="h-4 w-4 accent-yellow-500"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    {tx.status === "orphaned" ? (
                                        <span className="text-sm bg-red-500/20 text-red-400 px-2 rounded-2xl">Anonymous</span>
                                    ) : (
                                        <>
                                            <p className="text-sm text-slate-50">{tx.userEmail}</p>
                                            <p className="text-xs text-slate-500">{tx.id.slice(0, 8)}...</p>
                                        </>
                                    )}
                                    
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`font-semibold ${
                                            tx.type === "commission" ? "text-green-400" :
                                            tx.type === "withdrawal" ? "text-cyan-400" : "text-red-400"
                                        }`}
                                    >
                                        {tx.type === "commission" ? "+" : "-"}
                                        {tx.type === "withdrawal" 
                                            ? formatCurrency(tx.amount)
                                            : formatCurrency(tx.amount)
                                        }
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <TypeBadge type={tx.type} />
                                </td>
                                <td className="px-4 py-3">
                                    <StatusBadge status={tx.status} type={tx.type} />
                                </td>
                                <td className="px-4 py-3">
                                    {tx.type === "withdrawal" ? (
                                        <span className="text-slate-500">—</span>
                                    ) : (
                                        <>
                                            {tx.platformName && (
                                                <p className="text-sm text-slate-300">{tx.platformName}</p>
                                            )}
                                            {tx.orderIdExternal && (
                                                <p className="text-xs text-slate-500">{tx.orderIdExternal}</p>
                                            )}
                                            {!tx.platformName && !tx.orderIdExternal && (
                                                <span className="text-slate-500">—</span>
                                            )}
                                        </>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-400">
                                    {formatDate(tx.createdAt)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredTransactions.length === 0 && (
                    <div className="py-12 text-center">
                        <Receipt className="mx-auto h-12 w-12 text-slate-600" />
                        <p className="mt-4 text-slate-400">Không có giao dịch nào</p>
                    </div>
                )}
            </div>
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
}: {
    label: string;
    value: number | string;
    icon: React.ComponentType<{ className?: string }>;
    color: "green" | "red" | "yellow" | "blue" | "orange";
}) {
    const colors: Record<string, string> = {
        green: "bg-green-500/20 text-green-400 border-green-500/30",
        red: "bg-red-500/20 text-red-400 border-red-500/30",
        yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    };

    return (
        <div className={`rounded-lg border p-4 ${colors[color]}`}>
            <div className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                <p className="text-sm opacity-80">{label}</p>
            </div>
            <p className="mt-2 text-xl font-bold">{value}</p>
        </div>
    );
}

function TypeBadge({ type }: { type: "withdrawal" | "commission";  }) {
  

    if (type === "withdrawal") {
        return (
            <span className="inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs font-medium bg-cyan-500/20 text-cyan-400">
                <ArrowUpCircle className="h-3 w-3" />
                Rút tiền
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400">
            <ArrowDownCircle className="h-3 w-3" />
            Hoa hồng
        </span>
    );
}

function StatusBadge({ status, type }: { status: string; type: "withdrawal" | "commission" }) {
    const styles: Record<string, string> = {
        pending: type === "commission" ? "bg-orange-500/20 text-orange-400" : "bg-yellow-300/20 text-yellow-300",
        confirmed: "bg-green-500/20 text-green-400",
        rejected: "bg-red-500/20 text-red-400",
        paid: "bg-blue-500/20 text-blue-400",
        approved: "bg-blue-500/20 text-blue-400",
        orphaned: "bg-red-500/20 text-red-400",
    };

    const labels: Record<string, string> = {
        pending: type === "commission" ? "Chờ xử lý" : "Chờ duyệt rút",
        confirmed: "Đã xác nhận",
        rejected: "Từ chối",
        paid: "Đã thanh toán",
        approved: "Đã duyệt",
        orphaned: "Không xác định",
    };

    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.pending}`}
        >
            {labels[status] || status}
        </span>
    );
}

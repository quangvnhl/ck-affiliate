"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    getAdminTransactionsAction,
    getAdminTransactionStatsAction,
    type AdminTransactionItem,
    type TransactionStats,
} from "@/actions/admin-transaction-actions";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState<AdminTransactionItem[]>([]);
    const [stats, setStats] = useState<TransactionStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "cashback" | "withdrawal">("all");
    const [searchTerm, setSearchTerm] = useState("");

    const loadData = async () => {
        setIsLoading(true);
        const [txResult, statsResult] = await Promise.all([
            getAdminTransactionsAction(filter),
            getAdminTransactionStatsAction(),
        ]);

        if (txResult.success && txResult.data) {
            setTransactions(txResult.data);
        }
        if (statsResult.success && statsResult.data) {
            setStats(statsResult.data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [filter]);

    const filteredTransactions = transactions.filter(
        (tx) =>
            tx.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (tx.orderIdExternal && tx.orderIdExternal.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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
                        Xem toàn bộ dòng tiền vào (cashback) và ra (rút tiền)
                    </p>
                </div>
                <Button onClick={handleExportCSV} variant="outline" className="border-slate-700 text-slate-300">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    label="Tổng cashback"
                    value={formatCurrency(stats?.totalCashback || 0)}
                    icon={ArrowDownCircle}
                    color="green"
                />
                <StatCard
                    label="Tổng đã rút"
                    value={formatCurrency(stats?.totalWithdrawn || 0)}
                    icon={ArrowUpCircle}
                    color="red"
                />
                <StatCard
                    label="Chờ duyệt rút"
                    value={stats?.pendingWithdrawals || 0}
                    icon={Clock}
                    color="yellow"
                />
                <StatCard
                    label="Giao dịch hôm nay"
                    value={stats?.todayTransactions || 0}
                    icon={TrendingUp}
                    color="blue"
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
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as typeof filter)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="all">Tất cả</option>
                        <option value="cashback">Cashback</option>
                        <option value="withdrawal">Rút tiền</option>
                    </select>
                </div>

                <span className="text-sm text-slate-400">
                    {filteredTransactions.length} giao dịch
                </span>
            </div>

            {/* Transactions Table */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/30 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700 bg-slate-800/50">
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                Loại
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                Email
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                                Số tiền
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
                            <tr key={tx.id} className="hover:bg-slate-800/30">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {tx.type === "cashback" ? (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20">
                                                <ArrowDownCircle className="h-4 w-4 text-green-400" />
                                            </div>
                                        ) : (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20">
                                                <ArrowUpCircle className="h-4 w-4 text-red-400" />
                                            </div>
                                        )}
                                        <span className="text-sm text-slate-300">
                                            {tx.type === "cashback" ? "Cashback" : "Rút tiền"}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-sm text-slate-50">{tx.userEmail}</p>
                                    <p className="text-xs text-slate-500">{tx.id.slice(0, 8)}...</p>
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`font-semibold ${tx.type === "cashback" ? "text-green-400" : "text-red-400"
                                            }`}
                                    >
                                        {tx.type === "cashback" ? "+" : "-"}
                                        {formatCurrency(tx.amount)}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <StatusBadge status={tx.status} />
                                </td>
                                <td className="px-4 py-3">
                                    {tx.platformName && (
                                        <p className="text-sm text-slate-300">{tx.platformName}</p>
                                    )}
                                    {tx.orderIdExternal && (
                                        <p className="text-xs text-slate-500">{tx.orderIdExternal}</p>
                                    )}
                                    {!tx.platformName && !tx.orderIdExternal && (
                                        <span className="text-slate-500">—</span>
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
    color: "green" | "red" | "yellow" | "blue";
}) {
    const colors = {
        green: "bg-green-500/20 text-green-400 border-green-500/30",
        red: "bg-red-500/20 text-red-400 border-red-500/30",
        yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
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

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        pending: "bg-yellow-500/20 text-yellow-400",
        approved: "bg-green-500/20 text-green-400",
        rejected: "bg-red-500/20 text-red-400",
    };

    const labels: Record<string, string> = {
        pending: "Chờ xử lý",
        approved: "Hoàn thành",
        rejected: "Từ chối",
    };

    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.pending
                }`}
        >
            {labels[status] || status}
        </span>
    );
}

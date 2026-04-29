"use client";

import { useState, useEffect } from "react";
import {
  ClipboardCheck,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Clock,
  Trash2,
  Upload,
  FileSpreadsheet
} from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createReconciliationAction,
  confirmReconciliationAction,
  rejectReconciliationAction,
  getReconciliationStatsAction,
  getPlatformsAction,
  batchImportReconciliationAction,
  type CodeMatch,
  type BatchReconciliationRow
} from "@/actions/admin-reconciliation-actions";
import { formatCurrency } from "@/lib/utils";

interface ReconciliationData {
  codeMatches?: CodeMatch[];
  transaction?: {
    id: string;
    orderIdExternal: string | null;
    status: string;
  };
  user?: { id: string; email: string | null } | null;
  orderAmount?: number;
  commissionAmount?: number;
  commissionPercent?: number;
  cashbackAmount?: number;
  points?: number;
}

export default function AdminReconciliationPage() {
  const [mode, setMode] = useState<"manual" | "batch">("manual");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ReconciliationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    pendingCount: number;
    confirmedCount: number;
    orphanedCount: number;
  } | null>(null);

  // Form fields
  const [subId, setSubId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [orderAmount, setOrderAmount] = useState("");
  const [checkoutId, setCheckoutId] = useState("");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("70");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<{ id: number; name: string }[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");

  // Batch fields
  const [csvData, setCsvData] = useState<BatchReconciliationRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [batchResult, setBatchResult] = useState<any>(null);

  const isCommissionValid = (parseInt(commissionAmount) || 0) <= (parseInt(orderAmount) || 0);

  const loadStats = async () => {
    const res = await getReconciliationStatsAction();
    if (res.success && res.data) {
      setStats(res.data);
    }
  };

  const loadPlatforms = async () => {
    const res = await getPlatformsAction();
    if (res.success && res.data) {
      setPlatforms(res.data);
    }
  };

  useEffect(() => {
    loadStats();
    loadPlatforms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const orderAmt = parseInt(orderAmount) || 0;
    const commissionAmt = parseInt(commissionAmount) || 0;

    if (commissionAmt > orderAmt) {
      setError("Commission Amount không được vượt quá Order Amount");
      return;
    }

    setIsLoading(true);

    const res = await createReconciliationAction({
      subId,
      orderId,
      orderAmount: orderAmt,
      checkoutId,
      commissionAmount: commissionAmt,
      commissionPercent: parseInt(commissionPercent) || 70,
      platformId: selectedPlatform ? parseInt(selectedPlatform) : undefined,
    });

    setIsLoading(false);

    if (res.success && res.data) {
      setResult(res.data);
      loadStats();
    } else if (res.codeMatches) {
      setError(`Tìm thấy ${res.codeMatches.length} link. Vui lòng chọn:`);
      setResult({ codeMatches: res.codeMatches });
    } else {
      setError(res.error || "Lỗi không xác định");
    }
  };

  const handleConfirm = async () => {
    if (!result?.transaction?.id) return;

    setIsLoading(true);
    const res = await confirmReconciliationAction(result.transaction.id);
    setIsLoading(false);

    if (res.success) {
      setResult({ ...result, transaction: { ...result.transaction, status: "confirmed" } });
      loadStats();
    } else {
      setError(res.error || "Lỗi xác nhận");
    }
  };

  const handleReject = async () => {
    if (!result?.transaction?.id || !rejectionReason) return;

    setIsLoading(true);
    const res = await rejectReconciliationAction(result.transaction.id, rejectionReason);
    setIsLoading(false);

    if (res.success) {
      setResult({ ...result, transaction: { ...result.transaction, status: "rejected" } });
      setRejectionReason("");
      loadStats();
    } else {
      setError(res.error || "Lỗi từ chối");
    }
  };

  // Batch specific handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedRows: BatchReconciliationRow[] = [];
        
        results.data.forEach((row: any) => {
          const subId = row["Sub Id 1"] || row["SubID"] || row["sub_id_1"] || "";
          const orderId = row["ID đơn hàng"] || row["Order ID"] || row["order_id"] || "";
          const orderAmountStr = row["Giá trị đơn hàng (₫)"] || row["Order Amount"] || row["order_amount"] || "0";
          const checkoutId = row["Checkout id"] || row["Checkout ID"] || row["checkout_id"] || "";
          const commissionAmountStr = row["Hoa hồng ròng tiếp thị liên kết(₫)"] || row["Commission Amount"] || row["commission"] || "0";
          
          if (!subId && !orderId) return;

          parsedRows.push({
            subId: subId ? String(subId) : "",
            orderId: String(orderId),
            orderAmount: parseInt(String(orderAmountStr).replace(/[^0-9-]/g, "")) || 0,
            checkoutId: String(checkoutId),
            commissionAmount: parseInt(String(commissionAmountStr).replace(/[^0-9-]/g, "")) || 0,
            rawData: row
          });
        });

        setCsvData(parsedRows);
        setBatchResult(null);
      },
      error: (err) => {
        toast.error(`Lỗi đọc file CSV: ${err.message}`);
      }
    });
  };

  const removeRow = (index: number) => {
    setCsvData((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRowCommissionPercent = (index: number, value: string) => {
    const parsedValue = parseInt(value) || 0;
    setCsvData((prev) => prev.map((row, i) => i === index ? { ...row, commissionPercent: parsedValue } : row));
  };

  const updateRowSubId = (index: number, value: string) => {
    setCsvData((prev) => prev.map((row, i) => i === index ? { ...row, subId: value } : row));
  };

  const handleBatchSubmit = async () => {
    if (csvData.length === 0) {
      toast.error("Vui lòng tải lên file CSV có dữ liệu");
      return;
    }

    if (!selectedPlatform) {
        toast.error("Vui lòng chọn Nền tảng (Shopee/TikTok)");
        return;
    }

    setIsUploading(true);
    const res = await batchImportReconciliationAction({
      rows: csvData,
      commissionPercent: parseInt(commissionPercent) || 70,
      platformId: parseInt(selectedPlatform)
    });
    setIsUploading(false);

    if (res.success && res.data) {
      setBatchResult(res.data);
      toast.success(`Đã xử lý xong ${res.data.total} dòng`);
      loadStats();
    } else {
      toast.error(res.error || "Có lỗi xảy ra khi import");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Đối soát đơn hàng</h1>
          <p className="mt-1 text-sm text-slate-400">
            Nhập thông tin đơn hàng để đối soát và tính hoa hồng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-blue-400" />
          <span className="text-sm text-slate-400">
            {stats?.pendingCount || 0} chờ | {stats?.confirmedCount || 0} đã xác nhận
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/transactions?status=pending" className="rounded-lg border border-yellow-500/30 bg-yellow-500/20 p-4 hover:bg-yellow-500/30 transition-colors">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-400" />
            <p className="text-sm text-yellow-400">Chờ xử lý</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-yellow-400">
            {stats?.pendingCount || 0}
          </p>
        </Link>
        <Link href="/admin/transactions?status=confirmed" className="rounded-lg border border-green-500/30 bg-green-500/20 p-4 hover:bg-green-500/30 transition-colors">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <p className="text-sm text-green-400">Đã xác nhận</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-green-400">
            {stats?.confirmedCount || 0}
          </p>
        </Link>
        <Link href="/admin/transactions?status=orphaned" className="rounded-lg border border-red-500/30 bg-red-500/20 p-4 hover:bg-red-500/30 transition-colors">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-sm text-red-400">Không xác định</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-400">
            {stats?.orphanedCount || 0}
          </p>
        </Link>
      </div>

      {/* Mode Switcher */}
      <div className="flex space-x-2 border-b border-slate-700 pb-2">
        <Button 
          variant={mode === "manual" ? "default" : "outline"} 
          onClick={() => setMode("manual")}
          className={mode === "manual" ? "" : "bg-transparent border-slate-700 text-slate-300 hover:text-white"}
        >
          Nhập thủ công
        </Button>
        <Button 
          variant={mode === "batch" ? "default" : "outline"} 
          onClick={() => setMode("batch")}
          className={mode === "batch" ? "" : "bg-transparent border-slate-700 text-slate-300 hover:text-white"}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Import CSV (Hàng loạt)
        </Button>
      </div>

      {mode === "batch" ? (
        // ======================= BATCH IMPORT UI =======================
        <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-50">Tải lên file CSV đối soát</h2>
            <div className="flex gap-4 items-center">
                <div className="flex flex-col">
                    <label className="text-xs text-slate-400 mb-1">Nền tảng</label>
                    <select
                        value={selectedPlatform}
                        onChange={(e) => setSelectedPlatform(e.target.value)}
                        className="h-9 px-3 bg-slate-800 border border-slate-700 text-slate-50 rounded-md text-sm"
                    >
                        <option value="">Chọn nền tảng</option>
                        {platforms.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name === "shopee" ? "Shopee" : p.name === "tiktok" ? "TikTok" : p.name}
                        </option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col">
                    <label className="text-xs text-slate-400 mb-1">Commission %</label>
                    <Input 
                        value={commissionPercent} 
                        onChange={e => setCommissionPercent(e.target.value)} 
                        className="h-9 w-20 bg-slate-800 border-slate-700 text-slate-50" 
                    />
                </div>
                <div className="flex flex-col mt-5">
                    <label htmlFor="csv-upload">
                        <div className="flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer transition-colors">
                        <Upload className="h-4 w-4 mr-2" />
                        Chọn file CSV
                        </div>
                        <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileUpload}
                        />
                    </label>
                </div>
            </div>
          </div>

          {batchResult && (
            <div className={`p-4 rounded-lg border ${batchResult.failedCount === 0 ? 'border-green-500/30 bg-green-500/20' : 'border-yellow-500/30 bg-yellow-500/20'}`}>
                <h3 className="font-semibold text-white mb-2">Kết quả Import</h3>
                <ul className="text-sm space-y-1 text-slate-300">
                    <li>Tổng số: {batchResult.total}</li>
                    <li className="text-green-400">Thành công: {batchResult.successCount}</li>
                    <li className="text-yellow-400">Orphaned: {batchResult.orphanedCount}</li>
                    <li className="text-red-400">Thất bại: {batchResult.failedCount}</li>
                </ul>
                {batchResult.errors && batchResult.errors.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <p className="text-red-400 text-sm font-semibold">Chi tiết lỗi:</p>
                        <div className="max-h-32 overflow-y-auto text-xs text-red-300 mt-1">
                            {batchResult.errors.map((e: any, idx: number) => (
                                <p key={idx}>Dòng {e.row}: {e.error}</p>
                            ))}
                        </div>
                    </div>
                )}
            </div>
          )}

          {csvData.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm text-slate-400">
                <span>Đã tải {csvData.length} dòng. Vui lòng kiểm tra và ấn Xác nhận bên dưới.</span>
                <span className="text-green-400">Status mặc định: Đã xác nhận</span>
              </div>
              
              <div className="border border-slate-700 rounded-lg overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3">SubID</th>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Checkout ID</th>
                      <th className="px-4 py-3 text-right">Giá trị ĐH</th>
                      <th className="px-4 py-3 text-right">Hoa hồng</th>
                      <th className="px-4 py-3 text-right">Commission %</th>
                      <th className="px-4 py-3 text-right">Cashback</th>
                      <th className="px-4 py-3 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.map((row, index) => {
                      const commPercent = row.commissionPercent !== undefined ? row.commissionPercent : (parseInt(commissionPercent) || 70);
                      const cashback = Math.floor((row.commissionAmount * commPercent) / 100);
                      
                      return (
                        <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                          <td className="px-4 py-3">
                            <Input 
                              value={row.subId}
                              onChange={(e) => updateRowSubId(index, e.target.value)}
                              placeholder="SubID"
                              className="h-8 w-32 bg-slate-800 border-slate-700 text-slate-50 font-mono text-xs"
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{row.orderId}</td>
                          <td className="px-4 py-3 font-mono text-xs">{row.checkoutId}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(row.orderAmount)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(row.commissionAmount)}</td>
                          <td className="px-4 py-3 text-right">
                            <Input 
                              type="number"
                              value={row.commissionPercent !== undefined ? row.commissionPercent : commissionPercent}
                              onChange={(e) => updateRowCommissionPercent(index, e.target.value)}
                              className="h-8 w-20 text-right bg-slate-800 border-slate-700 text-slate-50 ml-auto"
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-green-400 font-medium">{formatCurrency(cashback)}</td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              onClick={() => removeRow(index)}
                              className="text-slate-500 hover:text-red-400 transition-colors"
                              title="Xóa dòng"
                            >
                              <Trash2 className="h-4 w-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleBatchSubmit} disabled={isUploading}>
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Tiến hành Import ({csvData.length} dòng)
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // ======================= MANUAL UI =======================
        <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-6">
          <h2 className="text-lg font-semibold text-slate-50 mb-4">Nhập thông tin đối soát</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  SubID (vd: x9Az1----) - Có thể để trống
                </label>
                <Input
                  value={subId}
                  onChange={(e) => setSubId(e.target.value)}
                  placeholder="Nhập subID từ Shopee"
                  className="bg-slate-800 border-slate-700 text-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Order ID
                </label>
                <Input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Mã đơn hàng"
                  required
                  className="bg-slate-800 border-slate-700 text-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Order Amount (VND)
                </label>
                <Input
                  type="number"
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(e.target.value)}
                  placeholder="Số tiền đơn hàng"
                  required
                  className="bg-slate-800 border-slate-700 text-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Checkout ID
                </label>
                <Input
                  value={checkoutId}
                  onChange={(e) => setCheckoutId(e.target.value)}
                  placeholder="Mã checkout"
                  className="bg-slate-800 border-slate-700 text-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Commission Amount (VND)
                </label>
                <Input
                  type="number"
                  value={commissionAmount}
                  onChange={(e) => setCommissionAmount(e.target.value)}
                  placeholder="Số tiền hoa hồng"
                  required
                  className={`bg-slate-800 border-slate-700 text-slate-50 ${!isCommissionValid && commissionAmount ? "border-red-500" : ""}`}
                />
                {!isCommissionValid && commissionAmount && orderAmount && (
                  <p className="mt-1 text-sm text-red-400">
                    Commission không được vượt quá Order Amount
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Commission % (vd: 70)
                </label>
                <Input
                  type="number"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  placeholder="70"
                  required
                  className="bg-slate-800 border-slate-700 text-slate-50"
                />
                {commissionAmount && commissionPercent && (
                  <p className="mt-1 text-sm text-green-400">
                    Cashback: {formatCurrency(Math.floor(parseInt(commissionAmount || "0") * parseInt(commissionPercent || "0") / 100))}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Nền tảng
                </label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-800 border border-slate-700 text-slate-50 rounded-md"
                >
                  <option value="">Chọn nền tảng</option>
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name === "shopee" ? "Shopee" : p.name === "tiktok" ? "TikTok" : p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Đối soát"
                )}
              </Button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/20 p-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>

              {/* Code Matches Selection */}
              {result?.codeMatches && (
                <div className="mt-4 space-y-2">
                  {result.codeMatches.map((link: any) => (
                    <div
                      key={link.id}
                      onClick={() => setSelectedLinkId(link.id)}
                      className={`p-3 rounded-lg border cursor-pointer ${
                        selectedLinkId === link.id
                          ? "border-blue-500 bg-blue-500/20"
                          : "border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <p className="text-sm text-slate-50">Code: {link.code}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {link.originalUrl}
                      </p>
                    </div>
                  ))}
                  <Button
                    onClick={() => {
                      setError("Đã chọn link");
                    }}
                    disabled={!selectedLinkId}
                    className="mt-2"
                  >
                    Xác nhận
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {result && result.transaction && (
            <div className="mt-6 rounded-lg border border-green-500/30 bg-green-500/20 p-4">
              <div className="flex items-center gap-2 text-green-400 mb-4">
                <CheckCircle className="h-5 w-5" />
                <p className="font-semibold">Đối soát thành công</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Transaction ID</p>
                  <p className="text-slate-50 font-mono">
                    {result.transaction.id.slice(0, 8)}...
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Order ID</p>
                  <p className="text-slate-50">{result.transaction.orderIdExternal}</p>
                </div>
                <div>
                  <p className="text-slate-400">User</p>
                  <p className="text-slate-50">
                    {result.user?.email || "Khách (chưa đăng ký)"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Trạng thái</p>
                  <p className="text-slate-50 capitalize">{result.transaction.status}</p>
                </div>
                <div>
                  <p className="text-slate-400">Order Amount</p>
                  <p className="text-slate-50">
                    {formatCurrency(result.orderAmount || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Commission Amount</p>
                  <p className="text-slate-50">
                    {formatCurrency(result.commissionAmount || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Commission %</p>
                  <p className="text-slate-50">{result.commissionPercent || 70}%</p>
                </div>
                <div>
                  <p className="text-slate-400">Cashback</p>
                  <p className="text-green-400 font-semibold">
                    {formatCurrency(result.cashbackAmount || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Points</p>
                  <p className="text-blue-400 font-semibold">
                    +{result.points || 0} điểm
                  </p>
                </div>
              </div>

              {/* Actions */}
              {result.transaction.status === "pending" && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="flex gap-2">
                    <Button onClick={handleConfirm} disabled={isLoading} variant="default">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Xác nhận
                    </Button>
                    <Button
                      onClick={handleReject}
                      disabled={isLoading || !rejectionReason}
                      variant="destructive"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Từ chối
                    </Button>
                  </div>
                  <div className="mt-2">
                    <Input
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Lý do từ chối..."
                      className="bg-slate-800 border-slate-700 text-slate-50"
                    />
                  </div>
                </div>
              )}

              {result.transaction.status === "confirmed" && (
                <div className="mt-4 p-2 bg-green-500/20 rounded text-green-400 text-sm">
                  ✓ Đã xác nhận
                </div>
              )}

              {result.transaction.status === "rejected" && (
                <div className="mt-4 p-2 bg-red-500/20 rounded text-red-400 text-sm">
                  ✓ Đã từ chối
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/20 p-4">
        <div className="flex items-center gap-2 text-blue-400">
          <Info className="h-5 w-5" />
          <p className="font-semibold">Hướng dẫn</p>
        </div>
        <ul className="mt-2 text-sm text-slate-400 space-y-1">
          <li>• SubID: Lấy từ Shopee (vd: x9Az1----)</li>
          <li>• Hệ thống tự tính 70% cashback và quy đổi điểm (1000đ = 1 điểm)</li>
          <li>• Link không tìm thấy sẽ lưu dạng orphaned</li>
        </ul>
      </div>
    </div>
  );
}

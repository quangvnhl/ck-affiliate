"use client";

import { useState, useEffect } from "react";
import {
    Settings,
    ShoppingBag,
    Music2,
    Loader2,
    Check,
    X,
    RefreshCw,
    Save,
    Percent,
    Key,
    AlertCircle,
    Link2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    getAdminPlatformsAction,
    updatePlatformConfigAction,
    togglePlatformStatusAction,
    type PlatformConfig,
} from "@/actions/admin-settings-actions";

export default function AdminSettingsPage() {
    const [platforms, setPlatforms] = useState<PlatformConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        const result = await getAdminPlatformsAction();
        if (result.success && result.data) {
            setPlatforms(result.data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleToggleStatus = async (platformId: number) => {
        const result = await togglePlatformStatusAction(platformId);
        if (result.success) {
            loadData();
            showSuccess("Cập nhật trạng thái thành công!");
        }
    };

    const showSuccess = (message: string) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(null), 3000);
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
                    <h1 className="text-2xl font-bold text-slate-50">Cài đặt hệ thống</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Quản lý cấu hình sàn và tham số hệ thống
                    </p>
                </div>
                <Button onClick={loadData} variant="outline" className="border-slate-700 text-slate-300">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Làm mới
                </Button>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/20 p-4 text-green-400">
                    <Check className="h-5 w-5" />
                    {successMessage}
                </div>
            )}

            {/* Platform Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {platforms.map((platform) => (
                    <PlatformCard
                        key={platform.id}
                        platform={platform}
                        isEditing={editingId === platform.id}
                        onToggleEdit={() => setEditingId(editingId === platform.id ? null : platform.id)}
                        onToggleStatus={() => handleToggleStatus(platform.id)}
                        onSave={() => {
                            loadData();
                            setEditingId(null);
                            showSuccess("Lưu cấu hình thành công!");
                        }}
                    />
                ))}
            </div>

            {/* System Settings */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-6">
                <h2 className="text-lg font-semibold text-slate-50 mb-4">Cài đặt chung</h2>

                <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                        <div>
                            <p className="font-medium text-slate-50">Số tiền rút tối thiểu</p>
                            <p className="text-sm text-slate-400">Người dùng cần có đủ số dư này để rút tiền</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-amber-400">50,000đ</span>
                            <span className="text-xs rounded-full bg-slate-700 px-2 py-1 text-slate-400">
                                Hardcoded
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                        <div>
                            <p className="font-medium text-slate-50">Cron Sync</p>
                            <p className="text-sm text-slate-400">Đồng bộ đơn hàng từ các sàn</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-300">Mỗi 30 phút</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1 text-xs font-medium text-green-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                Active
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                        <div>
                            <p className="font-medium text-slate-50">Trigger Manual Sync</p>
                            <p className="text-sm text-slate-400">Chạy đồng bộ đơn hàng ngay lập tức</p>
                        </div>
                        <Button variant="outline" className="border-slate-700 text-slate-300">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Chạy Sync
                        </Button>
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                    <p className="font-medium">Lưu ý về API Keys</p>
                    <p className="mt-1 opacity-80">
                        API Keys được lưu trữ dưới dạng mã hóa. Để bảo mật, chỉ hiển thị 4 ký tự cuối.
                        Khi cập nhật, nhập key mới hoặc để trống nếu không thay đổi.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ============================================
// PLATFORM CARD COMPONENT
// ============================================

function PlatformCard({
    platform,
    isEditing,
    onToggleEdit,
    onToggleStatus,
    onSave,
}: {
    platform: PlatformConfig;
    isEditing: boolean;
    onToggleEdit: () => void;
    onToggleStatus: () => void;
    onSave: () => void;
}) {
    const [commissionShare, setCommissionShare] = useState(platform.commissionShare.toString());

    // Mode selection: "api" hoặc "manual"
    const [configMode, setConfigMode] = useState<"api" | "manual">(
        platform.apiConfig?.mode || "manual"
    );

    // Manual Mode config
    const [manualConfig, setManualConfig] = useState({
        affiliate_id: platform.apiConfig?.affiliate_id || "",
        default_sub_id: platform.apiConfig?.default_sub_id || "",
    });

    // API Mode config
    const [apiConfig, setApiConfig] = useState({
        appId: "",
        apiKey: "",
        apiSecret: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const Icon = platform.name === "shopee" ? ShoppingBag : Music2;
    const iconBg = platform.name === "shopee" ? "bg-orange-500/20" : "bg-slate-700";
    const iconColor = platform.name === "shopee" ? "text-orange-400" : "text-slate-300";

    const handleSave = async () => {
        setError(null);
        setIsSubmitting(true);

        const config: Parameters<typeof updatePlatformConfigAction>[1] = {
            commissionShare: parseInt(commissionShare),
        };

        // Build apiConfig based on selected mode
        if (configMode === "manual") {
            // Validate required fields for manual mode
            if (!manualConfig.affiliate_id.trim()) {
                setError("Vui lòng nhập Affiliate ID");
                setIsSubmitting(false);
                return;
            }

            config.apiConfig = {
                mode: "manual",
                affiliate_id: manualConfig.affiliate_id.trim(),
                default_sub_id: manualConfig.default_sub_id.trim() || "CK",
            };
        } else {
            // API Mode - include API credentials if filled
            if (apiConfig.appId || apiConfig.apiKey || apiConfig.apiSecret) {
                config.apiConfig = {
                    mode: "api",
                    ...apiConfig,
                };
            }
        }

        const result = await updatePlatformConfigAction(platform.id, config);

        setIsSubmitting(false);

        if (!result.success) {
            setError(result.error || "Đã xảy ra lỗi");
            return;
        }

        onSave();
    };

    return (
        <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
                        <Icon className={`h-6 w-6 ${iconColor}`} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-50 capitalize">{platform.name}</h3>
                        <p className="text-sm text-slate-400">
                            Mode: {platform.apiConfig?.mode === "api" ? "API" : "Manual Link"}
                        </p>
                    </div>
                </div>

                {/* Status Toggle */}
                <button
                    onClick={onToggleStatus}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${platform.isActive
                        ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        }`}
                >
                    {platform.isActive ? "Active" : "Inactive"}
                </button>
            </div>

            {/* Commission Rate */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 mb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-300">Tỷ lệ chia sẻ cho User</span>
                    </div>
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                value={commissionShare}
                                onChange={(e) => setCommissionShare(e.target.value)}
                                className="w-20 bg-slate-900 border-slate-700 text-slate-50 text-right"
                                min={0}
                                max={100}
                            />
                            <span className="text-slate-400">%</span>
                        </div>
                    ) : (
                        <span className="text-xl font-bold text-amber-400">{platform.commissionShare}%</span>
                    )}
                </div>
            </div>

            {/* Current Config Display (when not editing) */}
            {!isEditing && platform.apiConfig?.mode === "manual" && platform.apiConfig?.affiliate_id && (
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Link2 className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-300">Manual Mode Config</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <span className="text-slate-500">Affiliate ID:</span>
                            <span className="ml-2 text-slate-300">{platform.apiConfig.affiliate_id}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Sub ID Prefix:</span>
                            <span className="ml-2 text-slate-300">{platform.apiConfig.default_sub_id || "CK"}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Form */}
            {isEditing && (
                <div className="space-y-4 mb-4">
                    {/* Mode Selector */}
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                        <p className="text-sm font-medium text-slate-300 mb-3">Chế độ tạo link</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setConfigMode("manual")}
                                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${configMode === "manual"
                                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/50"
                                        : "bg-slate-700/50 text-slate-400 border border-slate-700 hover:bg-slate-700"
                                    }`}
                            >
                                <Link2 className="h-4 w-4 inline-block mr-2" />
                                Manual Link
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfigMode("api")}
                                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${configMode === "api"
                                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                                        : "bg-slate-700/50 text-slate-400 border border-slate-700 hover:bg-slate-700"
                                    }`}
                            >
                                <Key className="h-4 w-4 inline-block mr-2" />
                                API Mode
                            </button>
                        </div>
                    </div>

                    {/* Manual Mode Config */}
                    {configMode === "manual" && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Link2 className="h-4 w-4 text-orange-400" />
                                <span className="text-sm font-medium text-slate-300">Cấu hình Manual Link</span>
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Affiliate ID *</label>
                                <Input
                                    type="text"
                                    placeholder="VD: 17628374291"
                                    value={manualConfig.affiliate_id}
                                    onChange={(e) => setManualConfig({ ...manualConfig, affiliate_id: e.target.value })}
                                    className="bg-slate-900 border-slate-700 text-slate-50 placeholder:text-slate-600"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Default Sub ID (Prefix)</label>
                                <Input
                                    type="text"
                                    placeholder="VD: CKWEB"
                                    value={manualConfig.default_sub_id}
                                    onChange={(e) => setManualConfig({ ...manualConfig, default_sub_id: e.target.value })}
                                    className="bg-slate-900 border-slate-700 text-slate-50 placeholder:text-slate-600"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Format: {manualConfig.default_sub_id || "CK"}_{"<userId>"}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* API Mode Config */}
                    {configMode === "api" && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Key className="h-4 w-4 text-blue-400" />
                                <span className="text-sm font-medium text-slate-300">API Configuration</span>
                            </div>

                            <Input
                                type="text"
                                placeholder="App ID"
                                value={apiConfig.appId}
                                onChange={(e) => setApiConfig({ ...apiConfig, appId: e.target.value })}
                                className="bg-slate-900 border-slate-700 text-slate-50 placeholder:text-slate-600"
                            />
                            <Input
                                type="password"
                                placeholder="API Key"
                                value={apiConfig.apiKey}
                                onChange={(e) => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                                className="bg-slate-900 border-slate-700 text-slate-50 placeholder:text-slate-600"
                            />
                            <Input
                                type="password"
                                placeholder="API Secret"
                                value={apiConfig.apiSecret}
                                onChange={(e) => setApiConfig({ ...apiConfig, apiSecret: e.target.value })}
                                className="bg-slate-900 border-slate-700 text-slate-50 placeholder:text-slate-600"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-400">
                            <X className="h-4 w-4" />
                            {error}
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
                {isEditing ? (
                    <>
                        <Button
                            variant="outline"
                            className="flex-1 border-slate-700 text-slate-300"
                            onClick={onToggleEdit}
                            disabled={isSubmitting}
                        >
                            Hủy
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleSave}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Lưu
                                </>
                            )}
                        </Button>
                    </>
                ) : (
                    <Button
                        variant="outline"
                        className="w-full border-slate-700 text-slate-300 bg-slate-800/30 hover:bg-white hover:text-slate-700"
                        onClick={onToggleEdit}
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        Chỉnh sửa
                    </Button>
                )}
            </div>
        </div>
    );
}

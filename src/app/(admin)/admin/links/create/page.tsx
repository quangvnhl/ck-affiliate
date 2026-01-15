"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Link2,
    Plus,
    Search,
    User,
    Check,
    ChevronsUpDown,
    Loader2,
    X,
    ArrowLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createManualLinkAction } from "@/actions/link-actions";
import {
    searchUsersAction,
    type SearchUserItem,
} from "@/actions/admin-user-actions";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

export default function AdminCreateLinkPage() {
    const router = useRouter();

    // Form state
    const [shortLink, setShortLink] = useState("");
    const [originalUrl, setOriginalUrl] = useState("");
    const [platformId, setPlatformId] = useState<number | undefined>(undefined);
    const [selectedUser, setSelectedUser] = useState<SearchUserItem | null>(null);

    // Search users state
    const [userSearch, setUserSearch] = useState("");
    const [users, setUsers] = useState<SearchUserItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    // Form state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Debounced search
    const debouncedSearch = useDebounce(userSearch, 300);

    // Load users khi search thay đổi
    useEffect(() => {
        const loadUsers = async () => {
            setIsSearching(true);
            const result = await searchUsersAction(debouncedSearch);
            if (result.success && result.data) {
                setUsers(result.data);
            }
            setIsSearching(false);
        };

        if (showUserDropdown) {
            loadUsers();
        }
    }, [debouncedSearch, showUserDropdown]);

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        setIsSubmitting(true);

        const result = await createManualLinkAction({
            shortLink,
            originalUrl: originalUrl || undefined,
            platformId: platformId || undefined,
            userId: selectedUser?.id || null,
        });

        setIsSubmitting(false);

        if (!result.success) {
            setError(result.error || "Đã xảy ra lỗi");
            return;
        }

        // Success - reset form
        setSuccessMessage("Đã thêm link vào hệ thống thành công!");
        setShortLink("");
        setOriginalUrl("");
        setPlatformId(undefined);
        setSelectedUser(null);
        setUserSearch("");

        // Clear success message after 3s
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    className="border-slate-700 text-slate-400 hover:text-slate-50"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-50">Thêm link thủ công</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Thêm link affiliate có sẵn vào hệ thống
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Message */}
                {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/20 p-4 text-red-400">
                        <X className="h-5 w-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Success Message */}
                {successMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/20 p-4 text-green-400">
                        <Check className="h-5 w-5 flex-shrink-0" />
                        {successMessage}
                    </div>
                )}

                {/* Short Link Input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                        Short Link <span className="text-red-400">*</span>
                    </label>
                    <Input
                        type="url"
                        placeholder="https://shope.ee/abc123 hoặc https://vt.tiktok.com/xyz"
                        value={shortLink}
                        onChange={(e) => setShortLink(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-50 placeholder:text-slate-500"
                        required
                    />
                    <p className="text-xs text-slate-500">
                        Link rút gọn từ Shopee hoặc TikTok. Hệ thống sẽ tự động nhận diện sàn.
                    </p>
                </div>

                {/* Original URL Input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                        Original URL <span className="text-slate-500">(Tùy chọn)</span>
                    </label>
                    <Input
                        type="url"
                        placeholder="https://shopee.vn/product/..."
                        value={originalUrl}
                        onChange={(e) => setOriginalUrl(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-50 placeholder:text-slate-500"
                    />
                    <p className="text-xs text-slate-500">
                        Link gốc của sản phẩm. Để trống nếu không có.
                    </p>
                </div>

                {/* Platform Select */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                        Sàn <span className="text-slate-500">(Tự động nhận diện)</span>
                    </label>
                    <select
                        value={platformId || ""}
                        onChange={(e) => setPlatformId(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">-- Tự động nhận diện từ link --</option>
                        <option value="1">Shopee</option>
                        <option value="2">TikTok</option>
                    </select>
                </div>

                {/* User Selection Combobox */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                        Gán cho người dùng <span className="text-slate-500">(Tùy chọn)</span>
                    </label>
                    <div className="relative">
                        {/* Display selected user or search input */}
                        {selectedUser ? (
                            <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                                        {selectedUser.email.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-slate-50">{selectedUser.email}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedUser(null)}
                                    className="rounded p-1 hover:bg-slate-700"
                                >
                                    <X className="h-4 w-4 text-slate-400" />
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder="Tìm kiếm theo email..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    onFocus={() => setShowUserDropdown(true)}
                                    className="pl-10 bg-slate-800 border-slate-700 text-slate-50 placeholder:text-slate-500"
                                />
                                {isSearching && (
                                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                                )}
                            </div>
                        )}

                        {/* Dropdown */}
                        {showUserDropdown && !selectedUser && (
                            <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 shadow-lg max-h-60 overflow-auto">
                                {/* Option: Không gán */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedUser(null);
                                        setShowUserDropdown(false);
                                        setUserSearch("");
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-700"
                                >
                                    <User className="h-4 w-4" />
                                    Không gán người dùng (Orphan Link)
                                </button>

                                <div className="border-t border-slate-700" />

                                {/* Users list */}
                                {users.length === 0 ? (
                                    <div className="px-3 py-4 text-center text-sm text-slate-500">
                                        {isSearching ? "Đang tìm kiếm..." : "Không tìm thấy người dùng"}
                                    </div>
                                ) : (
                                    users.map((user) => (
                                        <button
                                            key={user.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setShowUserDropdown(false);
                                                setUserSearch("");
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-50 hover:bg-slate-700"
                                        >
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                                                {user.email.charAt(0).toUpperCase()}
                                            </div>
                                            {user.email}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-slate-500">
                        Để trống nếu link thuộc về hệ thống (tiền về Admin).
                    </p>
                </div>

                {/* Click away to close dropdown */}
                {showUserDropdown && (
                    <div
                        className="fixed inset-0 z-0"
                        onClick={() => setShowUserDropdown(false)}
                    />
                )}

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1 border-slate-700 text-slate-300"
                        onClick={() => router.back()}
                    >
                        Hủy
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting || !shortLink}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang lưu...
                            </>
                        ) : (
                            <>
                                <Plus className="mr-2 h-4 w-4" />
                                Thêm link
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}

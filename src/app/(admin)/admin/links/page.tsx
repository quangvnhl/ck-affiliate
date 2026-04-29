"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Link2,
  Copy,
  ExternalLink,
  MousePointerClick,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  User,
  UserX,
  Ban,
  Unlock,
  Filter,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminLinksAction, type AdminLinkItem } from "@/actions/admin-link-actions";
import { blockLinkAction, unblockLinkAction } from "@/actions/admin-link-block-actions";
import { formatDate } from "@/lib/utils";

export default function AdminLinksPage() {
  const [links, setLinks] = useState<AdminLinkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const loadLinks = useCallback(async (page: number) => {
    setIsLoading(true);
    const result = await getAdminLinksAction(page, pageSize);
    if (result.success && result.data) {
      setLinks(result.data.links);
      setTotalPages(result.data.totalPages);
      setTotalCount(result.data.totalCount);
      setCurrentPage(result.data.currentPage);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadLinks(1);
  }, [loadLinks]);

  const handleCopy = async (link: string, id: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getPlatformName = (platformId: number | null) => {
    if (platformId === 1) return "Shopee";
    if (platformId === 2) return "TikTok";
    return "Unknown";
  };

  const getPlatformColor = (platformId: number | null) => {
    if (platformId === 1) return "bg-orange-700/50 border border-orange-700 text-orange-300";
    if (platformId === 2) return "bg-slate-100 text-slate-700";
    return "bg-slate-100 text-slate-600";
  };

  const getSubId = (trackingUrl: string) => {
    try {
      const url = new URL(trackingUrl);
      return url.searchParams.get("sub_id") || "";
    } catch {
      return "";
    }
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Quản lý Links</h1>
        <p className="mt-1 text-slate-600">
          Tất cả links được tạo trong hệ thống ({totalCount} links)
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-800 p-4 bg-emerald-950 shadow-sm">
          <p className="text-sm ">Tổng số link</p>
          <p className="text-2xl font-bold">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-pink-800 p-4 bg-pink-950 shadow-sm">
          <p className="text-sm">Trang hiện tại</p>
          <p className="text-2xl font-bold">{currentPage} / {totalPages}</p>
        </div>
        <div className="rounded-xl border border-amber-800 p-4 bg-amber-950 shadow-sm">
          <p className="text-sm">Hiển thị</p>
          <p className="text-2xl font-bold">{links.length} links</p>
        </div>
      </div>

      {/* Links Table */}
      {links.length === 0 ? (
        <div className="rounded-xl border border-slate-700 p-12 text-center shadow-sm">
          <Link2 className="mx-auto h-12 w-12" />
          <h3 className="mt-4 text-lg font-medium">
            Chưa có link nào
          </h3>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Platform</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Links</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">SubId</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tạo bởi</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Clicks</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Thời gian</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {links.map((link) => (
                  <tr key={link.id} className="hover:bg-slate-800">
                    {/* Platform */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getPlatformColor(link.platformId)}`}>
                        {getPlatformName(link.platformId)}
                      </span>
                    </td>

                    {/* Links */}
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3 max-w-[350px]">
                        {link.metaData?.scrapeImage && (
                          <img 
                            src={`https://cf.shopee.vn/file/${link.metaData.scrapeImage}`} 
                            alt="" 
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="space-y-1 min-w-0">
                          {(link.metaData?.scrapeTitle || link.metaData?.title) && (
                            <p className="text-sm text-white font-medium truncate" title={String(link.metaData.scrapeTitle || link.metaData.title)}>
                              {link.metaData.scrapeTitle || link.metaData.title}
                            </p>
                          )}
                          <p className="text-sm text-amber-400 font-medium truncate" title={link.shortLink}>
                            <a href={link.shortLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {link.shortLink}
                              <ExternalLink className="inline-block h-3 w-3 ml-1" />
                            </a>
                          </p>
                          <p className="text-xs text-slate-400 truncate" title={link.originalUrl}>
                            <a href={link.originalUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {link.originalUrl}
                              <ExternalLink className="inline-block h-3 w-3 ml-1" />
                            </a>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* SubId */}
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-700 text-blue-100 px-2 py-1 rounded font-mono">
                        {getSubId(link.trackingUrl) || "—"}
                      </span>
                    </td>

                    {/* Created By */}
                    <td className="px-4 py-3">
                      {link.userId ? (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-sm text-slate-50">
                            {link.userEmail || "User"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <UserX className="h-3.5 w-3.5 text-slate-50" />
                          <span className="text-xs text-slate-400 font-mono truncate max-w-[100px]" title={link.guestSessionId || ""}>
                            {link.guestSessionId ? `Guest` : "—"}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Clicks */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-slate-600">
                        <MousePointerClick className="h-3.5 w-3.5" />
                        <span className="text-sm font-medium">{link.clicks}</span>
                      </div>
                    </td>

                    {/* Created At */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500">{formatDate(link.createdAt)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleCopy(link.shortLink, link.id)}
                          className="rounded-lg p-1.5 hover:bg-slate-100"
                          title="Copy link"
                        >
                          {copiedId === link.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                        <a
                          href={link.shortLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-1.5 hover:bg-slate-100"
                          title="Mở link"
                        >
                          <ExternalLink className="h-4 w-4 text-slate-400" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700 bg-slate-900">
              <p className="text-sm text-slate-600">
                Trang {currentPage} / {totalPages} ({totalCount} links)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadLinks(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="border-slate-600 text-slate-300 bg-slate-700 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Trước
                </Button>
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const startPage = Math.max(1, currentPage - 2);
                  const page = startPage + i;
                  if (page > totalPages) return null;
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => loadLinks(page)}
                      className={page === currentPage
                        ? "min-w-[36px] bg-amber-600 hover:bg-amber-700 text-white"
                        : "min-w-[36px] border-slate-600 text-slate-300 bg-slate-700 hover:bg-slate-800 hover:text-slate-100"
                      }
                    >
                      {page}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadLinks(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="border-slate-600 text-slate-300 bg-slate-700 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-40"
                >
                  Sau
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

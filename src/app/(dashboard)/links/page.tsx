"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Link2,
  Copy,
  ExternalLink,
  MousePointerClick,
  Plus,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getUserLinksAction, type UserLinksResult } from "@/actions/link-actions";
import { formatDate } from "@/lib/utils";
import { or } from 'drizzle-orm';

interface LinkItem {
  id: string;
  originalUrl: string;
  shortLink: string;
  trackingUrl: string;
  clicks: number;
  createdAt: Date;
  platformId: number | null;
  metaData: {
    scrapeImage?: string;
    scrapeTitle?: string;
    originalInputUrl?: string;
    title?: string;
    resolvedUrl?: string;
  } | null;
}

export default function LinksPage() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const loadLinks = useCallback(async (page: number) => {
    setIsLoading(true);
    const result = await getUserLinksAction(page, pageSize);
    if (result.success && result.data) {
      setLinks(result.data.links as LinkItem[]);
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
    if (platformId === 1) return "bg-orange-700/50 border border-orange-500 text-orange-100";
    if (platformId === 2) return "bg-slate-100 text-slate-700";
    return "bg-slate-100 text-slate-600";
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
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Link của tôi</h1>
          <p className="mt-1 text-slate-600">
            Quản lý các link affiliate đã tạo
          </p>
        </div>
        <Link href="/">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Tạo link mới
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Tổng số link</p>
          <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Tổng clicks</p>
          <p className="text-2xl font-bold text-slate-900">
            {links.reduce((sum, l) => sum + l.clicks, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Trang hiện tại</p>
          <p className="text-2xl font-bold text-slate-900">
            {currentPage} / {totalPages}
          </p>
        </div>
      </div>

      {/* Links List */}
      {links.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Link2 className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-medium text-slate-900">
            Chưa có link nào
          </h3>
          <p className="mt-2 text-slate-600">
            Bắt đầu tạo link affiliate để kiếm tiền từ Shopee & TikTok
          </p>
          <Link href="/">
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Tạo link đầu tiên
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 hover:bg-slate-50"
              >
                <div className="flex-1 min-w-0">
                  {/* Platform Badge */}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getPlatformColor(link.platformId)}`}
                  >
                    {getPlatformName(link.platformId)}
                  </span>

                  {/* Image + Title */}
                  <div className="mt-2 md:flex md:items-start md:gap-3">
                    {link.metaData?.scrapeImage && (
                      <img
                        src={`https://cf.shopee.vn/file/${link.metaData.scrapeImage}`}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      {(link.metaData?.scrapeTitle || link.metaData?.title) && (
                        <p className="text-sm font-medium text-slate-900">
                          {link.metaData.scrapeTitle || link.metaData.title}
                        </p>
                      )}
                      {/* Short Link */}
                      <div className="mt-1 flex items-center gap-2">
                        <p className="font-medium text-amber-600 break-all text-ellipsis overflow-hidden line-clamp-2">
                          {link.shortLink}
                        </p>
                        <button
                          onClick={() => handleCopy(link.shortLink, link.id)}
                          className="flex-shrink-0 rounded-lg p-1.5 hover:bg-slate-100"
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
                          className="flex-shrink-0 rounded-lg p-1.5 hover:bg-slate-100"
                          title="Mở link"
                        >
                          <ExternalLink className="h-4 w-4 text-slate-400" />
                        </a>
                      </div>

                      {/* Original URL */}
                      <div className="mt-1 flex items-center gap-2">
                        <p className="font-medium text-amber-600 break-all text-ellipsis overflow-hidden line-clamp-2">
                          {link.originalUrl.substring(0, 50)}
                          {link.originalUrl.length > 50 ? "..." : ""}
                          {link.originalUrl.length > 50 ? link.originalUrl.substring(link.originalUrl.length - 50 < 50 ? 50 : link.originalUrl.length - 50, link.originalUrl.length) : ""}
                        </p>
                        <button
                          onClick={() => handleCopy(link.originalUrl, link.id)}
                          className="flex-shrink-0 rounded-lg p-1.5 hover:bg-slate-100"
                          title="Copy link"
                        >
                          {copiedId === link.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                        <a
                          href={link.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 rounded-lg p-1.5 hover:bg-slate-100"
                          title="Mở link"
                        >
                          <ExternalLink className="h-4 w-4 text-slate-400" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* SubId */}
                  <p className="mt-2 flex items-center gap-2 flex-wrap">
                    {(() => {
                      try {
                        const url = new URL(link.trackingUrl);
                        const subId = url.searchParams.get("sub_id");
                        return subId ? (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-mono">
                            {subId}
                          </span>
                        ) : null;
                      } catch { return null; }
                    })()}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <MousePointerClick className="h-4 w-4" />
                    <span className="font-medium">{link.clicks}</span>
                    <span>clicks</span>
                  </div>
                  <Link href={`/links/${link.id}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                    <FileText className="h-4 w-4" />
                    <span>Chi tiết</span>
                  </Link>
                  <div className="text-slate-500">
                    {formatDate(link.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="md:flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-600 mb-2 md:mb-0">
                Trang {currentPage} / {totalPages} ({totalCount} links)
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start  gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadLinks(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 w-full md:w-auto flex-none md:flex-initial mb-2 md:mb-0"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Trước
                </Button>
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
                        : "min-w-[36px] border-slate-300 text-slate-600 hover:bg-slate-100"
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
                  className="border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40  w-full md:w-auto flex-none md:flex-initial mt-2 md:mt-0"
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
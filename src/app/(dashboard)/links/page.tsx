"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Link2,
  Copy,
  ExternalLink,
  MousePointerClick,
  Plus,
  Loader2,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getUserLinksAction } from "@/actions/link-actions";
import { formatDate } from "@/lib/utils";

interface LinkItem {
  id: string;
  originalUrl: string;
  shortLink: string;
  clicks: number;
  createdAt: Date;
  platformId: number | null;
}

export default function LinksPage() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadLinks() {
      const result = await getUserLinksAction();
      if (result.success && result.data) {
        setLinks(result.data as LinkItem[]);
      }
      setIsLoading(false);
    }
    loadLinks();
  }, []);

  const handleCopy = async (link: string, id: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper để lấy platform name
  const getPlatformName = (platformId: number | null) => {
    if (platformId === 1) return "Shopee";
    if (platformId === 2) return "TikTok";
    return "Unknown";
  };

  const getPlatformColor = (platformId: number | null) => {
    if (platformId === 1) return "bg-orange-100 text-orange-700";
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Tổng số link</p>
          <p className="text-2xl font-bold text-slate-900">{links.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Tổng clicks</p>
          <p className="text-2xl font-bold text-slate-900">
            {links.reduce((sum, l) => sum + l.clicks, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Link hôm nay</p>
          <p className="text-2xl font-bold text-slate-900">
            {links.filter(l => {
              const today = new Date().toDateString();
              return new Date(l.createdAt).toDateString() === today;
            }).length}
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

                  {/* Short Link */}
                  <div className="mt-2 flex items-center gap-2">
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
                  <p className="mt-1 text-sm text-slate-500 break-all text-ellipsis overflow-hidden line-clamp-2">
                    {link.originalUrl}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <MousePointerClick className="h-4 w-4" />
                    <span className="font-medium">{link.clicks}</span>
                    <span>clicks</span>
                  </div>
                  <div className="text-slate-500">
                    {formatDate(link.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

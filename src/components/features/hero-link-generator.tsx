"use client";

import { useState, useTransition, useCallback } from "react";
import { Link2, ArrowRight, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useLinkStore } from "@/store/use-link-store";
import { createLinkAction } from "@/actions/link-actions";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

// ============================================
// COMPONENT: HeroLinkGenerator
// ============================================

export function HeroLinkGenerator() {
  // Local state
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Zustand store
  const {
    generatedLink,
    setGeneratedLink,
    addToHistory,
    getOrCreateGuestSessionId
  } = useLinkStore();

  // Handle paste - trim whitespace
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").trim();
    setInputValue(pastedText);
    setError(null);
  }, []);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setError(null);
  }, []);

  // Handle submit
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!inputValue.trim()) {
      setError("Vui lòng nhập link sản phẩm");
      return;
    }

    // Reset state
    setError(null);
    setGeneratedLink(null);

    startTransition(async () => {
      try {
        // Lấy hoặc tạo guest session ID
        const guestSessionId = getOrCreateGuestSessionId();

        // Tạo FormData
        const formData = new FormData();
        formData.append("originalUrl", inputValue.trim());
        formData.append("guestSessionId", guestSessionId);

        // Gọi server action
        const result = await createLinkAction(formData);

        if (result.success && result.data) {
          setGeneratedLink(result.data);
          addToHistory(result.data);
          toast.success("Tạo link thành công!");
        } else {
          setError(result.error || "Không thể tạo link");
          toast.error(result.error || "Không thể tạo link");
        }
      } catch (err) {
        console.error("Submit error:", err);
        setError("Đã xảy ra lỗi, vui lòng thử lại");
        toast.error("Đã xảy ra lỗi, vui lòng thử lại");
      }
    });
  }, [inputValue, getOrCreateGuestSessionId, setGeneratedLink, addToHistory]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  }, [handleSubmit]);

  // Handle copy
  const handleCopy = useCallback(async () => {
    if (!generatedLink?.shortLink) return;

    try {
      await navigator.clipboard.writeText(generatedLink.shortLink);
      setCopied(true);
      toast.success("Đã copy link!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể copy link");
    }
  }, [generatedLink?.shortLink]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Headline */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
          Tạo Link Tiếp Thị
        </h1>
        <p className="text-lg text-slate-600">
          Dán link Shopee/TikTok - Nhận hoa hồng ngay lập tức
        </p>
      </div>

      {/* Input Section */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            "relative flex items-center w-full shadow-lg rounded-full overflow-hidden border-2 transition-colors bg-white",
            error ? "border-red-500" : "border-transparent focus-within:border-amber-500"
          )}
        >
          {/* Icon */}
          <div className="absolute left-4 text-slate-400">
            <Link2 className="h-5 w-5" />
          </div>

          {/* Input */}
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="Dán link sản phẩm vào đây (VD: https://shopee.vn/...)"
            className="w-full h-14 pl-12 pr-36 outline-none text-slate-900 md:text-lg bg-transparent"
            disabled={isPending}
          />

          {/* Button */}
          <Button
            type="submit"
            disabled={isPending || !inputValue.trim()}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-6 rounded-full font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-all active:scale-95"
          >
            {isPending ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <ArrowRight className="h-5 w-5 md:hidden" />
            )}
            <span className="hidden md:inline">
              {isPending ? "Đang tạo..." : "Tạo Link"}
            </span>
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
        )}
      </form>

      {/* Platform badges */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
          Shopee
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-900 text-white">
          TikTok Shop
        </span>
      </div>

      {/* Result Card */}
      {generatedLink && (
        <div className="mt-8 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">
                Link đã tạo thành công
              </span>
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                generatedLink.platform === "shopee"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-slate-900 text-white"
              )}>
                {generatedLink.platform === "shopee" ? "Shopee" : "TikTok"}
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="p-4">
            {/* Short Link */}
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <input
                type="text"
                value={generatedLink.shortLink}
                readOnly
                className="flex-1 bg-transparent text-sm font-mono text-slate-700 outline-none"
              />
              <Button
                size="sm"
                variant={copied ? "secondary" : "default"}
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            {/* Product Info */}
            {generatedLink.productInfo && (
              <div className="mt-4 flex gap-4">
                {/* Product Image */}
                <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden shrink-0">
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Link2 className="h-8 w-8" />
                  </div>
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 truncate">
                    {generatedLink.productInfo.name}
                  </h3>
                  <p className="text-lg font-bold text-amber-600 mt-1">
                    {formatCurrency(generatedLink.productInfo.price)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">
                      Hoa hồng: {generatedLink.productInfo.commission}%
                    </span>
                    <span className="text-xs font-medium text-green-600">
                      ~{formatCurrency(generatedLink.productInfo.cashback)} hoàn
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <a
              href={generatedLink.shortLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-amber-600 hover:text-amber-700"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Mở link
            </a>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setGeneratedLink(null);
                  setInputValue("");
                }}
              >
                Tạo link mới
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Notice */}
      <p className="mt-6 text-center text-sm text-slate-500">
        Tạo link miễn phí, không cần đăng nhập.{" "}
        <a href="/register" className="text-amber-600 hover:underline">
          Đăng ký
        </a>{" "}
        để theo dõi hoa hồng và rút tiền.
      </p>
    </div>
  );
}

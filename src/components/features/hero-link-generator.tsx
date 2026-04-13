"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { Link2, ArrowRight, Copy, Check, ExternalLink, X, ShoppingCart, Smartphone, Monitor, Clipboard, Share2, Info } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useLinkStore } from "@/store/use-link-store";
import { createLinkAction, type CreateLinkResult } from "@/actions/link-actions";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";

export interface ScrapeResult {
  status: "success" | "error";
  data?: {
    title: string;
    image: string;
    shop_id: string;
    product_id: string;
    target_url: string;
    price?: number;
    commission?: number;
  };
}

// ============================================
// COMPONENT: HeroLinkGenerator
// ============================================

export function HeroLinkGenerator() {
  // Local state
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Scraper & Background states
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeData, setScrapeData] = useState<ScrapeResult["data"] | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [bgGeneratedLink, setBgGeneratedLink] = useState<CreateLinkResult | null>(null);

  // Zustand store
  const {
    generatedLink,
    setGeneratedLink,
    addToHistory,
    getOrCreateGuestSessionId
  } = useLinkStore();

  const resetBackgroundStates = useCallback(() => {
    setScrapeData(null);
    setScrapeError(null);
    setBgGeneratedLink(null);
    setGeneratedLink(null);
  }, [setGeneratedLink]);

  const generateLinkInBackground = useCallback(async (targetUrl: string, apiMetadata?: ScrapeResult["data"], rawInputUrl?: string) => {
    try {
      const guestSessionId = getOrCreateGuestSessionId();
      const formData = new FormData();
      formData.append("originalUrl", targetUrl);
      formData.append("guestSessionId", guestSessionId);
      formData.append("linkMode", "standard");

      // Append metadata
      if (rawInputUrl) formData.append("rawUrl", rawInputUrl);
      if (apiMetadata?.title) formData.append("scrapeTitle", apiMetadata.title);
      if (apiMetadata?.image) formData.append("scrapeImage", apiMetadata.image);

      const result = await createLinkAction(formData);
      if (result.success && result.data) {
        setBgGeneratedLink(result.data);
      }
    } catch (err) {
      console.error("BG gen error:", err);
    }
  }, [getOrCreateGuestSessionId]);

  const fetchScrapeData = useCallback(async (url: string) => {
    setIsScraping(true);
    resetBackgroundStates();

    try {
      const res = await fetch(`https://shpe-sc.cukinacha.com/scrape?url=${encodeURIComponent(url)}`);
      const data: ScrapeResult = await res.json();
      console.log(data);
      if (data.status === "success" && data.data) {
        if (data.data.title === "Not found") {
          setScrapeError("Link không hợp lệ hoặc Không tìm thấy thông tin sản phẩm.");
        } else {
          setScrapeData(data.data);
          // Kick off background generation using the target URL and metadata
          generateLinkInBackground(data.data.target_url, data.data, url);
        }
      } else {
        setScrapeError("Lỗi hệ thống khi tải dữ liệu sản phẩm bên thứ 3.");
      }
    } catch (error) {
      console.error("Scrape API Error:", error);
      setScrapeError("Không thể kết nối đến máy chủ Get Data.");
    } finally {
      setIsScraping(false);
    }
  }, [resetBackgroundStates, generateLinkInBackground]);

  // Handle paste - trim whitespace
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text").trim();
    if (pastedText) {
      setInputValue(pastedText);
      setError(null);
      if (pastedText.startsWith("http")) {
        fetchScrapeData(pastedText);
      } else {
        resetBackgroundStates();
      }
    }
  }, [fetchScrapeData, resetBackgroundStates]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setInputValue(url);
    setError(null);
    if (url.startsWith('http')) {
      fetchScrapeData(url);
    } else {
      resetBackgroundStates();
    }
  }, [fetchScrapeData, resetBackgroundStates]);

  // Handle submit
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!inputValue.trim()) {
      setError("Vui lòng nhập link sản phẩm");
      return;
    }

    if (scrapeError) {
      setError(scrapeError);
      return;
    }

    if (isScraping) {
      toast.info("Vui lòng đợi tải thông tin sản phẩm...");
      return;
    }

    setError(null);

    // If already generated in background, just show it
    if (bgGeneratedLink) {
      setGeneratedLink(bgGeneratedLink);
      addToHistory(bgGeneratedLink);
      toast.success("Tạo link thành công!");
      return;
    }

    // Fallback if background creation failed or input changed
    startTransition(async () => {
      try {
        const guestSessionId = getOrCreateGuestSessionId();
        const formData = new FormData();
        // If we have API data, use target_url, else use original input
        formData.append("originalUrl", scrapeData?.target_url || inputValue.trim());
        formData.append("guestSessionId", guestSessionId);
        formData.append("linkMode", "standard");

        if (scrapeData) {
          formData.append("rawUrl", inputValue.trim());
          if (scrapeData.title) formData.append("scrapeTitle", scrapeData.title);
          if (scrapeData.image) formData.append("scrapeImage", scrapeData.image);
        }

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
  }, [inputValue, isScraping, scrapeData, scrapeError, bgGeneratedLink, getOrCreateGuestSessionId, setGeneratedLink, addToHistory]);

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

  // Handle paste from clipboard button
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputValue(text.trim());
        setError(null);
        toast.success("Đã dán link!");
        if (text.trim().startsWith("http")) {
          fetchScrapeData(text.trim());
        } else {
          resetBackgroundStates();
        }
      }
    } catch {
      toast.error("Không thể đọc clipboard. Vui lòng dán thủ công.");
    }
  }, [fetchScrapeData, resetBackgroundStates]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Headline */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white">
          Hoàn tiền tự động
        </h1>
        <div className="md:text-lg text-base text-amber-200 md:flex items-center gap-2 justify-center">
          <div className="md:block">Dán link Shopee/TikTok</div>
          <div className="md:block hidden">-</div>
          <div className="md:block">Nhận hoa hồng ngay lập tức</div>
        </div>
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
          <div className="absolute left-4 text-slate-400 sm:block hidden">
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
            className="w-full h-14 sm:pl-12 pl-6 sm:pr-48 pr-24 outline-none text-slate-900 md:text-lg bg-transparent"
            disabled={isPending}
          />

          {/* Clear Button */}
          {inputValue && (
            <button
              type="button"
              onClick={() => {
                setInputValue("");
                setError(null);
              }}
              className="absolute md:right-32 sm:right-24 right-16 p-1 text-slate-400 hover:text-slate-600 transition-colors"
              disabled={isPending}
            >
              <X className="h-5 w-5" />
            </button>
          )}

          {/* Button - Paste when empty, Submit when has value */}
          {inputValue.trim() ? (
            <Button
              type="submit"
              disabled={isPending}
              className="absolute right-2 sm:px-7 px-4 rounded-full font-semibold text-white bg-amber-500 hover:bg-amber-700 transition-all active:scale-95"
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
          ) : (
            <Button
              type="button"
              onClick={handlePasteFromClipboard}
              className="absolute right-2 sm:px-7 px-4 rounded-full font-semibold text-white bg-orange-600 hover:bg-slate-700 transition-all active:scale-95"
            >
              <Clipboard className="h-5 w-5 md:mr-2" />
              <span className="hidden md:inline">Dán link</span>
            </Button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
        )}
      </form>

      {/* Preview Section */}
      {(isScraping || scrapeData || scrapeError) && (
        <div className="mt-4 p-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 animate-in fade-in slide-in-from-top-2 duration-300">
          {isScraping ? (
            <div className="flex gap-4 animate-pulse">
              <div className="w-20 h-20 bg-slate-200 rounded-lg shrink-0"></div>
              <div className="flex-1 space-y-3 py-2">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
          ) : scrapeError ? (
            <p className="text-sm text-red-500 flex items-center justify-center gap-2 font-medium">
              <Info className="h-4 w-4" />
              {scrapeError}
            </p>
          ) : scrapeData ? (
            <div className="flex gap-4">
              <img
                src={`https://cf.shopee.vn/file/${scrapeData.image}`}
                alt={scrapeData.title}
                className="w-20 h-20 object-cover rounded-lg shrink-0 border border-slate-100 shadow-sm"
              />
              <div className="flex-1 py-1 flex flex-col justify-between">
                <p className="text-sm font-semibold text-slate-800 line-clamp-2">
                  {scrapeData.title}
                </p>
                {scrapeData.commission && scrapeData.commission > 0 ? (
                  <p className="text-sm font-medium text-emerald-600 pb-1 flex items-center gap-1">
                    <span className="text-base text-emerald-500">💰</span> Hoàn lại cho bạn: {formatCurrency(scrapeData.commission)}
                  </p>
                ) : scrapeData.price ? (
                  <p className="text-sm font-bold text-red-500 pb-1">
                    {formatCurrency(scrapeData.price)}
                  </p>
                ) : (
                  <div className="text-xs text-slate-500 font-medium pb-1 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5 text-green-500" /> Thông tin sản phẩm
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Platform badges */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <div className="text-white text-sm flex-none sm:flex-1 sm:block hidden">Tự động nhận diện:</div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
          <Image src="https://img.icons8.com/?size=32&id=mBkyWceUPlkM&format=png" alt="Shopee" width={20} height={20} />
          Shopee
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
          <Image src="https://img.icons8.com/?size=32&id=p6TjI8xRp5qI&format=png" alt="Shopee" width={20} height={20} />
          Shopee Food
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-900 text-white">
          <Image src="https://img.icons8.com/?size=32&id=118640&format=png" alt="Shopee" width={20} height={20} />
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

            {/* Product Title */}
            {generatedLink.productTitle && (
              <div className="mt-4 p-3 bg-slate-100 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-800 line-clamp-2">
                  📦 {generatedLink.productTitle}
                </p>
              </div>
            )}

            {/* Open Link Button - use trackingUrl in quick mode */}
            <a
              href={generatedLink.trackingUrl || generatedLink.shortLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-3 w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-lg rounded-lg transition-colors"
            >
              <ShoppingCart className="h-6 w-6" />
              Mở để mua hàng
            </a>

            {/* Share Button */}
            <button
              onClick={async () => {
                const shareUrl = generatedLink.trackingUrl || generatedLink.shortLink;
                const shareTitle = generatedLink.productTitle || "Xem sản phẩm này!";
                if (navigator.share) {
                  try {
                    await navigator.share({ title: shareTitle, url: shareUrl });
                  } catch (err) {
                    // User cancelled share
                  }
                } else {
                  await navigator.clipboard.writeText(shareUrl);
                  toast.success("Đã copy link để chia sẻ!");
                }
              }}
              className="mt-2 flex items-center justify-center gap-2 w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
            >
              <Share2 className="h-5 w-5" />
              Chia sẻ
            </button>



            {/* Instruction Section */}
            <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
              {/* Guide Text */}
              <p className="text-sm text-slate-700 leading-relaxed mb-4">
                💸 Chúng tôi không bán hàng, chúng tôi trả lại % hoa hồng cho bạn.
                <br />
                👌 Hãy đảm bảo rằng <strong className="text-amber-700">Giỏ Hàng</strong> của bạn đang không có sản phẩm này trong giỏ hàng.
                <br />
                👌 Nếu có sản phẩm này trong <strong className="text-amber-700">Giỏ Hàng</strong>, hãy xóa nó đi và quay lại đây bấm vào <strong className="text-amber-700">Mở để mua hàng</strong>, sau đó bạn có thể <strong className="text-amber-700">Mua luôn</strong> hoặc <strong className="text-amber-700">Thêm vào giỏ</strong> trên sàn TMĐT.
              </p>

              {/* Mobile Guide */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="h-5 w-5 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Trên điện thoại</span>
                </div>
                <div className="rounded-lg overflow-hidden border border-slate-200">
                  <Image
                    src="/images/add-cart-mobile.png"
                    alt="Hướng dẫn thêm vào giỏ trên mobile"
                    width={600}
                    height={400}
                    className="w-full h-auto"
                  />
                </div>
              </div>

              {/* PC Guide */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="h-5 w-5 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Trên máy tính</span>
                </div>
                <div className="rounded-lg overflow-hidden border border-slate-200">
                  <Image
                    src="/images/add-cart-pc.png"
                    alt="Hướng dẫn thêm vào giỏ trên PC"
                    width={600}
                    height={400}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
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
      <p className="mt-6 text-center text-sm text-white">
        Tạo link miễn phí, không cần đăng nhập.{" "}
        <a href="/register" className="text-amber-200 hover:underline">
          Đăng ký
        </a>{" "}
        để theo dõi hoa hồng và rút tiền.
      </p>
    </div>
  );
}

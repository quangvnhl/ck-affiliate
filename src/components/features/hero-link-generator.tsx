"use client";

import { useState, useTransition, useCallback } from "react";
import { Link2, ArrowRight, Copy, Check, ExternalLink, X, ShoppingCart, Smartphone, Monitor, Clipboard } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useLinkStore } from "@/store/use-link-store";
import { createLinkAction } from "@/actions/link-actions";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";

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

  // Handle paste from clipboard button
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputValue(text.trim());
        setError(null);
        toast.success("Đã dán link!");
      }
    } catch {
      toast.error("Không thể đọc clipboard. Vui lòng dán thủ công.");
    }
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Headline */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white">
          Tạo Link Tiếp Thị
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

            {/* Open Link Button */}
            <a
              href={generatedLink.shortLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-3 w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-lg rounded-lg transition-colors"
            >
              <ShoppingCart className="h-6 w-6" />
              Mở để mua hàng
            </a>

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

import type { Result } from "@/types";
import { db } from "@/db";
import { platforms, affiliateLinks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";

// Alphanumeric only alphabet (no _ or -)
const ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// ============================================
// TYPES & INTERFACES
// ============================================

export type PlatformType = "shopee" | "tiktok";

// Thông tin sản phẩm
export interface ProductInfo {
  name: string;
  price: number;
  image: string;
  commission: number; // % hoa hồng
  cashback: number;   // Số tiền cashback ước tính
}

// Kết quả tạo link
export interface GeneratedLinkResult {
  shortLink: string;     // Internal short URL (e.g., https://domain.com/abc12)
  trackingUrl: string;   // Platform affiliate URL (the actual redirect target)
  code: string;          // 5-char unique code for internal shortener
  originalUrl: string;
  resolvedUrl?: string;  // Final URL after following all redirects
  platform: PlatformType;
  subId: string;
  productInfo?: ProductInfo;
  estCommission?: number; // Estimated commission from Shopee API (VND)
  productTitle?: string;  // Product title scraped from originalUrl
  metaData?: Record<string, unknown>; // Metadata to store in DB
}

// Đơn hàng từ API sàn
export interface PlatformOrder {
  orderId: string;
  amount: number;
  commission: number;
  status: "pending" | "completed" | "cancelled";
  subId: string;
  createdAt: Date;
}

// ============================================
// INTERFACE: IAffiliateAdapter
// Mỗi sàn (Shopee, TikTok) sẽ implement interface này
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IAffiliateAdapter {
  readonly platform: PlatformType;

  /**
   * Tạo link affiliate rút gọn
   * @param url - URL gốc sản phẩm
   * @param subId - Tracking ID (format: userId_timestamp)
   * @param config - Optional platform config từ database
   */
  generateLink(url: string, subId: string, config?: Record<string, unknown>): Promise<AdapterLinkResult>;

  /**
   * Lấy danh sách đơn hàng từ API sàn
   * @param fromDate - Ngày bắt đầu
   * @param toDate - Ngày kết thúc
   */
  fetchOrders(fromDate: Date, toDate: Date): Promise<PlatformOrder[]>;

  /**
   * Lấy thông tin sản phẩm từ URL
   * @param url - URL sản phẩm
   */
  getProductInfo(url: string): Promise<ProductInfo | undefined>;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Xác định platform dựa trên URL
 */
export function detectPlatform(url: string): PlatformType | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // Shopee domains (including app short links and ShopeeFood)
    if (
      hostname.includes("shopee.vn") ||
      hostname.includes("shopeefood.vn") ||
      hostname.includes("shope.ee") ||
      hostname.includes("shp.ee") ||
      hostname.includes("vn.shp.ee")
    ) {
      return "shopee";
    }

    // TikTok domains
    if (hostname.includes("tiktok.com") || hostname.includes("vt.tiktok.com")) {
      return "tiktok";
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Tạo sub_id cho tracking
 * Format: {userId hoặc guestId}_{timestamp}
 */
export function generateSubId(userId?: string, guestSessionId?: string): string {
  const identifier = userId || guestSessionId || "anon";
  const timestamp = Date.now().toString(36); // Base36 cho ngắn gọn
  return `${identifier.slice(0, 8)}_${timestamp}`;
}

/**
 * Giả lập độ trễ API (500-1500ms)
 */
function simulateApiDelay(): Promise<void> {
  const delay = Math.random() * 1000 + 500;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Generate a unique short code for internal shortener
 * Uses nanoid with collision check against database
 */
async function generateUniqueCode(length: number = 5): Promise<string> {
  const maxAttempts = 10;
  const generateCode = customAlphabet(ALPHANUMERIC, length);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateCode();

    // Check for collision in database
    const existing = await db.query.affiliateLinks.findFirst({
      where: eq(affiliateLinks.code, code),
      columns: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  // Fallback: use longer code to reduce collision probability
  const fallbackGenerator = customAlphabet(ALPHANUMERIC, length + 3);
  return fallbackGenerator();
}

// ============================================
// CLASS: ShopeeAdapter
// Adapter cho Shopee Affiliate API
// ============================================

// Interface cho api_config từ bảng platforms
export interface ShopeePlatformConfig {
  mode: "api" | "manual";
  affiliate_id?: string;
  default_sub_id?: string;
  app_id?: string;
  secret?: string;
}

// Result type for adapter generateLink
export interface AdapterLinkResult {
  shortLink: string;    // Link for "Mở để mua hàng" button
  originalUrl: string;  // Original long URL from platform
  cleanUrl: string;     // URL without query params
  trackingUrl: string;  // URL with affiliate tracking params
}

export class ShopeeAdapter implements IAffiliateAdapter {
  readonly platform: PlatformType = "shopee";

  // Config từ environment (dùng cho API mode)
  private readonly appId?: string;
  private readonly apiKey?: string;
  private readonly apiSecret?: string;

  constructor() {
    // Load config từ env (optional cho mock mode)
    this.appId = process.env.SHOPEE_APP_ID;
    this.apiKey = process.env.SHOPEE_API_KEY;
    this.apiSecret = process.env.SHOPEE_API_SECRET;
  }

  /**
   * Tạo link affiliate Shopee
   * Hỗ trợ 2 mode: Manual và Mock API
   * @param url - URL gốc sản phẩm (có thể là link rút gọn)
   * @param subId - Tracking ID (userId hoặc guestId)
   * @param config - Optional config từ bảng platforms
   */
  async generateLink(url: string, subId: string, config?: Record<string, unknown>): Promise<AdapterLinkResult> {
    // Simulate API delay
    await simulateApiDelay();

    // Cast config về ShopeePlatformConfig nếu có
    const shopeeConfig = config as ShopeePlatformConfig | undefined;

    // System Default mode - resolve short links first
    let cleanUrl = url;
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      if (
        hostname.includes("s.shopee.vn") ||
        hostname.includes("shope.ee") ||
        hostname.includes("shp.ee") ||
        hostname.includes("vn.shp.ee")
      ) {
        console.log("[ShopeeAdapter] Detecting short link, resolving...", url);
        cleanUrl = await resolveAndCleanShopeeUrl(url);
        console.log("[ShopeeAdapter] Resolved to clean URL:", cleanUrl);
      }
    } catch (err) {
      console.error("[ShopeeAdapter] Error checking URL:", err);
    }

    // Kiểm tra mode từ config
    if (shopeeConfig?.mode === "manual" && shopeeConfig.affiliate_id) {
      const trackingUrl = this.generateManualLink(cleanUrl, subId, shopeeConfig);
      return {
        shortLink: trackingUrl,  // In manual mode, shortLink = trackingUrl
        originalUrl: url,
        cleanUrl,
        trackingUrl,
      };
    }

    // API Mode (Mock)
    const trackingUrl = await this.generateApiLink(cleanUrl, subId);
    return {
      shortLink: trackingUrl,
      originalUrl: url,
      cleanUrl,
      trackingUrl,
    };
  }

  /**
   * Remove all query params from URL
   */
  private removeQueryParams(url: string): string {
    try {
      const urlObj = new URL(url);
      urlObj.search = "";
      return urlObj.toString().replace(/\/$/, "");
    } catch {
      return url;
    }
  }

  /**
   * Build tracking URL with affiliate params
   */
  private buildTrackingUrl(cleanUrl: string, config: ShopeePlatformConfig, trackingTag: string): string {
    const encodedUrl = encodeURIComponent(cleanUrl);
    const finalTrackingTag = `${config.default_sub_id || "CK"}_${trackingTag}`;
    return `https://s.shopee.vn/an_redir?origin_link=${encodedUrl}&affiliate_id=${config.affiliate_id}&sub_id=${finalTrackingTag}`;
  }

  /**
   * Tạo link thủ công theo công thức Universal Link
   * Công thức: https://s.shopee.vn/an_redir?origin_link={encoded}&affiliate_id={id}&sub_id={tracking}
   */
  private generateManualLink(url: string, trackingTag: string, config: ShopeePlatformConfig): string {
    // Encode URL gốc
    const encodedUrl = encodeURIComponent(url);

    // Tạo tracking_tag: {default_sub_id}_{tracking_tag}
    const finalTrackingTag = `${config.default_sub_id || "CK"}_${trackingTag}`;

    // Ghép công thức
    return `https://s.shopee.vn/an_redir?origin_link=${encodedUrl}&affiliate_id=${config.affiliate_id}&sub_id=${finalTrackingTag}`;
  }

  /**
   * Tạo link qua API (Mock implementation)
   * Production: Gọi Shopee Affiliate GraphQL API
   */
  private async generateApiLink(url: string, subId: string): Promise<string> {
    // TODO: Khi có API thật, implement GraphQL call theo specs/integration_shopee_api.md
    // const response = await fetch("https://open-api.affiliate.shopee.vn/graphql", {...});

    // Mock implementation
    const randomId = Math.random().toString(36).substring(2, 10);
    return `https://shope.ee/ck${randomId}?sub_id=${subId}`;
  }

  /**
   * Lấy đơn hàng từ Shopee API
   * Mock: Trả về danh sách đơn hàng giả lập
   */
  async fetchOrders(fromDate: Date, toDate: Date): Promise<PlatformOrder[]> {
    await simulateApiDelay();

    // TODO: Khi có API thật:
    // const response = await fetch(`https://affiliate.shopee.vn/api/v1/orders?from=${fromDate}&to=${toDate}`, {
    //   headers: { "Authorization": `Bearer ${this.apiKey}` },
    // });
    // return await response.json();

    // Mock implementation
    const now = Date.now();
    return [
      {
        orderId: `SHOPEE_${now}_001`,
        amount: 500000,
        commission: 25000,
        status: "completed",
        subId: "mock1234_abc",
        createdAt: new Date(),
      },
      {
        orderId: `SHOPEE_${now}_002`,
        amount: 1200000,
        commission: 60000,
        status: "pending",
        subId: "mock5678_def",
        createdAt: new Date(),
      },
    ];
  }

  /**
   * Lấy thông tin sản phẩm Shopee
   */
  async getProductInfo(url: string): Promise<ProductInfo | undefined> {
    // Mock implementation
    return {
      name: "Áo thun unisex cotton form rộng tay lỡ",
      price: 199000,
      image: "https://down-vn.img.susercontent.com/file/sg-11134201-22120-7j6vbpclh3kv61",
      commission: 70,
      cashback: Math.round((199000 * 70) / 100 * 0.1),
    };
  }
}

// ============================================
// CLASS: TiktokAdapter
// Adapter cho TikTok Affiliate API
// ============================================

export class TiktokAdapter implements IAffiliateAdapter {
  readonly platform: PlatformType = "tiktok";

  // Config từ environment
  private readonly appId?: string;
  private readonly apiKey?: string;
  private readonly apiSecret?: string;

  constructor() {
    this.appId = process.env.TIKTOK_APP_ID;
    this.apiKey = process.env.TIKTOK_API_KEY;
    this.apiSecret = process.env.TIKTOK_API_SECRET;
  }

  /**
   * Tạo link affiliate TikTok
   */
  async generateLink(url: string, subId: string): Promise<AdapterLinkResult> {
    await simulateApiDelay();

    // TODO: Khi có API thật:
    // const response = await fetch("https://affiliate-api.tiktok.com/v1/link", {
    //   method: "POST",
    //   headers: { "Authorization": `Bearer ${this.apiKey}` },
    //   body: JSON.stringify({ url, sub_id: subId }),
    // });
    // const data = await response.json();
    // return data.short_link;

    // Mock implementation
    const randomId = Math.random().toString(36).substring(2, 10);
    const trackingUrl = `https://vt.tiktok.com/ck${randomId}?sub_id=${subId}`;

    return {
      shortLink: trackingUrl,
      originalUrl: url,
      cleanUrl: url,
      trackingUrl,
    };
  }

  /**
   * Lấy đơn hàng từ TikTok API
   */
  async fetchOrders(fromDate: Date, toDate: Date): Promise<PlatformOrder[]> {
    await simulateApiDelay();

    // Mock implementation
    const now = Date.now();
    return [
      {
        orderId: `TIKTOK_${now}_001`,
        amount: 350000,
        commission: 17500,
        status: "completed",
        subId: "mock9999_xyz",
        createdAt: new Date(),
      },
    ];
  }

  /**
   * Lấy thông tin sản phẩm TikTok
   */
  async getProductInfo(url: string): Promise<ProductInfo | undefined> {
    return {
      name: "Son môi lì mềm mượt không khô",
      price: 89000,
      image: "https://p16-oec-va.ibyteimg.com/tos-maliva-i-o3syd03w52-us/default.jpeg",
      commission: 70,
      cashback: Math.round((89000 * 70) / 100 * 0.1),
    };
  }
}

// ============================================
// FACTORY: AffiliateAdapterFactory
// Singleton factory để lấy adapter theo platform
// ============================================

class AffiliateAdapterFactoryClass {
  private adapters: Map<PlatformType, IAffiliateAdapter> = new Map();

  /**
   * Lấy adapter theo platform name
   * Sử dụng Singleton pattern - mỗi adapter chỉ khởi tạo 1 lần
   */
  getAdapter(platform: PlatformType): IAffiliateAdapter {
    // Check cache
    const cached = this.adapters.get(platform);
    if (cached) {
      return cached;
    }

    // Tạo adapter mới
    let adapter: IAffiliateAdapter;

    switch (platform) {
      case "shopee":
        adapter = new ShopeeAdapter();
        break;
      case "tiktok":
        adapter = new TiktokAdapter();
        break;
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }

    // Cache và return
    this.adapters.set(platform, adapter);
    return adapter;
  }

  /**
   * Lấy tất cả adapters (dùng cho sync all platforms)
   */
  getAllAdapters(): IAffiliateAdapter[] {
    // Ensure all adapters are initialized
    this.getAdapter("shopee");
    this.getAdapter("tiktok");
    return Array.from(this.adapters.values());
  }
}

// Export singleton instance
export const AffiliateAdapterFactory = new AffiliateAdapterFactoryClass();

// ============================================
// SERVICE FUNCTION (Backward Compatible)
// Dùng Factory thay vì logic cũ
// ============================================

/**
 * Tạo link affiliate rút gọn
 * @param originalUrl - URL gốc sản phẩm
 * @param userId - ID của user (nếu đã đăng nhập)
 * @param guestSessionId - ID của guest session
 * @param affiliateId - Shopee affiliate ID (từ localStorage/cookie)
 */
export async function generateShortLink(
  originalUrl: string,
  userId?: string,
  guestSessionId?: string,
  affiliateId?: string
): Promise<Result<GeneratedLinkResult>> {
  try {
    // 1. Detect platform từ URL
    const platform = detectPlatform(originalUrl);
    if (!platform) {
      return {
        success: false,
        error: "Link không hợp lệ. Chỉ hỗ trợ Shopee và TikTok.",
      };
    }

    // 2. Generate unique code for internal shortener
    const code = await generateUniqueCode(5);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const internalShortLink = `${baseUrl}/${code}`;

    // 3. Resolve redirect chain to get final product URL
    const resolvedUrl = await resolveRedirects(originalUrl);
    const urlForTracking = resolvedUrl !== originalUrl ? resolvedUrl : originalUrl;

    // 4. Create tracking URL với affiliate_id từ params
    const trackingTag = `${code}----`;
    const encodedUrl = encodeURIComponent(urlForTracking);
    
    let trackingUrl: string;

    if (platform === "shopee" && affiliateId) {
      // Shopee: sử dụng Universal Link với affiliate_id từ params
      trackingUrl = `https://s.shopee.vn/an_redir?origin_link=${encodedUrl}&affiliate_id=${affiliateId}&sub_id=${trackingTag}`;
    } else {
      // TikTok hoặc không có affiliate_id: sử dụng adapter
      const adapter = AffiliateAdapterFactory.getAdapter(platform);
      const adapterResult = await adapter.generateLink(urlForTracking, trackingTag);
      trackingUrl = adapterResult.trackingUrl;
    }

    // 5. Fetch title from resolved URL
    const productTitle = await fetchProductTitle(resolvedUrl);

    const metaData: Record<string, unknown> = {
      title: productTitle || undefined,
      resolvedUrl: resolvedUrl !== originalUrl ? resolvedUrl : undefined,
    };

    return {
      success: true,
      data: {
        shortLink: internalShortLink,
        trackingUrl,
        code,
        originalUrl,
        resolvedUrl: resolvedUrl !== originalUrl ? resolvedUrl : undefined,
        platform,
        subId: code,
        productTitle,
        metaData,
      },
    };
  } catch (error) {
    console.error("Generate short link error:", error);

    return {
      success: false,
      error: "Hệ thống đang bảo trì, vui lòng thử lại sau.",
    };
  }
}

/**
 * Follow redirect chain to get the final URL
 * Follows up to maxRedirects hops (default 10)
 */
async function resolveRedirects(url: string, maxRedirects: number = 10): Promise<string> {
  let currentUrl = url;

  for (let i = 0; i < maxRedirects; i++) {
    try {
      const response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (location) {
          currentUrl = location.startsWith("http")
            ? location
            : new URL(location, currentUrl).toString();
          console.log(`[ResolveRedirects] Hop ${i + 1}: ${currentUrl}`);
          continue;
        }
      }
      break;
    } catch (error) {
      console.error(`[ResolveRedirects] Error at hop ${i + 1}:`, error);
      break;
    }
  }

  console.log(`[ResolveRedirects] Final URL: ${currentUrl}`);
  return currentUrl;
}

/**
 * Fetch product title from URL by scraping HTML
 * @param url - Product URL
 * @returns Product title or empty string if failed
 */
async function fetchProductTitle(url: string): Promise<string> {
  try {
    console.log("[ProductTitle] Fetching:", url);

    // Headers for Shopee web scraping
    const SHOPEE_WEB_HEADERS: Record<string, string> = {
      "Accept": "*/*",
      "Accept-Language": "vi-VN,vi,fr-FR,fr,en-US,en",
      "Cookie": "_gcl_au=1.1.1938669037.1768445152; _fbp=fb.1.1768445151925.956097763683165704; csrftoken=pGzPnDZaG07bt8nUXAMy2wGMBR4LJCik; SPC_F=q1J152rtJHgdmDdgYs6ckM1lrHonTB6F; REC_T_ID=52cf0799-f1bc-11f0-8873-429a790db211; language=vi; SPC_U=113429809; SPC_EC=.a1N0U0NzbUR1UnJHcmFtUB1hNZTACR4+Bk42toe8+QW+XR9HxfxDwwYrDyKthZabPmwXfX/qCFJe/KOIzpxjXmmJ3GExqTtERAzUc36aA323P8fKHPfiIIk2vc02zj4bzKL1yzBS9cL3AEoHJhrZ2TIm1Sru3MJhDSeMA/DntNWyTkVVE8tYIK8EtnwICMx+zNDmKxna3iu1EO3i4tgaGG6oEXkA6LfrR+jiPzEUuixatHcDZ0Nzmpjhr8Uog1VL+mCzOSr7xBKaeHWyozl26A==",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
      "Referer": "https://shopee.vn/",
    };

    const response = await fetch(url, {
      method: "GET",
      headers: SHOPEE_WEB_HEADERS,
    });

    if (!response.ok) {
      console.error("[ProductTitle] HTTP error:", response.status);
      return "";
    }

    const html = await response.text();

    // Parse title from HTML using regex
    // Handle: <title data-rh="true">Content | Shopee</title>
    const titleMatch = html.match(/<title[^>]*>([\s\S]+?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      // Clean up title - remove common suffixes
      let title = titleMatch[1]
        .replace(/\s*\|\s*Shopee.*$/i, "")
        .replace(/\s*-\s*Shopee.*$/i, "")
        .replace(/\s*\|\s*TikTok.*$/i, "")
        .trim();

      console.log("[ProductTitle] Found:", title);
      return title;
    }

    console.log("[ProductTitle] No title found");
    return "";
  } catch (error) {
    console.error("[ProductTitle] Error:", error);
    return "";
  }
}

/**
 * Parse commission text to number
 * "₫12.255" or "₫51.450" -> 12255 or 51450
 */
function parseCommissionText(text: string): number {
  if (!text) return 0;

  const cleanedText = text
    .replace(/[₫đ]/g, "")     // Remove currency symbols
    .replace(/\./g, "")        // Remove thousand separators (dots)
    .replace(/,/g, "")         // Remove commas if any
    .trim();

  const amount = parseInt(cleanedText, 10);
  return isNaN(amount) ? 0 : amount;
}

/**
 * Lấy hoa hồng ước tính từ Shopee API
 * @param url - URL sản phẩm Shopee (clean URL preferred)
 * @returns Số tiền hoa hồng (VND) hoặc 0 nếu không lấy được
 */
export async function fetchCommissionEstimate(url: string): Promise<number> {
  try {
    const apiUrl = `https://mall.shopee.vn/api/v4/generic_sharing/get_sharing_info?url=${encodeURIComponent(url)}`;

    console.log("[CommissionEstimate] Fetching:", apiUrl);

    // Full headers from Shopee app with authentication tokens
    const SHOPEE_HEADERS: Record<string, string> = {
      "Accept": "*/*",
      "af-ac-enc-sz-token": "MBDgk/6DllcxbuHnbfNCUw==|j42txkZRUqmZBFbfsrBsPkjsFw19MkjUSQA/SxcSPZ/Kj9cDRjY5awzfTcyxsmbQ7EngDWvWFiSTgbXunc1yDwNo|kGzKecUa8t0oRtmp|08|2",
      "Accept-Language": "vi-VN,vi,fr-FR,fr,en-US,en",
      "x-api-source": "rn",
      "User-Agent": "iOS app iPhone Shopee appver=36649 language=vi app_type=1 platform=native_ios os_ver=26.0.1 Cronet/102.0.5005.61",
      "5bbab827": "jIpXGoxgIcL/NEY5B3u2oWPTvLr0wX3KSCoOiF5OTsDqroLq9sQxejskfIfVWgTHdQOg2XfoZDzQm3MCP2rwN+5Q65KEnn/mOXExkY1sr4yJxA2xpC7fJbuCTN+gzAwk0LteTRu9JWil9JDkLXJu+tjFweeGOmYK1rDeJYoPhF26w2SCU3GiJl2YCYNEJ3lJnNGQZHcyGrjsr+sugVqBSnd83kdb4E9WGEbHG1ZY9dbU4kmUsO6u6H58lXlWlKh3QZ3fo+0DCpyZlGu9Y/ycpeCpme/dXMyy5fsZ4EPIbxelNJcP3r+iVDcneoNtn+FHpE1nQyEaeCzM0sTYegy5PyM/Oix3q8WOyfjyfg/cWe1/5clhaFxa4CbHdhfB1EHCVArFcap3ffUsFjhqWaj3FA7kuXmW6kkooGllvjVoUdh/fxBbYu3kgOaxDsrUNIUWug43PVs5diMeoCunQSzO9gkF/X1m4MHwmdmis3fSRajaHMFURKANMujkcPFIkhHZXhXSxI+8cwLrpT25vtAyYZag/dl5TMKUdaAED2+xXTLLo9aUBywYvNvqnIaa606TdKHQKXllvxncX7IAiRRLH5bS+4Yb9mx+09a7g/mw+ugZkgriGGDnCapu5PVIjMRQXEtq2ESMsvRUVMCApkzbniFXeOwbmLGf2vSUSuQe7de3ArPWOhlnDkBXmbtRJDNpYMNWdOKiwsCBFQsamWyoW/VYaSXUUUAj52rbdS5HJZcpezrdb39NI6DMTZprpY1CelwcpuyRA8Npff23//z6auzXrADHIC8H0yN+KHOYBc79BYGAPQTPiJJneaW/pchHl2eCHGOFhjz+y3vG/m4Heb7jtI6trIAshZoknClkcLU5Ixx3/Rz5U3CFW5/044d5/ZFNEfbOHhn+TC8iuy6zg75SVK7z6Eroo9RspjQvRKPBvQ5qAGkX0XpiceiP04TQFFaeduse4YW3LnO/j/0i/rg3V+9rUXW9nTTUSla8cq86eE8Y2js1SekPgwQ7ID1WWiZIm5aATudOjuMk",
      "Referer": "https://mall.shopee.vn/",
      "Accept-Encoding": "gzip, deflate, br",
      "x-sap-ri": "ebec6d69175082e40a9cbe23014c97ba3dc3198d127c38acc479",
      "Connection": "keep-alive",
      "Client-Request-Id": "d9f2f93a-71aa-41e9-a482-2f155ab23384.1065",
      "d43474c9": "aRicRrvVp5/IwXxg615bUE88qNj=",
      "Cookie": "REC_T_ID=7274c643-ec27-11ef-9c4c-06e1657ebf70; _ga_FV78QC1144=GS2.1.s1768479694$o2$g1$t1768480524$j60$l0$h0; _gcl_au=1.1.749893264.1768479656; _fbp=fb.1.1749621671337.424792997825787977; _ga_4GPP1ZXG63=GS2.1.s1768811715$o3$g0$t1768811715$j60$l1$h391112625; _ga=GA1.1.1896758253.1749621857; _ga_VYF4T4BCNH=GS2.1.s1768576274$o10$g0$t1768576274$j60$l0$h0; SPC_SEC_SI=v1-T056Rmt1TlZBZkxBVHIzNqH1G6Lq7KiM9B+0exfHyhnOtmjfmcJdhRGeD2KVYwzhsrQiBSw5ubaqo08RMqnsYNZtDc16a2JO2Y6CvD0Qozk=; SPC_DH=EU/D5B9XyFr1nfcaeCP9/jn2tf43o0EuLuYlA5m44x3KhDtOtSAjtzMtlWtQBPLJqcnbdgAcJA==.1kmphko.e25e0b2c; SPC_F=91762F7B39544496A68BBB5A670F23B8; SPC_DID=91762F7B39544496A68BBB5A670F23B8; SPC_RNBV=6087006; language=vi; shopee_app_version=36649; shopee_rn_bundle_version=6087006; shopee_rn_version=1767772259; shopee_token=EUQcG0K3Zko/0SUL0irwIkqowMXlteYVYd9eRgqJeSiA1ImP/esTXEfAU0mYYECU5CfWvSnIC6gT5kQx0Mc3; shopid=113428211; userid=113429809; username=cukinacha; SPC_AFTID=LAT; SPC_CLIENTID=MUFFRDYxNERFMUM0sdkptjpxxhiorzjo; csrftoken=A6z5sTTZg4BBn8nlXGYPPoFG7CLWX1fP; SPC_U=113429809",
      "3cbecbcf": "5ZIAx/csCzpQ/IHD/cmTJzvoN/T=",
      "X-Shopee-Client-Timezone": "Asia/Ho_Chi_Minh",
      "Host": "mall.shopee.vn",
    };

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: SHOPEE_HEADERS,
    });

    if (!response.ok) {
      console.error("[CommissionEstimate] API error:", response.status);
      return 0;
    }

    const data = await response.json();

    // Check for API error or non-affiliate products
    if (data?.error !== 0 || data?.data?.affiliate_status !== 1) {
      console.log("[CommissionEstimate] Product not affiliated or API error:", data?.error);
      return 0;
    }

    // Check if banner is available
    if (!data?.data?.sharing_banner?.show_banner) {
      console.log("[CommissionEstimate] No commission banner available");
      return 0;
    }

    // Parse: data.data.sharing_banner.sections[0].content[last].text
    const sections = data.data.sharing_banner.sections;
    if (!sections || sections.length === 0) {
      console.log("[CommissionEstimate] No sections found");
      return 0;
    }

    const content = sections[0]?.content;
    if (!content || content.length === 0) {
      console.log("[CommissionEstimate] No content found");
      return 0;
    }

    // Lấy phần tử cuối cùng
    const lastItem = content[content.length - 1];
    const text = lastItem?.text || "";

    console.log("[CommissionEstimate] Raw text:", text);

    const amount = parseCommissionText(text);
    console.log("[CommissionEstimate] Parsed amount:", amount);
    return amount;

  } catch (error) {
    console.error("[CommissionEstimate] Error:", error);
    return 0;
  }
}

/**
 * Hàm lấy link gốc từ link rút gọn Shopee và xóa params rác
 * @param shortLink Link rút gọn (VD: https://s.shopee.vn/qdHvqFrBS)
 */
export async function resolveAndCleanShopeeUrl(shortLink: string): Promise<string> {
  try {
    // Bước 1: Gọi fetch để lấy URL đích
    // Sử dụng method 'HEAD' để chỉ lấy headers (nhanh hơn), nếu Shopee chặn HEAD thì đổi sang 'GET'
    const response = await fetch(shortLink, {
      method: 'GET',
      redirect: 'follow', // BẮT BUỘC: Để tự động đi theo redirect 301/302
      headers: {
        // Fake User-Agent để tránh bị chặn bởi tường lửa Shopee
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const finalUrl = response.url; // Đây là URL đích sau khi đã redirect xong

    // Bước 2: Làm sạch URL (Xóa params)
    const urlObj = new URL(finalUrl);

    // Mẹo: Gán search = rỗng để xóa toàn bộ tham số sau dấu ? (utm_source, spm, v.v...)
    urlObj.search = '';

    // Nếu bạn muốn kỹ hơn, xóa cả hash (#) thì dùng dòng dưới
    // urlObj.hash = '';

    // Bước 3: Trả về link sạch (bỏ luôn dấu / ở cuối nếu có cho đẹp)
    return urlObj.toString().replace(/\/$/, "");

  } catch (error) {
    console.error("Lỗi khi resolve link Shopee:", error);
    // Nếu lỗi, trả về nguyên gốc để hệ thống không bị crash
    return shortLink;
  }
}
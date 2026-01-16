import type { Result } from "@/types";
import { db } from "@/db";
import { platforms } from "@/db/schema";
import { eq } from "drizzle-orm";

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
  shortLink: string;
  originalUrl: string;
  platform: PlatformType;
  subId: string;
  productInfo?: ProductInfo;
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
  generateLink(url: string, subId: string, config?: Record<string, unknown>): Promise<string>;

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

    // Shopee domains
    if (hostname.includes("shopee.vn") || hostname.includes("shope.ee")) {
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
   * Hỗ trợ 2 mode: API và Manual
   * @param url - URL gốc sản phẩm
   * @param subId - Tracking ID (userId hoặc guestId)
   * @param config - Optional config từ bảng platforms
   */
  async generateLink(url: string, subId: string, config?: Record<string, unknown>): Promise<string> {
    // Simulate API delay
    await simulateApiDelay();

    // Cast config về ShopeePlatformConfig nếu có
    const shopeeConfig = config as ShopeePlatformConfig | undefined;

    // Kiểm tra mode từ config
    if (shopeeConfig?.mode === "manual" && shopeeConfig.affiliate_id) {
      return this.generateManualLink(url, subId, shopeeConfig);
    }

    // API Mode (hoặc Mock nếu chưa có config)
    return this.generateApiLink(url, subId);
  }

  /**
   * Tạo link thủ công theo công thức Universal Link
   * Công thức: https://s.shopee.vn/an_redir?origin_link={encoded}&affiliate_id={id}&sub_id={tracking}
   */
  private generateManualLink(url: string, userId: string, config: ShopeePlatformConfig): string {
    // Encode URL gốc
    const encodedUrl = encodeURIComponent(url);

    // Tạo tracking_tag: {default_sub_id}_{userId}
    const trackingTag = `${config.default_sub_id || "CK"}_${userId}`;

    // Ghép công thức
    return `https://s.shopee.vn/an_redir?origin_link=${encodedUrl}&affiliate_id=${config.affiliate_id}&sub_id=${trackingTag}`;
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
  async generateLink(url: string, subId: string): Promise<string> {
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
    return `https://vt.tiktok.com/ck${randomId}?sub_id=${subId}`;
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
 * Sử dụng Adapter Pattern qua Factory
 */
export async function generateShortLink(
  originalUrl: string,
  userId?: string,
  guestSessionId?: string
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

    // 2. Query platform config từ database
    const platformRecord = await db.query.platforms.findFirst({
      where: eq(platforms.name, platform),
    });

    // Lấy api_config (có thể null)
    const platformConfig = platformRecord?.apiConfig as Record<string, unknown> | null;

    // 3. Lấy adapter từ Factory
    const adapter = AffiliateAdapterFactory.getAdapter(platform);

    // 4. Generate tracking ID
    // Với Manual Mode: dùng userId/guestId trực tiếp (không thêm timestamp)
    // Với API Mode: dùng subId format cũ
    const trackingId = userId || guestSessionId || "anon";
    const subId = generateSubId(userId, guestSessionId);

    // 5. Gọi adapter để tạo link (truyền config nếu có)
    const shortLink = await adapter.generateLink(
      originalUrl,
      platformConfig?.mode === "manual" ? trackingId : subId,
      platformConfig || undefined
    );

    // 6. Lấy thông tin sản phẩm
    const productInfo = await adapter.getProductInfo(originalUrl);

    return {
      success: true,
      data: {
        shortLink,
        originalUrl,
        platform,
        subId: platformConfig?.mode === "manual" ? trackingId : subId,
        productInfo,
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

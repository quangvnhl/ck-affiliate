import { NextRequest, NextResponse } from "next/server";
import { BasicCrawler, Configuration } from '@crawlee/basic';

// ---- Types ----
interface CommissionContent {
  text: string;
  style?: { color: string };
}
interface SharingSectionItem {
  icon_hash?: string;
  content: CommissionContent[];
  section_url?: string;
  sub_sections: null;
}
interface SharingApiResponse {
  error: number;
  data: {
    affiliate_status: number;
    sharing_banner?: {
      sections: SharingSectionItem[];
    };
  } | null;
}

export const dynamic = "force-dynamic";

// Cho phép Vercel execution lâu hơn nếu là dạng Pro (mặc định cho Serverless là 10s-15s trên Hobby)
export const maxDuration = 30;

// Whitelist domains cho phép gọi API này
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",").map(o => o.trim()) || [];

function isAllowedOrigin(req: NextRequest) {
  // Same-origin request (từ browser trên cùng domain): không có header 'origin'.
  // Vercel frontend gọi /api/scp sẽ không gửi 'origin' – chỉ có 'referer'.
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // Dev mode: cho phép mọi request (Postman, browser)
  if (process.env.NODE_ENV === "development") return true;

  // Cross-origin: kiểm tra origin
  if (origin) {
    return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
  }

  // Same-origin: kiểm tra referer
  if (referer) {
    return ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed));
  }

  // Không có cả origin lẫn referer (server-to-server thuần túý – chặn)
  return false;
}

export async function GET(req: NextRequest) {
  try {
    // 1. Kiểm tra CORS chặn gọi ngoài luồng
    if (!isAllowedOrigin(req)) {
      return NextResponse.json(
        { status: "error", message: "Forbidden Access", "allows": ALLOWED_ORIGINS },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { status: "error", message: "Missing URL parameter" },
        { status: 400 }
      );
    }

    // 2. Resolve Redirect nếu là Short URLs của Shopee
    let finalUrl = url;
    if (url.includes("s.shopee.vn") || url.includes("shope.ee") || url.includes("shp.ee") || url.includes("vn.shp.ee")) {
      try {
        const config = new Configuration({
          persistStorage: false,
          purgeOnStart: false,
          defaultDatasetId: Math.random().toString(36).substring(7),
          defaultKeyValueStoreId: Math.random().toString(36).substring(7),
          defaultRequestQueueId: Math.random().toString(36).substring(7),
        });

        const redirectCrawler = new BasicCrawler({
          maxRequestsPerCrawl: 1,
          maxRequestRetries: 0,
          requestHandlerTimeoutSecs: 15,
          requestHandler: async ({ request, sendRequest }) => {
            const { url: finalResolvedUrl } = await sendRequest({
              url: request.url,
              headers: { "Referer": "https://www.google.com/" }
            });
            finalUrl = finalResolvedUrl;
          },
          failedRequestHandler: ({ request }) => {
            console.error(`Redirect resolver failed for ${request.url}`, request.errorMessages);
          }
        }, config);
        // console.log("CRAW URL", url)
        await redirectCrawler.run([url]);
      } catch (err) {
        console.error("Resolve timeout/error:", err);
      }
    }

    // 3. Bóc tách shopId và itemId
    let shopId = "";
    let itemId = "";

    // P1: /product/50593208/6436934998
    const pattern1 = /\/product\/(\d+)\/(\d+)/;
    // P2: -i.50593208.16458254209
    const pattern2 = /-i\.(\d+)\.(\d+)/;
    // P3: /opaanlp/8466374/6436934998
    const pattern3 = /\/opaanlp\/(\d+)\/(\d+)/;

    const match1 = finalUrl.match(pattern1);
    const match2 = finalUrl.match(pattern2);
    const match3 = finalUrl.match(pattern3);

    if (match1) {
      shopId = match1[1]; itemId = match1[2];
    } else if (match2) {
      shopId = match2[1]; itemId = match2[2];
    } else if (match3) {
      shopId = match3[1]; itemId = match3[2];
    }

    // Nếu không khớp regex nào (link không phải sản phẩm)
    if (!shopId || !itemId) {
      return NextResponse.json({
        status: "success",
        data: {
          title: "Not found",
          image: "Not found",
          target_url: finalUrl
        }
      });
    }

    // Proxy format thống nhất (Dạng 2 hoặc product/:shopId/:itemId)
    const targetUrl = `https://shopee.vn/product/${shopId}/${itemId}`;

    // 4. Scrape HTML từ Proxy URL
    let htmlSource = "";
    const config = new Configuration({
      persistStorage: false,
      purgeOnStart: false,
      defaultDatasetId: Math.random().toString(36).substring(7),
      defaultKeyValueStoreId: Math.random().toString(36).substring(7),
      defaultRequestQueueId: Math.random().toString(36).substring(7),
    });

    const crawler = new BasicCrawler({
      maxRequestsPerCrawl: 1,
      maxRequestRetries: 0,
      requestHandlerTimeoutSecs: 20,
      requestHandler: async ({ request, sendRequest }) => {
        const response = await sendRequest({
          url: request.url,
          headers: {
            "Referer": "https://www.google.com/",
            "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
          }
        });
        htmlSource = response.body.toString();
      },
      failedRequestHandler: ({ request, log }) => {
        console.error(`Crawl failed for ${request.url}`, request.errorMessages);
      }
    }, config);

    await crawler.run([targetUrl]);

    if (!htmlSource) {
      throw new Error(`Scrape HTTP error! source is empty.`);
    }

    // console.log(htmlSource);

    // 5. Tìm Title, Image và Price qua Regex độc lập
    const titleRegex = /"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/;
    const imageRegex = /"image"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/;
    const priceRegexStr = /"price"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/;
    const lowPriceRegex = /"lowPrice"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/;
    const integerPriceRegex = /"price"\s*:\s*(\d{7,15})/; // Shopee price multiplied by 100,000

    const titleMatch = htmlSource.match(titleRegex);
    const imageMatch = htmlSource.match(imageRegex);

    // Price Matching
    let priceMatch = htmlSource.match(lowPriceRegex) || htmlSource.match(priceRegexStr);
    let extractedPrice = 0;

    if (priceMatch && priceMatch[1]) {
      extractedPrice = Math.round(parseFloat(priceMatch[1]));
    } else {
      const rawPriceMatch = htmlSource.match(integerPriceRegex);
      if (rawPriceMatch && rawPriceMatch[1]) {
        extractedPrice = Math.round(parseInt(rawPriceMatch[1], 10) / 100000);
      }
    }


    let title = "Not found";
    let image = "Not found";

    if (titleMatch && titleMatch[1]) {
      // Giải mã Unicode và Escape tags
      title = titleMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    if (imageMatch && imageMatch[1]) {
      image = imageMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }

    // Trả về Not found nếu không có cả title/image
    if (title === "Not found" && image === "Not found") {
      return NextResponse.json({
        status: "success",
        data: { title: "Not found", image: "Not found", shop_id: shopId, product_id: itemId, target_url: targetUrl }
      });
    }

    // 6. Return Data Payload
    return NextResponse.json({
      status: "success",
      data: {
        title,
        image,
        price: extractedPrice || undefined,
        shop_id: shopId,
        product_id: itemId,
        target_url: targetUrl
      }
    });

  } catch (error) {
    console.error("Scrape Module Error:", error);
    // Vẫn trả success status 200 nhưng data là Not found (Tránh hỏng mảng logic phía Fetcher)
    return NextResponse.json({
      status: "success",
      data: {
        title: "Not found",
        image: "Not found",
        target_url: ""
      }
    });
  }
}

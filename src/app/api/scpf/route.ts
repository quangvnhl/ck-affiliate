import { NextRequest, NextResponse } from "next/server";
import { BasicCrawler, Configuration } from '@crawlee/basic';

export const dynamic = "force-dynamic";

export const maxDuration = 30;

const ALLOWED_ORIGINS = ["localhost:3000", "ck-affiliate.vercel.app"]
const ORIGIN_CHECK = false;

function isAllowedOrigin(req: NextRequest): boolean {
  const host = req.headers.get("host");
  if (!host) return false;
  return ALLOWED_ORIGINS.some(allowed => host.startsWith(allowed));
}

export async function GET(req: NextRequest) {

  try {
    if (ORIGIN_CHECK && !isAllowedOrigin(req)) {
      return NextResponse.json(
        { status: "error", message: "Forbidden Access", },
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

    // 1. Resolve Redirect nếu là Short URLs của Shopee
    let finalUrl = url;
    if (url.includes("s.shopee.vn") || url.includes("shope.ee") || url.includes("shp.ee") || url.includes("vn.shp.ee")) {
      try {
        const config = new Configuration({
          persistStorage: false,
          purgeOnStart: false,
          defaultDatasetId: Math.random().toString(36).substring(7),
          defaultKeyValueStoreId: Math.random().toString(36).substring(7),
          defaultRequestQueueId: Math.random().toString(36).substring(7),
          systemInfoV2: true
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
        await redirectCrawler.run([url]);
      } catch (err) {
        console.error("Resolve timeout/error:", err);
      }
    }

    // 2. Bóc tách shopId và itemId
    let shopId = "";
    let itemId = "";

    const pattern1 = /\/product\/(\d+)\/(\d+)/;
    const pattern2 = /-i\.(\d+)\.(\d+)/;
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

    if (!shopId || !itemId) {
      return NextResponse.json({
        status: "error",
        message: "Invalid product URL format"
      });
    }

    const targetUrl = `https://shopee.vn/product/${shopId}/${itemId}`;

    // 3. Scrape HTML và trả về full source
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
      return NextResponse.json({
        status: "error",
        message: "Failed to fetch HTML source"
      });
    }

    // 4. Return full source
    return NextResponse.json({
      status: "success",
      data: {
        source: htmlSource,
        url: targetUrl,
        shop_id: shopId,
        product_id: itemId
      }
    });

  } catch (error) {
    console.error("Scrape Full Source Error:", error);
    return NextResponse.json({
      status: "error",
      message: String(error)
    });
  }
}
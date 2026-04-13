import { BasicCrawler } from '@crawlee/basic';

(async () => {
    let source = "";
    const crawler = new BasicCrawler({
        maxRequestsPerCrawl: 1,
        requestHandler: async ({ request, sendRequest }) => {
            console.log("Inside request handler for", request.url);
            try {
                const response = await sendRequest({
                    url: request.url,
                    headers: {
                        "Referer": "https://www.google.com/",
                        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                    }
                });
                source = response.body.toString();
                console.log("Fetched body length:", source.length);
            } catch (err) {
                console.error("sendRequest error:", err);
            }
        },
        failedRequestHandler: ({ request, pushData, log }) => {
            console.log(`Request ${request.url} failed.`);
        }
    });

    await crawler.run(['https://shopee.vn/CKW-i.8466374.6436934998']);
    console.log("Final source length:", source.length);
})();

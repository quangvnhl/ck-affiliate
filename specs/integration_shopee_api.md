# INTEGRATION SPEC: Shopee Affiliate Open API (GraphQL V2)

## 1. META INFORMATION
- **API Name:** Shopee Affiliate Open API
- **Protocol:** HTTPS POST (GraphQL)
- **Version:** V2
- **Content-Type:** `application/json`
- **Region Base URL (Vietnam - Default):** `https://open-api.affiliate.shopee.vn/graphql`
- **Auth Strategy:** Custom SHA256 Signature (Header-based).
- **Documentation Date:** 2026-01-15

### 1.1 Region Endpoints
Select the correct endpoint based on the target market:
- **VN:** `https://open-api.affiliate.shopee.vn/graphql`
- **ID:** `https://open-api.affiliate.shopee.co.id/graphql`
- **MY:** `https://open-api.affiliate.shopee.com.my/graphql`
- **TH:** `https://open-api.affiliate.shopee.co.th/graphql`
- **PH:** `https://open-api.affiliate.shopee.ph/graphql`
- **SG:** `https://open-api.affiliate.shopee.sg/graphql`
- **BR:** `https://open-api.affiliate.shopee.com.br/graphql`

## 2. AUTHENTICATION & SECURITY (STRICT)
The system uses a strict SHA256 signature mechanism. The AI must implement the following algorithm precisely to avoid error `10020`.

### A. Signature Algorithm
```typescript
/**
 * Generates the strictly required SHA256 signature.
 * @param appId - From Env: SHOPEE_APP_ID
 * @param secret - From Env: SHOPEE_API_SECRET
 * @param payload - The EXACT JSON Body String (Minified, no whitespace)
 * @param timestamp - Current Unix Timestamp (Seconds - Integer)
 */
function generateSignature(appId: string, secret: string, payload: string, timestamp: number): string {
    // CRITICAL: Payload must be the raw JSON string sent in the request body.
    // It must NOT contain whitespace (e.g., use JSON.stringify(body))
    
    // Formula: AppID + Timestamp + Payload + Secret
    const factorString = appId + timestamp.toString() + payload + secret;
    
    // Hash SHA256 -> Convert to Hex string
    return crypto.createHash('sha256').update(factorString).digest('hex');
}
```

### B. Header Construction
Every request must include the following headers:
```json
{
    "Content-Type": "application/json",
    "Authorization": "SHA256 Credential={AppID}, Timestamp={Timestamp}, Signature={Signature}"
}
```
## 3. DATA MODELS (TYPESCRIPT INTERFACES)
```typescript
// Common Response Wrapper
interface ShopeeGraphQLResponse<T> {
  data: T;
  errors?: any[];
}

// 1. Product Offer Data (Query: productOfferV2)
interface ShopeeProductNode {
  itemId: number;       // Unique Item ID (Int64)
  productName: string;  // Product Title
  productLink: string;  // Original URL
  priceMin: number;
  priceMax: number;
  sales: number;        // Historical sales volume
  ratingStar: number;   // Average rating (0-5)
  commissionRate: string; // WARNING: Returns string (e.g., "0.05"). Parse to Float.
  remainingBudget: number; // 0=Unlimited, 1=Low
  shopType: number[];     // [1]=Mall, [2]=Preferred
}

// 2. Short Link Data (Mutation: generateShortLink)
interface GenerateShortLinkResult {
  generateShortLink: {
    shortLink: string; // The generated Affiliate URL ([https://shope.ee/](https://shope.ee/)...)
  };
}

// 3. Conversion Report Data (Query: conversionReport)
interface ConversionReportNode {
  conversionId: number;   // Unique Transaction ID (Int64)
  totalCommission: number; // Commission earned
  subIds: string[];       // [0] = user_id (CRITICAL for mapping)
  orders: Array<{
    itemPrice: number;
    itemSku: string;
  }>;
}
```
## 4. GRAPHQL OPERATIONS
### A. Mutation: Generate Short Link
Used to create a tracking link for a user.
#### GraphQL:
```graphql
mutation GenerateShortLink($originUrl: String!, $subIds: [String]) {
  generateShortLink(input: { originUrl: $originUrl, subIds: $subIds }) {
    shortLink
  }
}
```

#### Logic Rules:
- ***originUrl:*** The original product URL.
- ***subIds:*** Array of strings. Must inject ***user_id*** (or ***guest_session_id***) into ***subIds[0]*** to track attribution.

### B. Query: Conversion Report
Used for the Cron Job to sync orders and calculate cashback.
#### GraphQL:
```graphql
query ConversionReport($startDate: Int!, $endDate: Int!, $limit: Int, $scrollId: String) {
  conversionReport(
    startDate: $startDate
    endDate: $endDate
    limit: $limit
    scrollId: $scrollId
  ) {
    nodes {
      conversionId
      totalCommission
      subIds
      orders {
        itemPrice
      }
    }
    pageInfo {
      hasNextPage
      scrollId
    }
  }
}
```

#### Logic Rules:
- ***startDate*** / ***endDate***: Unix Timestamp (Integer).
- Mapping: Parse ***node.subIds[0]*** to identify the User.

### C. Query: Product Search (Optional)
#### GraphQL:
```graphql
query ProductOfferV2($keyword: String, $limit: Int, $sortType: Int, $listType: Int) {
  productOfferV2(
    keyword: $keyword
    limit: $limit
    sortType: $sortType
    listType: $listType
  ) {
    nodes {
      itemId
      productName
      productLink
      commissionRate
      priceMin
      sales
    }
  }
}
```

#### Sort Types: 
- 1: Relevance
- 2: Sales High-Low
- 3: Price High-Low
- 4: Price Low-High
- 5: Commission High-Low

## 5. ERROR HANDLING REFERENCE
Code | Error | Solution
--- | --- | ---
10020 | Invalid Signature | Check strict whitespace rules in payload serialization. Ensure ***payload*** used in signature matches ***body*** sent exactly.
429 | Too Many Requests | Implement **Exponential Backoff** strategy (wait 1s, 2s, 4s...).
401 | Unauthorized | Verify ***AppID***, ***Secret***, and ensure the Region Endpoint matches the account registration.
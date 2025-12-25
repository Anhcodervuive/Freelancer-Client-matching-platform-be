# 📄 BẰNG CHỨNG #3 - FREELANCER
## CloudFront distribution configuration

---

### Thông tin bằng chứng

| Field | Value |
|-------|-------|
| **Dispute ID** | DSP-2024-001 |
| **Submitted by** | Freelancer |
| **Source Type** | Document |
| **Date** | 21/12/2024 |

---

### Tiêu đề
**CloudFront distribution configuration**

---

### Mô tả chi tiết

Screenshot và documentation cấu hình CloudFront distribution với cache headers, signed URLs, và 4 edge locations. Response headers có `X-Cache: Hit from cloudfront` chứng minh CDN hoạt động đúng.

---

### CloudFront Distribution Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  AWS CloudFront - Distribution: E1XXXXXXXXXX                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Status: ✅ Deployed                                            │
│  Domain: d1234abcd.cloudfront.net                              │
│  State: Enabled                                                 │
│  Price Class: PriceClass_200                                   │
│                                                                 │
│  📊 Last 24 Hours:                                              │
│  ├── Requests: 15,234                                          │
│  ├── Cache Hit Ratio: 94.2%                                    │
│  ├── Bytes Downloaded: 2.4 GB                                  │
│  └── Average Latency: 45ms                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Edge Locations

| Region | Location | Status |
|--------|----------|--------|
| Asia Pacific | Singapore (SIN) | ✅ Active |
| Asia Pacific | Tokyo (NRT) | ✅ Active |
| Asia Pacific | Hong Kong (HKG) | ✅ Active |
| Asia Pacific | Sydney (SYD) | ✅ Active |

---

### Response Headers (Proof of CDN Working)

```http
HTTP/2 200 OK
Content-Type: application/vnd.apple.mpegurl
Content-Length: 1234
Date: Sat, 21 Dec 2024 10:30:00 GMT

# ✅ CloudFront Headers
X-Cache: Hit from cloudfront
X-Amz-Cf-Pop: SIN2-C1
X-Amz-Cf-Id: abc123xyz...
Via: 1.1 d1234abcd.cloudfront.net (CloudFront)

# ✅ Cache Headers
Cache-Control: max-age=86400, public
Age: 3600
ETag: "abc123"
Last-Modified: Fri, 20 Dec 2024 08:00:00 GMT
```

---

### Signed URL Configuration

```
┌─────────────────────────────────────────────────────────────────┐
│  Signed URL Settings                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Trusted Signers: ✅ Enabled                                    │
│  Key Pair ID: K2XXXXXXXXXX                                     │
│  Expiration: 2 hours (7200 seconds)                            │
│                                                                 │
│  Example Signed URL:                                            │
│  https://d1234abcd.cloudfront.net/videos/vid_123/master.m3u8   │
│  ?Expires=1703156400                                           │
│  &Signature=abc123...                                          │
│  &Key-Pair-Id=K2XXXXXXXXXX                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Signed URL Expiration Test

| Time | URL Status | Result |
|------|------------|--------|
| T+0 | Fresh URL | ✅ 200 OK |
| T+1h | Within expiry | ✅ 200 OK |
| T+2h | At expiry | ✅ 200 OK |
| T+2h 1m | After expiry | ❌ 403 Forbidden |

```
# Test sau khi URL expired
GET /videos/vid_123/master.m3u8?Expires=1703149200&Signature=...

Response:
HTTP/2 403 Forbidden
{
  "Error": {
    "Code": "AccessDenied",
    "Message": "Request has expired"
  }
}
```

---

### Cache Behavior Settings

```json
{
  "DefaultCacheBehavior": {
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": ["GET", "HEAD"],
    "CachedMethods": ["GET", "HEAD"],
    "Compress": true,
    "DefaultTTL": 86400,
    "MaxTTL": 604800,
    "MinTTL": 0,
    "TrustedSigners": {
      "Enabled": true,
      "Quantity": 1,
      "Items": ["self"]
    }
  },
  "CacheBehaviors": [
    {
      "PathPattern": "*.m3u8",
      "DefaultTTL": 3,
      "MaxTTL": 10
    },
    {
      "PathPattern": "*.ts",
      "DefaultTTL": 86400,
      "MaxTTL": 604800
    }
  ]
}
```

---

### Possible Reasons for Client's Issue

1. **Browser Cache**
   - Client có thể đang xem cached response cũ
   - Solution: Hard refresh (Ctrl+Shift+R)

2. **Copy URL sau khi expired**
   - URL có expiration time
   - Copy URL sau 2 giờ sẽ không work

3. **Network Tab không filter đúng**
   - Cần filter "cloudfront" để thấy headers
   - Hoặc check trong Response Headers tab

---

### Kết luận

CloudFront CDN đã được setup đúng với:
- ✅ 4 edge locations active
- ✅ Cache hit ratio 94%
- ✅ Signed URLs với 2 giờ expiration
- ✅ Cache headers present (X-Cache, Cache-Control)

Client có thể gặp vấn đề do browser cache hoặc test sai cách.

---

**File đính kèm:** `cloudfront_distribution_config.png`

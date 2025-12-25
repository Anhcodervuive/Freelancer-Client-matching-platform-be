# CloudFront Distribution Configuration
## LMS Video Streaming CDN Setup

---

## Distribution Details

| Property | Value |
|----------|-------|
| Distribution ID | E1XXXXXXXXXX |
| Domain Name | d1234abcd.cloudfront.net |
| Status | Deployed |
| State | Enabled |
| Price Class | PriceClass_200 |

---

## Origin Configuration

```json
{
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-lms-video-output",
        "DomainName": "lms-video-output.s3.ap-southeast-1.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": "origin-access-identity/cloudfront/E1XXXXXXXXXX"
        },
        "OriginPath": "",
        "CustomHeaders": {
          "Quantity": 0
        }
      }
    ]
  }
}
```

---

## Cache Behavior Settings

### Default Cache Behavior

```json
{
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-lms-video-output",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "CachedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "Compress": true,
    "DefaultTTL": 86400,
    "MaxTTL": 604800,
    "MinTTL": 0,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "TrustedSigners": {
      "Enabled": true,
      "Quantity": 1,
      "Items": ["self"]
    }
  }
}
```

### HLS Manifest Cache Behavior

```json
{
  "PathPattern": "*.m3u8",
  "TargetOriginId": "S3-lms-video-output",
  "ViewerProtocolPolicy": "redirect-to-https",
  "DefaultTTL": 3,
  "MaxTTL": 10,
  "MinTTL": 0,
  "Compress": true
}
```

### Video Segments Cache Behavior

```json
{
  "PathPattern": "*.ts",
  "TargetOriginId": "S3-lms-video-output",
  "ViewerProtocolPolicy": "redirect-to-https",
  "DefaultTTL": 86400,
  "MaxTTL": 604800,
  "MinTTL": 3600,
  "Compress": false
}
```

---

## Signed URL Configuration

### Key Pair Information

| Property | Value |
|----------|-------|
| Key Pair ID | K2XXXXXXXXXX |
| Public Key | Uploaded to CloudFront |
| Private Key | Stored in AWS Secrets Manager |

### Signed URL Generation (Node.js)

```typescript
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

const generateSignedUrl = (videoPath: string): string => {
  const cloudfrontDomain = 'd1234abcd.cloudfront.net';
  const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
  const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY;
  
  const url = `https://${cloudfrontDomain}/${videoPath}`;
  const dateLessThan = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  
  return getSignedUrl({
    url,
    keyPairId,
    privateKey,
    dateLessThan: dateLessThan.toISOString()
  });
};

// Usage
const signedUrl = generateSignedUrl('videos/vid_abc123/master.m3u8');
// Output: https://d1234abcd.cloudfront.net/videos/vid_abc123/master.m3u8?Expires=xxx&Signature=xxx&Key-Pair-Id=xxx
```

---

## Edge Locations

| Region | Location | Status |
|--------|----------|--------|
| Asia Pacific | Singapore | ✅ Active |
| Asia Pacific | Tokyo | ✅ Active |
| Asia Pacific | Hong Kong | ✅ Active |
| Asia Pacific | Sydney | ✅ Active |
| Europe | Frankfurt | ✅ Active |
| Europe | London | ✅ Active |
| North America | Virginia | ✅ Active |
| North America | California | ✅ Active |

---

## Response Headers

### Cache Headers

```
Cache-Control: max-age=86400, public
X-Cache: Hit from cloudfront
X-Amz-Cf-Pop: SIN2-C1
X-Amz-Cf-Id: xxxxxxxxxxxxx
Age: 3600
```

### CORS Headers

```json
{
  "ResponseHeadersPolicyConfig": {
    "Name": "LMS-CORS-Policy",
    "CorsConfig": {
      "AccessControlAllowOrigins": {
        "Quantity": 2,
        "Items": [
          "https://lms.example.com",
          "https://staging.lms.example.com"
        ]
      },
      "AccessControlAllowHeaders": {
        "Quantity": 1,
        "Items": ["*"]
      },
      "AccessControlAllowMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      },
      "AccessControlMaxAgeSec": 86400,
      "OriginOverride": true
    }
  }
}
```

---

## Monitoring & Metrics

### CloudWatch Metrics (Last 7 Days)

| Metric | Value |
|--------|-------|
| Total Requests | 1,245,678 |
| Cache Hit Rate | 94.2% |
| 4xx Error Rate | 0.3% |
| 5xx Error Rate | 0.01% |
| Bytes Downloaded | 2.4 TB |
| Average Latency | 45ms |

### Real-time Logs

```json
{
  "RealtimeLogConfig": {
    "Name": "lms-video-logs",
    "SamplingRate": 100,
    "Fields": [
      "timestamp",
      "c-ip",
      "cs-uri-stem",
      "sc-status",
      "sc-bytes",
      "time-taken",
      "x-edge-location",
      "x-edge-result-type"
    ],
    "EndPoints": [
      {
        "StreamType": "Kinesis",
        "KinesisStreamConfig": {
          "StreamARN": "arn:aws:kinesis:ap-southeast-1:123456789:stream/cf-logs"
        }
      }
    ]
  }
}
```

---

## Security Settings

| Setting | Value |
|---------|-------|
| SSL Certificate | ACM (*.lms.example.com) |
| Minimum Protocol Version | TLSv1.2_2021 |
| HTTP/2 | Enabled |
| HTTP/3 | Enabled |
| Field-Level Encryption | Disabled |
| WAF | Enabled (AWS-AWSManagedRulesCommonRuleSet) |

---

## Cost Estimation (Monthly)

| Component | Usage | Cost |
|-----------|-------|------|
| Data Transfer Out | 5 TB | $425 |
| HTTP Requests | 10M | $7.50 |
| HTTPS Requests | 50M | $50 |
| **Total** | | **~$482.50** |

---

**Configuration Version:** 1.0  
**Last Updated:** December 2024  
**Deployed By:** Freelancer Dev Team

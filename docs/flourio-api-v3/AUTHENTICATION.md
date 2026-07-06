# FlourIO API v3 - Authentication

## Overview

FlourIO API v3 uses **Bearer Token Authentication** based on JSON Web Tokens (JWT).

## Getting a Bearer Token

### 1. Request Token

Contact the FlourIO development team to request a Bearer Token:

**Email:** developer@flour.io

**Required Information:**
- Project name
- Company/Organization name
- Intended use case
- Expected API usage (requests per day)
- Contact person

### 2. Token Response

You will receive a JWT Bearer Token via email. The token includes:
- **Type:** Full access (`type: "full"`)
- **Validity:** Typically 5 years
- **Format:** JWT (JSON Web Token)

**Example Token Structure:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlVc2VyIjoiNjdl...
```

## Using the Bearer Token

### HTTP Header

Include the token in all API requests using the Authorization header:

```http
GET /v3/articles HTTP/1.1
Host: flour.host
Authorization: Bearer YOUR_TOKEN_HERE
Accept: application/json
```

### Examples

#### cURL
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -H "Accept: application/json" \
     https://flour.host/v3/articles
```

#### JavaScript (axios)
```javascript
import axios from 'axios';

const client = axios.create({
  baseURL: 'https://flour.host/v3',
  headers: {
    'Authorization': `Bearer ${process.env.FLOURIO_BEARER_TOKEN}`,
    'Accept': 'application/json'
  }
});

const response = await client.get('/articles');
```

#### TypeScript (housnkuh implementation)
```typescript
import { FlourioClient } from './services/flourio/client/FlourioClient';

const client = new FlourioClient({
  baseURL: 'https://flour.host/v3',
  bearerToken: process.env.FLOURIO_BEARER_TOKEN!,
  timeout: 30000
});

const articles = await client.get('/articles');
```

## Security Best Practices

### 1. Environment Variables

**NEVER** commit tokens to Git. Store in environment variables:

```bash
# .env.local (server)
FLOURIO_BEARER_TOKEN=your_token_here
FLOURIO_API_URL=https://flour.host/v3
```

### 2. Access Control

- Limit token access to authorized personnel only
- Use different tokens for development/staging/production
- Rotate tokens periodically (contact FlourIO team)

### 3. Error Handling

Handle authentication errors appropriately:

```typescript
try {
  const response = await client.get('/articles');
} catch (error) {
  if (error.response?.status === 401) {
    console.error('Authentication failed: Invalid or expired token');
    // Implement token refresh or alert mechanism
  }
}
```

## Rate Limiting

### Current Limits (as of 2025-10-16)

- **Rate:** 60 requests per minute (1 per second)
- **Burst:** No burst limit active
- **Response:** HTTP 429 when limit exceeded
- **Header:** `x-ratelimit-reset` contains Unix timestamp for next allowed request

### Handling Rate Limits

The housnkuh app includes automatic rate limit handling via `RateLimitHandler`:

```typescript
import { RateLimitHandler } from './services/flourio/client/RateLimitHandler';

const handler = new RateLimitHandler({
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 60000,
  backoffFactor: 2
});

// Automatically retries on HTTP 429
const result = await handler.executeWithRetry(async () => {
  return await client.get('/articles');
});
```

**Features:**
- Automatic retry on HTTP 429
- Uses `x-ratelimit-reset` header for optimal timing
- Exponential backoff as fallback
- Metrics tracking

### Monitoring Rate Limits

```typescript
const metrics = client.getRateLimitMetrics();
console.log('Total Requests:', metrics.totalRequests);
console.log('Rate Limit Hits:', metrics.rateLimitHits);
console.log('Hit Rate:', client.getRateLimitHitRate().toFixed(2) + '%');
```

## Token Validation

Test your token:

```bash
# Should return HTTP 200 with article data
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://flour.host/v3/articles?limit=1

# Invalid token returns HTTP 401
curl -H "Authorization: Bearer INVALID" \
     https://flour.host/v3/articles
```

## Troubleshooting

### HTTP 401 Unauthorized

**Causes:**
- Invalid or expired token
- Missing Authorization header
- Incorrect token format

**Solution:**
1. Verify token in .env.local
2. Check Authorization header format: `Bearer <token>`
3. Contact developer@flour.io for token renewal

### HTTP 429 Too Many Requests

**Causes:**
- Exceeded 60 requests per minute limit
- Too many concurrent requests

**Solution:**
1. Implement rate limit handling (see above)
2. Add delays between requests
3. Use batch endpoints where available
4. Contact FlourIO team to discuss higher limits

## Token Renewal

Tokens typically expire after 5 years. To renew:

1. Contact developer@flour.io before expiration
2. Provide your current token or project details
3. Receive new token
4. Update environment variables
5. Test with new token before old one expires

## Support

For authentication issues or token requests:

**Email:** developer@flour.io
**Subject:** FlourIO API v3 - Authentication Support
**Include:** Project name, error details, current token (first 10 characters only)

---

**Last Updated:** 2025-10-16
**API Version:** v3
**Token Type:** JWT Bearer Token

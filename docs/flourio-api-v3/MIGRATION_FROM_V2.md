# FlourIO API - Migration from v2 to v3

## Overview

This guide helps you migrate from FlourIO API v2 to v3. While the core concepts remain similar, there are important changes in URLs, authentication, and endpoint structure.

## Quick Summary

| Aspect | v2 | v3 |
|--------|----|----|
| **Base URL** | `https://api.flour.cloud/api/v2` | `https://flour.host/v3` |
| **Authentication** | Self-generated API Key | Bearer Token from FlourIO team |
| **Token Generation** | Via UI (Settings → API Keys) | Email request to developer@flour.io |
| **Documentation** | Manual documentation | OpenAPI 3.0 Swagger |
| **Rate Limits** | Unspecified | 60 requests/minute (1/second) |
| **Support** | team@bitbakers.de | developer@flour.io |

## Breaking Changes

### 1. Base URL Change

```diff
- https://api.flour.cloud/api/v2
+ https://flour.host/v3
```

**Action Required:**
- Update all API client base URLs
- Update environment variables
- Test endpoints with new URL

### 2. Authentication Method

**v2 Approach:**
```javascript
// Self-generated API key via Flour UI
const response = await fetch('https://api.flour.cloud/api/v2/articles', {
  headers: {
    'Authorization': 'Bearer SELF_GENERATED_API_KEY'
  }
});
```

**v3 Approach:**
```javascript
// Bearer token requested from FlourIO team
const response = await fetch('https://flour.host/v3/articles', {
  headers: {
    'Authorization': 'Bearer FLOURIO_PROVIDED_JWT_TOKEN'
  }
});
```

**Action Required:**
1. Contact developer@flour.io to request Bearer Token
2. Provide: project name, use case, expected usage
3. Receive JWT token (typically 5-year validity)
4. Replace API key with Bearer token in environment variables

### 3. Rate Limiting

**v2:**
- Rate limits not clearly documented
- No standard rate limit headers

**v3:**
- **Limit:** 60 requests per minute (1/second)
- **Response:** HTTP 429 when exceeded
- **Header:** `x-ratelimit-reset` with Unix timestamp
- **Recommendation:** Implement automatic retry with exponential backoff

**Action Required:**
```typescript
// Implement rate limit handling
import { RateLimitHandler } from './services/flourio/client/RateLimitHandler';

const handler = new RateLimitHandler({
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 60000,
  backoffFactor: 2
});

const result = await handler.executeWithRetry(async () => {
  return await client.get('/articles');
});
```

## Endpoint Migration

Most endpoints remain structurally similar, but the base URL changes:

### Articles

```diff
- GET https://api.flour.cloud/api/v2/articles
+ GET https://flour.host/v3/articles
```

### BusinessPartners

```diff
- GET https://api.flour.cloud/api/v2/businesspartners
+ GET https://flour.host/v3/businesspartners

- POST https://api.flour.cloud/api/v2/businesspartners
+ POST https://flour.host/v3/businesspartners
```

### Stocks

```diff
- GET https://api.flour.cloud/api/v2/stocks
+ GET https://flour.host/v3/stocks

- POST https://api.flour.cloud/api/v2/stocks
+ POST https://flour.host/v3/stocks
```

### Documents

```diff
- GET https://api.flour.cloud/api/v2/documents
+ GET https://flour.host/v3/documents

- POST https://api.flour.cloud/api/v2/documents
+ POST https://flour.host/v3/documents
```

## Code Migration Examples

### Before (v2)

```typescript
// v2 API client
const fetch = require('node-fetch');

const API_KEY = process.env.FLOUR_API_KEY;
const BASE_URL = 'https://api.flour.cloud/api/v2';

async function getArticles() {
  const response = await fetch(`${BASE_URL}/articles`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  return response.json();
}

async function createBusinessPartner(data) {
  const response = await fetch(`${BASE_URL}/businesspartners`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  return response.json();
}
```

### After (v3)

```typescript
// v3 API client with FlourioClient
import { FlourioClient } from './services/flourio/client/FlourioClient';

const client = new FlourioClient({
  baseURL: 'https://flour.host/v3',
  bearerToken: process.env.FLOURIO_BEARER_TOKEN!,
  timeout: 30000,
  rateLimitConfig: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 60000,
    backoffFactor: 2
  }
});

// Automatic rate limit handling included
async function getArticles() {
  return await client.get('/articles');
}

async function createBusinessPartner(data) {
  return await client.post('/businesspartners', data);
}

// Monitor rate limits
const metrics = client.getRateLimitMetrics();
console.log('Rate limit hit rate:', client.getRateLimitHitRate().toFixed(2) + '%');
```

## Migration Checklist

### Phase 1: Preparation
- [ ] Request Bearer Token from developer@flour.io
- [ ] Review v3 API documentation (swagger.json or api-reference.html)
- [ ] Identify all v2 API calls in your codebase
- [ ] Set up test environment with v3 credentials

### Phase 2: Code Changes
- [ ] Update base URL from `api.flour.cloud/api/v2` to `flour.host/v3`
- [ ] Replace API key with Bearer token in environment variables
- [ ] Implement rate limit handling (RateLimitHandler)
- [ ] Update error handling for HTTP 429 responses
- [ ] Test authentication with new token

### Phase 3: Endpoint Migration
- [ ] Update all API client calls to new base URL
- [ ] Verify request/response formats (should be mostly compatible)
- [ ] Test CRUD operations for each resource type
- [ ] Verify pagination still works correctly
- [ ] Test filtering and query parameters

### Phase 4: Testing
- [ ] Unit tests pass with v3 endpoints
- [ ] Integration tests pass
- [ ] Rate limiting works correctly
- [ ] Error handling catches all scenarios
- [ ] Monitor API metrics in production

### Phase 5: Deployment
- [ ] Deploy to staging environment first
- [ ] Monitor for errors and rate limit issues
- [ ] Gradual rollout to production
- [ ] Keep v2 credentials as fallback initially
- [ ] Full cutover after stability confirmed

## Backwards Compatibility

**There is NO backwards compatibility between v2 and v3 APIs.**

Key differences:
1. Different base URLs (cannot use v2 URLs with v3)
2. Different authentication tokens (cannot use v2 API key with v3)
3. Different rate limiting behavior
4. Some endpoint improvements in v3

**Recommendation:** Complete migration within a single deployment to avoid maintaining dual implementations.

## Common Migration Issues

### Issue 1: HTTP 401 Unauthorized

**Cause:** Using v2 API key instead of v3 Bearer token

**Solution:**
```bash
# Wrong - v2 API key
Authorization: Bearer sk_live_xyz123...

# Correct - v3 JWT token
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Issue 2: HTTP 404 Not Found

**Cause:** Using old v2 base URL

**Solution:**
```diff
- https://api.flour.cloud/api/v2/articles
+ https://flour.host/v3/articles
```

### Issue 3: HTTP 429 Too Many Requests

**Cause:** Exceeding 60 requests/minute limit without retry logic

**Solution:** Implement RateLimitHandler (see above)

## Testing Strategy

### 1. Parallel Testing (Recommended)

Run v2 and v3 in parallel initially:

```typescript
const v2Client = createV2Client();
const v3Client = createV3Client();

// Compare results
const v2Data = await v2Client.getArticles();
const v3Data = await v3Client.getArticles();

console.log('Data matches:', deepEqual(v2Data, v3Data));
```

### 2. Feature Flags

Use feature flags for gradual migration:

```typescript
const USE_V3_API = process.env.FEATURE_FLOURIO_V3 === 'true';

const client = USE_V3_API
  ? createV3Client()
  : createV2Client();
```

### 3. Monitoring

Monitor both APIs during transition:

```typescript
const metrics = {
  v2: { requests: 0, errors: 0 },
  v3: { requests: 0, errors: 0, rateLimits: 0 }
};

// Track and compare
```

## Support

### v2 (Legacy)
- **Email:** team@bitbakers.de
- **Status:** Deprecated, migration recommended

### v3 (Current)
- **Email:** developer@flour.io
- **Documentation:** https://flour.host/api/v3-json (OpenAPI/Swagger)
- **Status:** Active, recommended for all new integrations

## Resources

- [v3 Authentication Guide](./AUTHENTICATION.md)
- [v3 API Reference (HTML)](./api-reference.html)
- [v3 Swagger JSON](./swagger.json)
- [v2 Archived Documentation](../flourio-api-v2-archived/)

---

**Last Updated:** 2025-10-16
**Migration Status:** In Progress
**Recommended Timeline:** Complete within 1-2 sprints

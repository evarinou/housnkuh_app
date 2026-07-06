# FlourIO Article Management API Documentation

## Overview
Backend API endpoints for FlourIO integration and Article Management. Supports both **Admin** and **Vendor** access with automatic permission filtering.

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:5000/api
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Route Structure

### Current (Phase 1)
All FlourIO endpoints are under `/admin/flourio/*`:
- Admins: Full access to all products
- Vendors: Access only to their own products (automatic filtering)

### Future (Phase 2)
When Vendors get their own UI, duplicate mount under `/vendor/flourio/*`:
- `/admin/flourio/*` - Admin interface
- `/vendor/flourio/*` - Vendor interface (same controller, same logic)

---

## Endpoints

### 1. GET `/api/admin/flourio/categories`
Get cached FlourIO categories from local database.

**Access:** Admin + Vendor (read-only)

**Query Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "flourioId": "vegetables",
      "name": "Vegetables",
      "vatRate": 7,
      "isActive": true,
      "lastSyncedAt": "2025-10-17T10:00:00.000Z",
      "createdAt": "2025-10-01T08:00:00.000Z",
      "updatedAt": "2025-10-17T10:00:00.000Z"
    },
    {
      "flourioId": "fruits",
      "name": "Fruits",
      "vatRate": 7,
      "isActive": true,
      "lastSyncedAt": "2025-10-17T10:00:00.000Z"
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized (no token)
- `403`: Forbidden (not admin or vendor)
- `500`: Server error

**Example:**
```bash
curl -X GET http://localhost:5000/api/admin/flourio/categories \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 2. POST `/api/admin/flourio/categories/sync`
Trigger category sync from FlourIO API to local cache.

**Access:** Admin only

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "flourioId": "vegetables",
      "name": "Vegetables",
      "vatRate": 7,
      "isActive": true
    }
  ],
  "message": "Synced 10 categories (5 created, 3 updated, 2 deactivated)"
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden (not admin)
- `500`: Server error (FlourIO API down, etc.)

**Example:**
```bash
curl -X POST http://localhost:5000/api/admin/flourio/categories/sync \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### 3. GET `/api/admin/flourio/products`
Get products with optional filtering.

**Access:** Admin + Vendor
- **Admin:** Sees all products
- **Vendor:** Sees only their own products (automatic filter: `vendorId = user.id`)

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `search` | string | Search in product name/description | `?search=apple` |
| `syncStatus` | string | Filter by sync status | `?syncStatus=synced` |
| `category` | string | Filter by category | `?category=fruits` |

**Sync Status Values:**
- `never` - Product never synced to FlourIO
- `pending` - Waiting for sync
- `synced` - Successfully synced
- `error` - Sync failed (check `flourioSync.error`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "67123abc456def789012",
      "name": "Organic Apple",
      "description": "Fresh organic apples from local farm",
      "category": "fruits",
      "price": 2.99,
      "priceUnit": "kg",
      "flourioSync": {
        "articleId": "art456",
        "status": "synced",
        "lastSyncedAt": "2025-10-17T10:00:00.000Z"
      },
      "vendorId": {
        "_id": "688386f3999dd3af66656223",
        "name": "Müller Farm",
        "email": "mueller@farm.de"
      },
      "tags": [
        {
          "_id": "tag123",
          "name": "Organic",
          "color": "#4CAF50"
        }
      ],
      "createdAt": "2025-10-01T08:00:00.000Z"
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Server error

**Examples:**
```bash
# Get all products (Admin sees all, Vendor sees only own)
curl -X GET http://localhost:5000/api/admin/flourio/products \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search for apples
curl -X GET "http://localhost:5000/api/admin/flourio/products?search=apple" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get only pending products
curl -X GET "http://localhost:5000/api/admin/flourio/products?syncStatus=pending" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Combine filters
curl -X GET "http://localhost:5000/api/admin/flourio/products?category=fruits&syncStatus=synced" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. POST `/api/admin/flourio/products/:id/sync`
Sync single product to FlourIO article (create or update).

**Access:** Admin + Vendor
- **Admin:** Can sync any product
- **Vendor:** Can only sync their own products (ownership check: `product.vendorId === user.id`)

**URL Parameters:**
- `id` (required): MongoDB ObjectId of the product

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "_id": "67123abc456def789012",
      "name": "Organic Apple",
      "flourioSync": {
        "articleId": "art456",
        "status": "synced",
        "lastSyncedAt": "2025-10-17T10:30:00.000Z"
      }
    },
    "flourioArticle": {
      "id": "art456",
      "Bezeichnung": "Organic Apple",
      "Beschreibung": "Fresh organic apples from local farm",
      "Preis": 2.99,
      "Kategorie": "fruits",
      "MwStSatz": 7
    }
  },
  "message": "Article created successfully"
}
```

**Status Codes:**
- `200`: Success (created or updated)
- `400`: Bad request (validation error)
- `401`: Unauthorized
- `403`: Forbidden (vendor trying to sync another vendor's product)
- `404`: Product not found
- `500`: Server error (FlourIO API error, category not found, etc.)

**Error Response Example:**
```json
{
  "success": false,
  "message": "You can only sync your own products"
}
```

**Examples:**
```bash
# Sync product
curl -X POST http://localhost:5000/api/admin/flourio/products/67123abc456def789012/sync \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 5. POST `/api/admin/flourio/products/sync-bulk`
Bulk sync multiple products to FlourIO.

**Access:** Admin + Vendor
- **Admin:** Can sync any products
- **Vendor:** Automatically filtered to only their own products

**Request Body:**
```json
{
  "productIds": [
    "67123abc456def789012",
    "67123abc456def789013",
    "67123abc456def789014"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "synced": 8,
    "failed": 2,
    "errors": [
      {
        "productId": "67123abc456def789013",
        "error": "Category 'invalid-category' not found in FlourIO. Please sync categories first."
      },
      {
        "productId": "67123abc456def789014",
        "error": "Product validation failed: price is required"
      }
    ]
  },
  "message": "Sync completed: 8 synced, 2 failed"
}
```

**Vendor Behavior:**
If a vendor provides product IDs that don't belong to them, those IDs are automatically filtered out:
```json
{
  "success": false,
  "message": "None of the provided products belong to you"
}
```

**Status Codes:**
- `200`: Success (partial or complete)
- `400`: Bad request (missing or invalid productIds array)
- `401`: Unauthorized
- `403`: Forbidden (vendor has no access to any provided products)
- `500`: Server error

**Examples:**
```bash
# Sync multiple products
curl -X POST http://localhost:5000/api/admin/flourio/products/sync-bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productIds": [
      "67123abc456def789012",
      "67123abc456def789013"
    ]
  }'
```

---

## Error Response Format

All endpoints follow a consistent error format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Technical error details (optional)"
}
```

**Common Error Messages:**
- `"No token, authorization denied"` - Missing Authorization header
- `"Token ist ungültig"` - Invalid or expired JWT token
- `"Access denied. Admin or Vendor rights required."` - User is neither admin nor vendor
- `"You can only sync your own products"` - Vendor trying to access another vendor's product
- `"Product not found"` - Invalid product ID
- `"Category 'X' not found in FlourIO. Please sync categories first."` - Category needs to be synced
- `"Product validation failed: ..."` - Product data incomplete

---

## Product Sync Flow

### 1. Category Sync (Admin only)
```
POST /api/admin/flourio/categories/sync
    ↓
Fetch categories from FlourIO API
    ↓
Update/Create in local cache (FlourioCategory model)
    ↓
Return synced categories
```

### 2. Product Sync
```
POST /api/admin/flourio/products/:id/sync
    ↓
Validate product data (name, price, category required)
    ↓
Check if category exists in FlourIO cache
    ↓
Create or update article in FlourIO
    ↓
Update product.flourioSync status
    ↓
Return updated product + FlourIO article
```

### 3. Error Handling
- Product validation errors → Status remains `error`
- FlourIO API errors → Status set to `error`, error message saved
- Category not found → Sync fails, user must sync categories first
- Vendor ownership violation → 403 Forbidden

---

## Product-to-Article Field Mapping

| Product Field | FlourIO Article Field | Notes |
|---------------|----------------------|-------|
| `name` | `Bezeichnung` | Required |
| `description` | `Beschreibung` | Optional |
| `price` | `Preis` | Required, in EUR |
| `priceUnit` | `Einheit` | kg, piece, liter, etc. |
| `category` | `Kategorie` | Must exist in FlourIO cache |
| `vendorId` | Mapped via `BusinessPartner` | Vendor's FlourIO customer ID |

---

## Permission Matrix

| Endpoint | Admin | Vendor | Notes |
|----------|-------|--------|-------|
| GET `/categories` | ✅ All | ✅ All | Read-only for both |
| POST `/categories/sync` | ✅ Yes | ❌ No | Admin only - critical operation |
| GET `/products` | ✅ All products | ✅ Own products only | Automatic filtering by `vendorId` |
| POST `/products/:id/sync` | ✅ Any product | ✅ Own products only | Ownership check: `product.vendorId === user.id` |
| POST `/products/sync-bulk` | ✅ Any products | ✅ Own products only | Automatic filtering by `vendorId` |

---

## Testing

### Manual Testing with curl

#### 1. Get Admin Token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

#### 2. Get Vendor Token
```bash
curl -X POST http://localhost:5000/api/vendor-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vendor@example.com","password":"password"}'
```

#### 3. Test Category Sync (Admin)
```bash
curl -X POST http://localhost:5000/api/admin/flourio/categories/sync \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### 4. Test Product List (Admin vs Vendor)
```bash
# Admin sees all products
curl -X GET http://localhost:5000/api/admin/flourio/products \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Vendor sees only own products
curl -X GET http://localhost:5000/api/admin/flourio/products \
  -H "Authorization: Bearer VENDOR_TOKEN"
```

#### 5. Test Product Sync (Vendor)
```bash
# Vendor syncs own product - should work
curl -X POST http://localhost:5000/api/admin/flourio/products/OWN_PRODUCT_ID/sync \
  -H "Authorization: Bearer VENDOR_TOKEN"

# Vendor tries to sync another vendor's product - should fail with 403
curl -X POST http://localhost:5000/api/admin/flourio/products/OTHER_PRODUCT_ID/sync \
  -H "Authorization: Bearer VENDOR_TOKEN"
```

---

## Frontend Integration

### React/TypeScript Example

```typescript
// api/flourioApi.ts
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const flourioApi = {
  // Get categories
  async getCategories() {
    const response = await fetch(`${API_BASE}/admin/flourio/categories`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Get products with filters
  async getProducts(filters?: { search?: string; syncStatus?: string; category?: string }) {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`${API_BASE}/admin/flourio/products?${params}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Sync single product
  async syncProduct(productId: string) {
    const response = await fetch(`${API_BASE}/admin/flourio/products/${productId}/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  },

  // Bulk sync
  async syncBulkProducts(productIds: string[]) {
    const response = await fetch(`${API_BASE}/admin/flourio/products/sync-bulk`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ productIds })
    });
    return response.json();
  }
};
```

---

## Future: Vendor-Specific Routes (Phase 2)

When vendors get their own UI, add duplicate mount in `routes/index.ts`:

```typescript
// Admin interface (existing)
router.use('/admin/flourio', flourioRoutes);

// Vendor interface (new)
router.use('/vendor/flourio', flourioRoutes);
```

**Result:**
- `/api/admin/flourio/products` - Admin UI calls this
- `/api/vendor/flourio/products` - Vendor UI calls this
- **Same controller, same logic** - Automatic permission filtering based on JWT token

**Benefits:**
- ✅ Consistent with existing `/vendor/contracts`, `/vendor/trial` pattern
- ✅ Clear separation in frontend routing
- ✅ No code duplication
- ✅ Easy to implement when needed

---

## Related Files

### Backend
- **Controller:** `server/src/controllers/flourioController.ts`
- **Routes:** `server/src/routes/flourioRoutes.ts`
- **Services:** `server/src/services/flourio/services/`
  - `CategoryService.ts` - Category sync logic
  - `ArticleService.ts` - Product-to-article sync logic
- **Models:**
  - `server/src/models/Product.ts` - Product with `flourioSync` field
  - `server/src/models/FlourioCategory.ts` - Cached categories

### Tests
- `server/src/services/flourio/services/CategoryService.test.ts`
- `server/src/services/flourio/services/ArticleService.test.ts`

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-17 | 1.0.0 | Initial API implementation with Admin + Vendor support |

---

**Last Updated:** 2025-10-17
**API Version:** 1.0.0
**Maintained by:** housnkuh Development Team

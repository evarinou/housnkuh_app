# FlourIO API - Quick Start für Frontend

## ⚠️ Wichtige Info: Korrekte Endpoints

Das Frontend sollte **NICHT** `/api/admin/products` aufrufen, sondern:

```
✅ /api/admin/flourio/products
✅ /api/admin/flourio/categories
```

## 🚀 Die 5 Endpoints

### 1. Categories abrufen (Admin + Vendor)
```javascript
GET /api/admin/flourio/categories
```

### 2. Categories syncen (Admin only)
```javascript
POST /api/admin/flourio/categories/sync
```

### 3. Products abrufen mit Filter (Admin + Vendor)
```javascript
GET /api/admin/flourio/products?search=apple&syncStatus=pending&category=fruits
```
- **Admin:** Sieht alle Produkte
- **Vendor:** Sieht nur eigene Produkte (automatisch gefiltert)

### 4. Einzelnes Product syncen (Admin + Vendor)
```javascript
POST /api/admin/flourio/products/:id/sync
```
- **Vendor:** Kann nur eigene Produkte syncen (403 wenn fremd)

### 5. Bulk Product Sync (Admin + Vendor)
```javascript
POST /api/admin/flourio/products/sync-bulk
Body: { "productIds": ["id1", "id2", "id3"] }
```
- **Vendor:** Wird automatisch auf eigene Produkte gefiltert

## 📦 Response Format

Alle Endpoints nutzen:
```javascript
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

Fehler:
```javascript
{
  "success": false,
  "message": "Error message",
  "error": "Technical details"
}
```

## 🔐 Authentication

Bearer Token in Authorization Header:
```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

## 💡 Vendor vs Admin

| Feature | Admin | Vendor |
|---------|-------|--------|
| Alle Produkte sehen | ✅ | ❌ (nur eigene) |
| Fremde Produkte syncen | ✅ | ❌ (403 Forbidden) |
| Categories syncen | ✅ | ❌ (Admin only) |
| Eigene Produkte syncen | ✅ | ✅ |

## 🎯 Zukunft: Vendor-spezifische Routes

Wenn Vendors eigene UI bekommen:
- Admin UI → `/api/admin/flourio/*`
- Vendor UI → `/api/vendor/flourio/*` (gleiche Logik!)

## 📖 Vollständige Dokumentation

Siehe: `server/docs/API_FLOURIO_ARTICLE_MANAGEMENT.md`

---

**Fragen?** Siehe vollständige API-Docs mit Beispielen, Error Codes und Test-Curl-Commands!

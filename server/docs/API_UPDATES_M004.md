# API Updates for M004 - Mietfächer Types and Booking Improvements

## Overview
This document outlines the API changes implemented in Milestone M004 Sprint 002 for enhanced Mietfächer types and booking comments functionality.

## Updated Endpoints

### 1. Vendor Registration API

#### `POST /api/vendor-auth/register`

**New Field Added:**
```typescript
{
  // ... existing fields
  comments?: string  // Optional booking comments (max 500 characters)
}
```

**Request Example:**
```json
{
  "email": "vendor@example.com",
  "password": "SecurePassword123",
  "name": "John Doe",
  "telefon": "01234567890",
  "strasse": "Hauptstraße",
  "hausnummer": "123",
  "plz": "12345",
  "ort": "Berlin",
  "unternehmen": "Bio Farm GmbH",
  "comments": "Ich hätte gerne ein Mietfach mit guter Sichtbarkeit für meine Bio-Produkte.",
  "packageData": {
    "selectedProvisionType": "percentage",
    "selectedPackages": ["block-cold", "block-frozen"],
    "packageCounts": {
      "block-cold": 1,
      "block-frozen": 1
    },
    "packageOptions": [
      {
        "id": "block-cold",
        "name": "Verkaufsblock gekühlt",
        "price": 50,
        "description": "Gekühlter Bereich"
      },
      {
        "id": "block-frozen",
        "name": "Verkaufsblock gefroren", 
        "price": 60,
        "description": "Gefrorener Bereich"
      }
    ],
    "rentalDuration": 6,
    "totalCost": {
      "monthly": 110,
      "oneTime": 50,
      "provision": 15
    }
  }
}
```

**Validation Rules:**
- `comments`: Optional, max 500 characters, HTML tags stripped, XSS protection
- Package types must be from valid list (see below)
- All existing validation rules apply

### 2. Admin Booking Confirmation API

#### `POST /api/admin/pending-bookings/confirm/:userId`

**New Field Added:**
```typescript
{
  assignedMietfaecher: string[],  // Array of Mietfach IDs
  priceAdjustments?: {            // Optional price adjustments per Mietfach
    [mietfachId: string]: number  // Individual price in EUR (0-1000)
  }
}
```

**Request Example:**
```json
{
  "assignedMietfaecher": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012"
  ],
  "priceAdjustments": {
    "507f1f77bcf86cd799439011": 45.00,  // Custom price for first Mietfach
    "507f1f77bcf86cd799439012": 65.50   // Custom price for second Mietfach
  }
}
```

**Validation Rules:**
- `priceAdjustments`: Optional object
- Mietfach IDs must be valid ObjectIds
- Mietfach IDs must be in the `assignedMietfaecher` list
- Prices must be numbers between 0 and 1000 EUR
- Prices are rounded to 2 decimal places

## Updated Package Types

### Valid Package Types
The following package types are now supported:

| Package ID | Mietfach Type | Description |
|------------|---------------|-------------|
| `block-a` | `regal` | Standard Regal Typ A |
| `block-b` | `regal-b` | Standard Regal Typ B |
| `block-cold` | `kuehlregal` | Kühlregal |
| `block-frozen` | `gefrierregal` | **NEW** Gefrierregal |
| `block-table` | `verkaufstisch` | **NEW** Verkaufstisch |
| `block-other` | `sonstiges` | **NEW** Sonstiges Mietfach |
| `block-display` | `schaufenster` | **NEW** Schaufenster |

### Package Data Structure Validation

```typescript
interface PackageData {
  selectedProvisionType: string;
  selectedPackages: string[];
  packageCounts: Record<string, number>;
  packageOptions: Array<{
    id: string;           // Must be valid package type
    name: string;
    price: number;        // Must be >= 0
    description?: string;
    image?: string;
    detail?: string;
  }>;
  selectedAddons: string[];
  rentalDuration: number; // Must be 1-24 months
  totalCost: {
    monthly: number;      // Must be >= 0
    oneTime: number;      // Must be >= 0
    provision: number;    // Must be >= 0
  };
}
```

## Input Validation

### Comment Validation
- **Length**: Maximum 500 characters
- **Security**: HTML tags stripped, XSS protection applied
- **Processing**: Trimmed and sanitized before storage
- **Optional**: Empty/undefined comments are allowed

### Price Adjustment Validation
- **Range**: 0.00 - 1000.00 EUR
- **Format**: Numbers with up to 2 decimal places
- **Scope**: Only for assigned Mietfächer
- **Security**: Mietfach ID validation prevents unauthorized access

### Package Type Validation
- **Whitelist**: Only predefined package types accepted
- **Structure**: Complete package option objects required
- **Pricing**: All prices must be non-negative numbers
- **Duration**: Rental duration 1-24 months

## Response Changes

### Vendor Registration Response
```json
{
  "success": true,
  "message": "Registrierung erfolgreich",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "pendingBooking": {
      "packageData": { /* package configuration */ },
      "comments": "User's booking comments",  // NEW FIELD
      "status": "pending",
      "createdAt": "2025-06-12T10:00:00Z"
    }
  }
}
```

### Admin Confirmation Response
```json
{
  "success": true,
  "message": "Buchung erfolgreich bestätigt",
  "vertrag": {
    "id": "507f1f77bcf86cd799439013",
    "services": [
      {
        "mietfach": "507f1f77bcf86cd799439011",
        "monatspreis": 45.00,  // May include price adjustments
        "mietbeginn": "2025-06-12T00:00:00Z",
        "mietende": "2025-12-12T23:59:59Z"
      }
    ]
  }
}
```

## Error Handling

### New Validation Errors

| Error Code | Message | Cause |
|------------|---------|-------|
| 400 | "Kommentar darf maximal 500 Zeichen lang sein" | Comment too long |
| 400 | "Kommentar enthält nicht erlaubte Zeichen" | XSS attempt detected |
| 400 | "Ungültiger Package-Typ: {type}" | Invalid package type |
| 400 | "Ungültiger Preis für Mietfach {id}: muss eine Zahl sein" | Invalid price format |
| 400 | "Preis für Mietfach {id} darf nicht über 1000€ liegen" | Price too high |
| 400 | "Mietfach-ID {id} ist nicht in der Zuordnungsliste" | Unauthorized price adjustment |

## Backward Compatibility

- All existing API endpoints remain functional
- `comments` field is optional - existing clients continue to work
- `priceAdjustments` field is optional - existing admin flows work
- Package type validation is additive - existing types still work
- Response structure unchanged except for new optional fields

## Security Considerations

- **XSS Protection**: Comments are sanitized to prevent script injection
- **Input Validation**: All user inputs validated before processing
- **Authorization**: Price adjustments require admin privileges
- **Data Integrity**: Mietfach ID validation prevents unauthorized access
- **Rate Limiting**: Standard rate limiting applies to all endpoints

## Testing

Test the updated endpoints with:
```bash
node server/scripts/test-api-endpoints.js
```

This script validates:
- ✅ Comments field integration
- ✅ Input validation for comments and prices  
- ✅ New package types acceptance
- ✅ Invalid package type rejection
- ✅ XSS protection for malicious comments

---

*Documentation updated for M004_S002 - Backend API and Logic Updates*  
*Last updated: 2025-06-12*
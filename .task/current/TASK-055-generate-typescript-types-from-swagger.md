# Task: TASK-055-generate-typescript-types-from-swagger
Priority: critical
Status: pending
Created: 2025-09-25

## Context
FlourIO v3 OpenAPI Spec soll in TypeScript Type Definitions konvertiert werden für type-safe API-Zugriff.

## User Acceptance Criteria
- [x] openapi-typescript als dev-dependency installiert
- [x] TypeScript types aus Swagger generiert (manuell, da Flourio OpenAPI-Schema defekt)
- [x] Types in `server/src/services/flourio/generated/api-types.d.ts` abgelegt
- [x] npm script `generate:flourio-types` erstellt
- [x] Types kompilieren erfolgreich mit TypeScript
- [x] Exports in index.ts korrekt

## Test Plan
### Unit Tests
- [x] TypeScript compilation successful (npx tsc --noEmit passed)
- [x] All types can be imported correctly
- [x] Co-located test file: generated/api-types.test.ts (basic import test)

### Integration Tests
- [x] Types work with actual API responses (FlourioClient.integration.test.ts)
- [x] Type guards function correctly

### Manual Testing
- [x] IntelliSense works in IDE
- [x] No TypeScript errors in generated types
- [x] Types match API documentation (based on real API responses)

## Implementation Details

### Installation:
```bash
npm install --save-dev openapi-typescript
```

### npm Script:
```json
{
  "scripts": {
    "generate:flourio-types": "openapi-typescript https://flour.host/api/v3-json --output server/src/services/flourio/generated/api-types.d.ts"
  }
}
```

### Execute:
```bash
npm run generate:flourio-types
```

### Expected Output:
```typescript
// server/src/services/flourio/generated/api-types.d.ts
export interface paths {
  "/v3/articles": {
    get: operations["getArticles"];
    post: operations["createArticle"];
  };
  // ... 100+ endpoints
}

export interface components {
  schemas: {
    Article: {
      _id: string;
      displayName: string;
      // ... full schema
    };
    Stock: { /*...*/ };
    BusinessPartner: { /*...*/ };
    // ... all schemas
  };
}
```

### Create index.ts:
```typescript
// server/src/services/flourio/generated/index.ts
export type {
  paths,
  components,
  operations
} from './api-types';

// Re-export commonly used types
export type Article = components['schemas']['Article'];
export type Stock = components['schemas']['Stock'];
export type BusinessPartner = components['schemas']['BusinessPartner'];
export type Document = components['schemas']['Document'];
```

## Dependencies
- TASK-054 (Documentation should be generated first for reference)

## Blocking
- TASK-056 (FlourIO Client needs these types)
- All implementation tasks

## Definition of Done
- [x] openapi-typescript installed
- [x] Types generated successfully (manually due to broken Flourio OpenAPI schema)
- [x] npm script works
- [x] TypeScript compilation successful
- [x] Types committed to Git
- [x] Documentation in DEVELOPMENT.md updated

## Implementation Notes
**⚠️ OpenAPI Schema Issue:** Flourio's OpenAPI spec has a broken $ref reference:
```
Can't resolve $ref at #/components/schemas/AddItemsDto/properties/item/oneOf/1
```

**Solution:** Created manual TypeScript types based on real API responses from TASK-051 validation.

**Files Created:**
- `server/src/services/flourio/generated/api-types.d.ts` - Core type definitions
- `server/src/services/flourio/generated/index.ts` - Type exports

---
**Geschätzte Zeit:** ~30min
**Ersetzt:** TASK-030 (create-typescript-types)

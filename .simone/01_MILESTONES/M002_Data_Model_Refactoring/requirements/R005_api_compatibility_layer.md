---
requirement_id: R005
milestone_id: M002
title: API Compatibility Layer
priority: high
status: pending
estimated_effort: 8-10 hours
dependencies: [R001, R002, R003]
---

# R005: API Compatibility Layer

## Description
Implement a compatibility layer to ensure all existing API endpoints continue working during and after the model refactoring, preventing breaking changes for API consumers.

## Current API Structure
Existing endpoints expect User model structure:
```json
{
  "_id": "...",
  "username": "vendor1",
  "isVendor": true,
  "kontakt": { ... },
  "vendorProfile": { ... },
  "registrationStatus": "active"
}
```

## Compatibility Approach

### 1. Response Shaping Layer
```typescript
class UserCompatibilityService {
  static async getUserWithVendorData(userId: string) {
    const [baseUser, vendor, subscriber] = await Promise.all([
      BaseUser.findById(userId),
      Vendor.findOne({ userId }),
      NewsletterSubscriber.findOne({ userId })
    ]);
    
    // Shape response to match old structure
    return {
      _id: baseUser._id,
      username: baseUser.username,
      isAdmin: baseUser.isAdmin,
      isVendor: !!vendor,
      kontakt: {
        email: baseUser.email,
        name: vendor?.businessName || subscriber?.name || '',
        mailNewsletter: !!subscriber?.isSubscribed,
        newsletterConfirmed: !!subscriber?.confirmedAt
      },
      vendorProfile: vendor ? {
        unternehmen: vendor.unternehmen,
        beschreibung: vendor.beschreibung,
        // ... map other fields
      } : undefined,
      registrationStatus: vendor?.registrationStatus
    };
  }
}
```

### 2. Controller Adapters
```typescript
// Adapter for existing endpoints
export const getUserProfile = async (req: Request, res: Response) => {
  const userId = req.params.id;
  
  // Use compatibility service
  const userProfile = await UserCompatibilityService.getUserWithVendorData(userId);
  
  res.json({
    success: true,
    user: userProfile
  });
};
```

### 3. Gradual Migration Path
1. **Phase 1**: All endpoints use compatibility layer
2. **Phase 2**: New v2 endpoints with optimized responses
3. **Phase 3**: Deprecation notices on v1 endpoints
4. **Phase 4**: Remove compatibility layer after transition period

## Implementation Steps
1. Create UserCompatibilityService
2. Implement response shaping methods
3. Update all controllers to use compatibility service
4. Add deprecation headers to old endpoints
5. Document new v2 endpoint structure
6. Create migration guide for API consumers

## New Optimized Endpoints (v2)
```typescript
// Separate endpoints for different concerns
GET /api/v2/users/:id          // Basic user info only
GET /api/v2/vendors/:userId     // Vendor-specific data
GET /api/v2/subscribers/:email  // Newsletter subscription info

// Composite endpoint when needed
GET /api/v2/profiles/:userId    // Intelligently combines data
```

## Acceptance Criteria
- [ ] All existing endpoints return same response structure
- [ ] No breaking changes for API consumers
- [ ] Performance overhead < 10ms per request
- [ ] Deprecation warnings implemented
- [ ] v2 endpoints documented
- [ ] Migration guide published

## Testing Requirements
- Response structure comparison tests
- Performance benchmarks
- Integration tests for all endpoints
- Deprecation header tests
- v2 endpoint tests

## Deprecation Timeline
- Month 1-2: Compatibility layer active, no warnings
- Month 3-4: Deprecation warnings added
- Month 5-6: Push for migration to v2
- Month 7+: Consider removing v1 endpoints

## Documentation Updates
- API changelog with migration guide
- v2 endpoint documentation
- Code examples for migration
- Performance improvement metrics

## Notes
- Monitor API usage to identify high-traffic endpoints
- Consider API versioning strategy for future
- Provide SDK updates if applicable
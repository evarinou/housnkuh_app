---
requirement_id: R002
milestone_id: M002
title: Extract Vendor Model
priority: critical
status: pending
estimated_effort: 12-16 hours
dependencies: [R001]
---

# R002: Extract Vendor Model

## Description
Create a dedicated Vendor model that contains all vendor-specific data, linked to the BaseUser model via userId reference.

## Current State
Vendor data is mixed within the User model:
- vendorProfile (business info, hours, social media)
- registrationStatus, trialStartDate, trialEndDate
- isPubliclyVisible
- pendingBooking
- isVendor flag

## Target State
A dedicated Vendor model:
```typescript
interface IVendor {
  _id: ObjectId;
  userId: ObjectId; // Reference to BaseUser
  
  // Business Information
  unternehmen: string;
  beschreibung: string;
  slogan?: string;
  kategorien: string[];
  
  // Profile Data
  profilBild?: string;
  oeffnungszeiten: IOpeningHours;
  website?: string;
  socialMedia: ISocialMedia;
  
  // Contact (vendor-specific)
  businessEmail: string;
  businessPhone: string;
  addresses: IAddress[];
  
  // Trial & Status
  registrationStatus: RegistrationStatus;
  registrationDate: Date;
  trialStartDate?: Date;
  trialEndDate?: Date;
  
  // Visibility
  isPubliclyVisible: boolean;
  verifyStatus: VerifyStatus;
  
  // Bookings
  pendingBooking?: IPendingBooking;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

## Implementation Steps
1. Design Vendor schema with proper relationships
2. Create Vendor model with TypeScript interfaces
3. Implement vendor-specific methods
4. Create data migration script
5. Update vendor-related controllers
6. Refactor vendor authentication to use joined queries
7. Update public vendor listing endpoints

## Acceptance Criteria
- [ ] Vendor model contains all vendor-specific data
- [ ] One-to-one relationship with BaseUser established
- [ ] All vendor features work with new model
- [ ] Migration preserves all vendor data
- [ ] Vendor queries don't load unnecessary user data
- [ ] API responses maintain same structure (compatibility)

## Testing Requirements
- Unit tests for Vendor model
- Integration tests for vendor registration flow
- Tests for vendor profile updates
- Performance tests for vendor listings
- Migration integrity tests

## Dependencies
- R001 (BaseUser model must exist first)

## API Changes
- Internal: Controllers will query Vendor model
- External: Response shaping maintains compatibility
- New optimized endpoints can be added later

## Notes
- Consider indexing strategies for vendor queries
- Plan for future many-to-many relationships (multiple vendors per user)
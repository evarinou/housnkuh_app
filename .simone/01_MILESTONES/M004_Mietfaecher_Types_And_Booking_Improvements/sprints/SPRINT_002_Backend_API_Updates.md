---
sprint_id: M004_S002
milestone_id: M004
title: Backend API and Logic Updates
status: planned
priority: high
estimated_effort: 6-8 hours
sprint_duration: 2 days
dependencies: [M004_S001]
---

# Sprint M004_S002: Backend API and Logic Updates

## Sprint Goal
Update backend APIs to handle new Mietfächer types, booking comments, and admin pricing adjustments.

## Sprint Backlog

### API Endpoint Updates
1. **Vendor Registration Endpoint**
   - Accept `comments` field in registration payload
   - Store comments with pendingBooking data
   - Validate and sanitize comment input
   - Update API documentation

2. **Admin Booking Confirmation Endpoint**
   - Accept individual price adjustments per Mietfach assignment
   - Validate price adjustment ranges
   - Calculate final pricing with discounts
   - Log price changes for audit trail

3. **Package Configuration Logic**
   - Update package type validation for new types
   - Ensure new types properly map to pricing
   - Handle legacy package configurations

### Controller Updates
1. **Vendor Auth Controller**
   ```typescript
   // Update registration to handle comments
   const { packageData, comments } = req.body;
   user.pendingBooking = {
     packageData,
     comments: comments?.trim() || undefined,
     createdAt: new Date(),
     status: 'pending'
   };
   ```

2. **Admin Controller**
   ```typescript
   // Update confirmation to handle price adjustments
   const { mietfachAssignments, priceAdjustments } = req.body;
   // Apply individual pricing per Mietfach
   ```

### Validation & Security
1. **Input Validation**
   - Comment length limits (max 500 characters)
   - Price adjustment validation (positive numbers, reasonable ranges)
   - Sanitize user input to prevent XSS

2. **Authorization Checks**
   - Ensure only admins can adjust pricing
   - Validate admin permissions for booking management

## Acceptance Criteria
- [ ] Registration endpoint accepts and stores comments
- [ ] Admin confirmation endpoint handles price adjustments
- [ ] All new Mietfächer types properly processed
- [ ] Input validation prevents malicious data
- [ ] Price adjustments correctly applied to contracts
- [ ] API responses include new fields where appropriate

## Definition of Done
- [ ] All API endpoints updated and tested
- [ ] Input validation implemented and tested
- [ ] Price adjustment logic working correctly
- [ ] Comments properly stored and retrievable
- [ ] API documentation updated
- [ ] Integration tests passing
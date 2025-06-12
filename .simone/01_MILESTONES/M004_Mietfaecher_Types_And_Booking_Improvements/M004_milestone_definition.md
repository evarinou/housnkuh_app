---
milestone_id: M004
title: Mietfächer Types Extension and Booking Improvements
status: planned
priority: medium
estimated_effort: 25-35 hours
target_completion: 2025-07-15
created_date: 2025-06-12
last_updated: 2025-06-12
---

# Milestone M004: Mietfächer Types Extension and Booking Improvements

## Executive Summary
Extend the current rental booking system with additional Mietfächer types, implement booking comments functionality, and provide admin pricing flexibility during Mietfach assignment.

## Problem Statement
The current system has limited Mietfächer types and lacks:
- Sufficient variety of rental space types for different vendor needs
- Direct communication channel between vendors and admins during booking
- Admin flexibility to adjust pricing based on individual circumstances

## Success Criteria
1. [ ] Seven distinct Mietfächer types available system-wide
2. [ ] Vendors can add optional comments during booking process
3. [ ] Admins can view vendor comments during Mietfach assignment
4. [ ] Admins can adjust monthly pricing before creating contracts
5. [ ] All existing functionality remains intact
6. [ ] Price adjustments properly integrated with discount calculations

## New Mietfächer Types
1. `regal` - Standard shelf space (existing)
2. `regal-b` - Secondary shelf space (existing)
3. `kuehlregal` - Refrigerated shelf space (existing)
4. `gefrierregal` - Freezer shelf space (NEW)
5. `verkaufstisch` - Sales table/counter (replaces vitrine)
6. `sonstiges` - Miscellaneous/Other space (NEW)
7. `schaufenster` - Shop window display (NEW)

## Feature Requirements

### 1. Booking Comments System
- Optional textarea during vendor registration process
- Comments stored with pendingBooking data
- Admin visibility during Mietfach assignment
- Comments preserved in booking history

### 2. Admin Pricing Flexibility
- Individual price adjustment per assigned Mietfach
- Original package price shown as reference
- Adjusted prices applied before discount calculations
- Price change tracking and audit trail

## Technical Approach

### Data Structure Changes
```typescript
// User.pendingBooking extension
pendingBooking: {
  packageData: object,
  comments?: string, // NEW FIELD
  createdAt: Date,
  status: string
}

// Mietfach.typ enum extension
type MietfachTyp = 'regal' | 'regal-b' | 'kuehlregal' | 'gefrierregal' | 'verkaufstisch' | 'sonstiges' | 'schaufenster'
```

## Dependencies
- Completion of current booking system stability
- Admin interface functionality
- Vendor registration flow

## Risks & Mitigation
- **Risk**: Breaking existing package configurations
  - **Mitigation**: Maintain backward compatibility, gradual migration
- **Risk**: Price adjustment errors affecting contracts
  - **Mitigation**: Validation layers, audit logging
- **Risk**: UI complexity increase
  - **Mitigation**: Careful UX design, progressive disclosure

## Deliverables
1. Updated data models and TypeScript interfaces
2. Extended PackageBuilder component
3. Enhanced admin assignment interface
4. Booking comments functionality
5. Price adjustment system
6. Updated API documentation
7. Test coverage for new features
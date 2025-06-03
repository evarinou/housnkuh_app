---
requirement_id: R001
milestone_id: M002
title: Separate Core User Model
priority: critical
status: pending
estimated_effort: 8-12 hours
---

# R001: Separate Core User Model

## Description
Extract core authentication and authorization data from the current User model into a focused BaseUser model that handles only authentication concerns.

## Current State
The User model contains:
- Authentication fields (username, password)
- Authorization fields (isAdmin, isVendor)
- Contact information
- Newsletter preferences
- Vendor profile data
- Trial period data
- Pending bookings

## Target State
A clean BaseUser model containing only:
```typescript
interface IBaseUser {
  _id: ObjectId;
  username: string;
  password: string;
  email: string;
  isAdmin: boolean;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Implementation Steps
1. Create new BaseUser schema
2. Implement authentication methods (comparePassword, generateToken)
3. Update auth middleware to use BaseUser
4. Create migration to extract user data
5. Update authentication endpoints

## Acceptance Criteria
- [ ] BaseUser model contains only authentication-related fields
- [ ] All authentication flows work with new model
- [ ] No vendor or newsletter data in BaseUser
- [ ] Migration preserves all existing user accounts
- [ ] Performance improvement in auth queries

## Testing Requirements
- Unit tests for BaseUser model
- Integration tests for auth flows
- Migration rollback testing
- Performance benchmarks

## Dependencies
- None (this is the foundation for other refactoring)

## Notes
- Maintain backward compatibility during transition
- Consider using TypeScript discriminated unions for user types
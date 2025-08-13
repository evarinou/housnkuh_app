# TASK-033: Fix Dashboard Routing for Vendor Users

**Status**: PENDING
**Created**: 2025-08-12
**Assignee**: Claude
**Priority**: HIGH
**Estimated**: 30min

## Goal
Fix the Navigation component so that the Dashboard link correctly routes vendor users to `/vendor/dashboard` instead of incorrectly routing them to `/admin`.

## Context
During TASK-031 verification testing, discovered that when vendor users are authenticated, the Dashboard link in the navigation incorrectly points to `/admin` instead of `/vendor/dashboard`. This is a critical UX issue that breaks the dual-context authentication system.

## User Acceptance Criteria
- [ ] Vendor users see Dashboard link pointing to `/vendor/dashboard`
- [ ] Admin users see Dashboard link pointing to `/admin` 
- [ ] Navigation component correctly detects user type (admin vs vendor)
- [ ] Dashboard routing works correctly across all public routes
- [ ] No console errors during navigation state detection
- [ ] Manual testing confirms correct routing for both user types

## Technical Details
**Root Cause**: Navigation component likely uses only AuthContext and ignores VendorAuthContext when determining dashboard route.

**Investigation needed**:
1. Check Navigation.tsx component user context detection logic
2. Verify dual-context handling in navigation state
3. Review enhanced dashboard navigation implementation from TASK-032

**Expected Fix**:
```typescript
// Navigation component should check both contexts
const dashboardUrl = vendorAuth.user ? '/vendor/dashboard' : '/admin';
```

## Files to Investigate/Modify
- `client/src/components/layout/Navigation.tsx`
- Related context usage patterns

## Test Plan
### Manual Testing
- [ ] Login as vendor user → Dashboard link shows `/vendor/dashboard`
- [ ] Login as admin user → Dashboard link shows `/admin`
- [ ] Navigate between public/protected routes → correct dashboard link maintained
- [ ] Test authentication state transitions
- [ ] Verify no console errors

## Related Tasks
- Found during: TASK-031 (Verify dashboard link display)
- Blocks completion of: TASK-031 verification
- Related to: TASK-032 (Enhanced dashboard navigation)

## Definition of Done
- [ ] Navigation component correctly routes vendor users to vendor dashboard
- [ ] Navigation component correctly routes admin users to admin dashboard  
- [ ] Manual testing confirms fix works across all routes
- [ ] No console errors during navigation state detection
- [ ] TASK-031 can be completed successfully

---

## Progress Log

### 2025-08-12
- Bug discovered during TASK-031 verification testing
- Dashboard link incorrectly routes vendor users to `/admin` instead of `/vendor/dashboard`
- Critical UX issue affecting dual-authentication system
# T01 - Enhance Navigation for Authenticated Users (R010)

## Task Overview
**Sprint**: S08 - UI Enhancement  
**Requirement**: R010 - Navigation Enhancement for Logged-in Users  
**Priority**: High  
**Estimated Effort**: 2 hours

## Description
Update the navigation to show "Dashboard" instead of "Login" when users are authenticated, applying to both vendor and admin authentication states.

## Acceptance Criteria
- [ ] Navigation shows "Dashboard" when user is logged in (any type)
- [ ] Works for both vendor and admin authentication
- [ ] "Dashboard" link routes to appropriate dashboard
- [ ] Login/Dashboard state updates immediately on auth changes
- [ ] Consistent behavior across all pages
- [ ] No broken navigation states

## Technical Tasks
1. **Update Navigation Logic**
   - Check current authentication state detection
   - Update Navigation/Navbar components
   - Handle both AuthContext and VendorAuthContext

2. **Fix Link Routing**
   - Route admin users to `/admin/dashboard`
   - Route vendors to `/vendor/dashboard`
   - Ensure proper fallback handling

3. **State Management**
   - Ensure navigation updates on login/logout
   - Handle authentication state changes
   - Test edge cases and transitions

4. **Testing**
   - Test admin login → Dashboard link
   - Test vendor login → Dashboard link
   - Test logout → Login link restoration
   - Test page refreshes and direct navigation

## Files to Modify
- `client/src/components/layout/Navigation.tsx`
- `client/src/components/layout/Navbar.tsx`
- `client/src/contexts/AuthContext.tsx`
- `client/src/contexts/VendorAuthContext.tsx`

## Definition of Done
- Navigation correctly shows Dashboard when authenticated
- Both admin and vendor auth states handled
- Smooth transitions between states
- No navigation bugs or broken links
- Consistent behavior across all pages
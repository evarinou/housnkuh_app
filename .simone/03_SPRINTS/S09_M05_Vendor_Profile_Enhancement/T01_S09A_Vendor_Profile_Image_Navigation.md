# T01_S09A: Vendor Profile Image in Navigation

## Task Overview
**Sprint**: S09A - Navigation & Authentication Enhancement  
**Story Points**: 3 SP  
**Priority**: High  
**Type**: Feature Enhancement  

## User Story
**As a** logged-in vendor  
**I want** to see my profile image next to the "Dashboard" link in the navigation  
**So that** I have a personalized and professional navigation experience

## Acceptance Criteria

### AC1: Profile Image Display
- **Given** I am logged in as a vendor with a profile image
- **When** I view the navigation bar
- **Then** I should see my profile image (32x32px, circular) next to the "Dashboard" link

### AC2: Fallback Behavior
- **Given** I am logged in as a vendor without a profile image
- **When** I view the navigation bar
- **Then** I should see a default user icon next to the "Dashboard" link

### AC3: Responsive Design
- **Given** I am on a mobile device
- **When** I view the navigation
- **Then** the profile image should display appropriately in the mobile menu

### AC4: Loading States
- **Given** my profile image is loading
- **When** the navigation renders
- **Then** I should see a loading placeholder until the image loads

## Technical Implementation

### Files to Modify
- `client/src/components/layout/Navigation.tsx` (lines 95-111)

### Implementation Details

#### Desktop Navigation Update
```typescript
// Around line 95-102 in Navigation.tsx
{isAuthenticated ? (
  <NavLink 
    to={dashboardRoute}
    className="flex items-center text-secondary hover:text-primary font-medium"
  >
    {/* Add profile image here for vendor users */}
    {isVendorAuth && vendorUser?.profilBild ? (
      <img 
        src={resolveImageUrl(vendorUser.profilBild)} 
        alt={`${vendorUser.name} Profil`}
        className="w-8 h-8 rounded-full object-cover mr-2 border border-gray-200"
        onError={(e) => {
          // Fallback to default icon on error
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.style.display = 'inline-block';
        }}
      />
    ) : isVendorAuth ? (
      <User className="w-8 h-8 mr-2 p-1 rounded-full bg-gray-100 text-gray-600" />
    ) : null}
    <LayoutDashboard className="w-4 h-4 mr-1" />
    <span>Dashboard</span>
  </NavLink>
) : (
  // existing login link
)}
```

#### Mobile Navigation Update
```typescript
// Around line 178-186 in Navigation.tsx
{isAuthenticated ? (
  <NavLink
    to={dashboardRoute}
    className="flex items-center px-3 py-2 mt-2 rounded-md font-medium text-secondary hover:bg-gray-100"
    onClick={() => setIsOpen(false)}
  >
    {/* Add profile image for mobile */}
    {isVendorAuth && vendorUser?.profilBild ? (
      <img 
        src={resolveImageUrl(vendorUser.profilBild)} 
        alt={`${vendorUser.name} Profil`}
        className="w-6 h-6 rounded-full object-cover mr-2 border border-gray-200"
      />
    ) : isVendorAuth ? (
      <User className="w-6 h-6 mr-2 p-1 rounded-full bg-gray-100 text-gray-600" />
    ) : null}
    <LayoutDashboard className="w-4 h-4 mr-2" />
    Dashboard
  </NavLink>
) : (
  // existing login link
)}
```

### Required Imports
```typescript
import { resolveImageUrl } from '../../utils/imageUtils';
```

## Testing Requirements

### Unit Tests
- Test navigation rendering with vendor profile image
- Test fallback behavior when image fails to load
- Test navigation for vendors without profile images
- Test admin users (should not show profile image)

### Integration Tests
- Test image loading from actual vendor profiles
- Test responsive behavior on different screen sizes
- Test navigation state changes when vendor updates profile image

### Manual Testing Checklist
- [ ] Login as vendor with profile image → verify image appears
- [ ] Login as vendor without profile image → verify fallback icon
- [ ] Login as admin → verify no profile image (only dashboard icon)
- [ ] Test on mobile device → verify proper mobile layout
- [ ] Test image loading failure → verify fallback behavior
- [ ] Test navigation responsiveness across screen sizes

## Dependencies
- Existing `VendorAuthContext` providing user data
- `resolveImageUrl` utility function from `imageUtils.ts`
- Current navigation component structure

## Definition of Done
- [ ] Profile image displays for vendors with images
- [ ] Fallback icon shows for vendors without images
- [ ] Admin users see normal navigation (no profile image)
- [ ] Mobile navigation works correctly
- [ ] Image loading errors handled gracefully
- [ ] Code reviewed and approved
- [ ] Manual testing completed across devices
- [ ] No performance regression in navigation

## Notes
- Keep existing navigation functionality intact
- Maintain accessibility with proper alt text
- Consider image caching for performance
- Ensure circular image styling is consistent with design system
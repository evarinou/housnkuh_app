# T02 - Implement Banner Image Upload (R007)

## Task Overview
**Sprint**: S07 - Vendor Profile Core  
**Requirement**: R007 - Vendor Banner Image Upload  
**Priority**: High  
**Estimated Effort**: 6 hours

## Description
Implement banner image upload functionality for vendors, allowing them to upload a banner image that displays prominently on their profile page.

## Acceptance Criteria
- [ ] Add banner image field to vendor data model
- [ ] Create banner image upload component
- [ ] Implement backend handling for banner uploads
- [ ] Display banner image on vendor profile pages
- [ ] Add validation for banner dimensions and file size
- [ ] Provide upload feedback to users
- [ ] Handle banner image deletion/replacement

## Technical Tasks
1. **Update Data Model**
   - Add bannerImage field to User/Vendor model
   - Update database schema if needed

2. **Backend Implementation**
   - Add banner upload endpoint
   - Configure file storage for banners
   - Add validation for banner images
   - Update existing vendor routes

3. **Frontend Components**
   - Create BannerImageUpload component
   - Add to vendor registration/profile edit
   - Handle file selection and preview
   - Display banner on profile pages

4. **Validation & UX**
   - Validate banner dimensions (e.g., 1200x400px)
   - Limit file size (e.g., max 2MB)
   - Show upload progress
   - Preview before upload

## Files to Create/Modify
- `server/src/models/User.ts` (add bannerImage field)
- `server/src/controllers/vendorAuthController.ts`
- `client/src/components/BannerImageUpload.tsx` (new)
- `client/src/components/VendorRegistrationModal.tsx`
- Vendor profile display components

## Definition of Done
- Banner upload works end-to-end
- Banners display correctly on profile pages
- Proper validation and error handling
- Good user experience with preview and feedback
- Mobile responsive banner display
# T01 - Fix Profile Image Upload (R008)

## Task Overview
**Sprint**: S07 - Vendor Profile Core  
**Requirement**: R008 - Profile Image Upload Fix  
**Priority**: High  
**Estimated Effort**: 4 hours

## Description
Fix the existing profile image upload functionality that is currently not working. Ensure vendors can successfully upload and display profile images.

## Acceptance Criteria
- [ ] Diagnose current profile image upload issues
- [ ] Fix file upload handling on backend
- [ ] Ensure proper image validation (format, size)
- [ ] Fix image storage and file path handling
- [ ] Update frontend to handle upload responses correctly
- [ ] Test complete upload flow from selection to display
- [ ] Add proper error handling and user feedback

## Technical Tasks
1. **Debug Current Implementation**
   - Check vendor registration modal upload logic
   - Verify backend file handling endpoints
   - Check file storage configuration

2. **Fix Backend Issues**
   - Ensure multer middleware configured correctly
   - Fix file path and storage location
   - Add proper image validation

3. **Fix Frontend Issues**
   - Update file input handling
   - Fix FormData submission
   - Add upload progress/status feedback

4. **Testing**
   - Test various image formats and sizes
   - Verify error handling
   - Test image display on profile pages

## Files to Check/Modify
- `client/src/components/VendorRegistrationModal.tsx`
- `server/src/controllers/vendorAuthController.ts`
- `server/src/routes/vendorAuthRoutes.ts`
- Image upload middleware configuration

## Definition of Done
- Profile image upload works end-to-end
- Proper error handling and validation
- Images display correctly on profile pages
- No console errors during upload process
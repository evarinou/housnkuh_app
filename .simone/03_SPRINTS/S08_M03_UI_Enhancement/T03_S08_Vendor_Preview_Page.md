# T03 - Implement Vendor Preview Page (R012)

## Task Overview
**Sprint**: S08 - UI Enhancement  
**Requirement**: R012 - Vendor Preview Page  
**Priority**: Medium  
**Estimated Effort**: 3 hours

## Description
Create a professional preview message on the vendor listing page when no vendors are visible or registered, informing visitors that vendors will be published soon.

## Acceptance Criteria
- [ ] Show preview when vendor list is empty
- [ ] Show preview when no vendors are visible/active
- [ ] Professional and engaging messaging
- [ ] Consistent with overall site design
- [ ] Responsive design for all devices
- [ ] Smooth transition when vendors become available

## Technical Tasks
1. **Create Preview Component**
   - Design VendorListPreview component
   - Professional messaging about upcoming vendors
   - Consistent styling with site theme

2. **Update Vendor Listing Logic**
   - Detect when no vendors to display
   - Handle both empty list and no visible vendors
   - Add conditional rendering logic

3. **Design and Styling**
   - Match site visual design
   - Use appropriate icons or graphics
   - Ensure mobile responsiveness
   - Consider loading states

4. **Content and Messaging**
   - Professional, encouraging tone
   - Mention "coming soon" concept
   - Possibly include newsletter signup prompt
   - Avoid specific timelines

## Files to Create/Modify
- `client/src/components/VendorListPreview.tsx` (new)
- `client/src/pages/DirektvermarkterPage.tsx`
- `client/src/pages/DirektvermarkterUebersichtPage.tsx`
- Related styling files

## Definition of Done
- Preview displays when no vendors available
- Professional and engaging design
- Responsive across all devices
- Consistent with site branding
- Smooth transition to actual vendor list
- No layout issues or visual bugs
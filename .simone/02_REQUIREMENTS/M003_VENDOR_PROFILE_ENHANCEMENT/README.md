# M003 - Vendor Profile Enhancement

## Overview
This milestone focuses on enhancing vendor profiles with image uploads, fixing existing functionality issues, and improving the user experience for both vendors and visitors.

## Requirements

### R007 - Vendor Banner Image Upload
- Vendors can upload a banner image for their profile
- Banner image displays on vendor profile pages
- Image validation and storage handling

### R008 - Profile Image Upload Fix
- Fix the existing profile image upload functionality
- Ensure proper image storage and retrieval
- Validate image formats and sizes

### R009 - Mietfach Pricing Model Correction
- Remove price storage from Mietfach model
- Ensure prices are only stored in Vertrag (contracts)
- Update UI to reflect correct pricing model

### R010 - Navigation Enhancement for Logged-in Users
- Replace "Login" with "Dashboard" when user is authenticated
- Apply to both vendor and admin authentication states
- Maintain consistent navigation experience

### R011 - Launch Date Display Refinement
- Remove specific opening dates from public display
- Show general "coming soon" messaging instead
- Maintain anticipation without concrete commitments

### R012 - Vendor Preview Page
- Display preview message on vendor listing page when no vendors are visible/registered
- Inform visitors that vendors will be published soon
- Professional placeholder content

## Success Criteria
- All image uploads work correctly
- Pricing model is logically consistent
- Navigation reflects authentication state
- No specific dates shown publicly
- Professional vendor preview experience

## Priority
High - Critical for launch readiness

## Dependencies
- M001 (Vendor Registration Trial) must be completed
- Database schema modifications required
- File upload infrastructure needed
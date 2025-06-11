---
task_id: T04_S06
sprint_sequence_id: S06
status: open
complexity: Medium
last_updated: 2025-01-04T12:00:00Z
---

# Task: Public Vendor Filtering and Visibility Controls

## Description

⚠️ **UPDATED REQUIREMENT** - NO COMING SOON FUNCTIONALITY

Implement advanced vendor filtering and visibility controls for public listings (R010). This task enhances the existing vendor discovery interfaces with advanced search capabilities, dynamic filtering options, and proper visibility controls based on vendor status and preferences. 

**IMPORTANT**: This implementation assumes the application is always live - NO Coming Soon page or pre-launch restrictions. All filtering should work immediately for active vendors.

The implementation builds upon the existing `DirektvermarkterUebersichtPage` and `isPubliclyVisible` property infrastructure.

## Goal / Objectives
- Enhance the existing public vendor listing page with advanced filtering capabilities
- Implement dynamic search and filter combinations for better user experience
- Integrate visibility controls with vendor trial status and admin approval workflows
- Provide comprehensive vendor discovery tools for end users

## Technical Guidance

### Current Implementation Analysis
Based on codebase research:

**Existing Components:**
- `DirektvermarkterUebersichtPage.tsx` - Main vendor listing page with basic filtering
- `DirektvermarkterMapPage.tsx` - Map-based vendor discovery
- `DirektvermarkterDetailPage.tsx` - Individual vendor profile pages

**Current Filtering Features:**
- Text search by vendor name, company, and description
- Category filtering with checkbox/dropdown interface
- Location filtering by Mietfach standort
- Responsive design with mobile-optimized category selection

**Vendor Visibility Infrastructure:**
- `User.isPubliclyVisible` boolean field (default: false)
- API endpoint: `/vendor-auth/public/profiles` for public vendor data
- Vendor profile verification status in `vendorProfile.verifyStatus`

### Enhanced Filtering Logic Implementation

**1. Advanced Search Filters:**
```typescript
interface VendorFilters {
  searchTerm: string;
  kategorien: string[];
  standorte: string[];
  verifyStatus: 'all' | 'verified' | 'pending';
  hasActiveContracts: boolean;
  priceRange: { min: number; max: number };
  availability: 'all' | 'available' | 'full';
}
```

**2. Visibility Control Logic:**
```typescript
// Server-side filtering in vendorAuthController.ts
const getPublicVendors = async () => {
  return await User.find({
    isVendor: true,
    isPubliclyVisible: true,
    registrationStatus: { $in: ['trial_active', 'active'] },
    'vendorProfile.verifyStatus': { $ne: 'unverified' }
  }).populate('contracts');
};
```

**3. Dynamic Filter Updates:**
- Real-time filter application without page reload
- URL parameter synchronization for bookmarkable filter states
- Filter combination validation and user feedback

### Visibility Controls Integration

**Admin Controls:**
- Bulk visibility management in admin panel
- Vendor approval workflow integration
- Manual override capabilities for special cases

**Vendor Self-Service:**
- Profile completeness requirements for visibility
- Trial status integration with automatic visibility changes
- Preview mode for vendors to see their public profile

## Acceptance Criteria
- [ ] Enhanced filtering interface supports multiple simultaneous filter criteria
- [ ] Search functionality works across vendor name, company, description, and categories
- [ ] Location filtering includes both vendor addresses and Mietfach locations
- [ ] Visibility controls properly respect vendor trial status and admin approval
- [ ] Filter state is preserved in URL parameters for bookmarkable searches
- [ ] Mobile-responsive design maintains usability across all device sizes
- [ ] Public API endpoint properly filters vendors based on visibility settings
- [ ] Admin panel provides bulk visibility management tools
- [ ] Performance remains acceptable with large vendor datasets (100+ vendors)

## Subtasks
- [ ] Analyze and document current filtering implementation gaps
- [ ] Enhance `DirektvermarkterUebersichtPage` with advanced filter controls
- [ ] Implement URL parameter synchronization for filter state
- [ ] Update public vendor API endpoint with enhanced filtering capabilities
- [ ] Add visibility management tools to admin panel
- [ ] Implement vendor profile completeness requirements
- [ ] Add filter performance optimizations (pagination, lazy loading)
- [ ] Create comprehensive filter reset and clear functionality
- [ ] Add vendor availability status based on Mietfach capacity
- [ ] Implement search result analytics and user behavior tracking
- [ ] Update mobile interface for enhanced filter experience
- [ ] Add filter presets for common search scenarios
- [ ] Test filtering performance with large datasets
- [ ] Document filter API parameters and visibility control logic

## Implementation Notes

### Performance Considerations
- Implement debounced search to reduce API calls
- Add pagination for vendor listings (20-50 vendors per page)
- Consider implementing search result caching for common queries
- Use MongoDB indexing on commonly filtered fields

### User Experience Enhancements
- Add filter result counts to show available options
- Implement "no results" state with suggestions
- Add sorting options (distance, rating, alphabetical)
- Consider implementing saved search functionality

### Security and Privacy
- Ensure vendor data privacy compliance in public listings
- Validate all filter parameters on server side
- Implement rate limiting for search API endpoints
- Audit log for admin visibility changes

### Integration Points
- Trial system integration for automatic visibility updates
- Email notification system for visibility status changes
- Analytics integration for search behavior tracking
- Map component synchronization with filter state

## Output Log
*(This section is populated as work progresses on the task)*

[2025-01-04 12:00:00] Task created and added to Sprint S06
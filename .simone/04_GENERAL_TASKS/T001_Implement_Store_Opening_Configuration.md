---
task_id: T001
status: in_progress
complexity: Medium
last_updated: 2025-06-02T14:25:00Z
---

# Task: Implement Store Opening Configuration

## Description
Implement the admin configuration system for setting and managing the store opening date. This is a critical feature for the pre-launch vendor registration system, allowing administrators to control when vendor trial periods begin and when the platform becomes publicly active. The opening date will trigger automated processes including trial period activation and vendor notifications.

## Goal / Objectives
Create a flexible store opening date management system that:
- Provides admin interface for setting/updating the opening date
- Displays countdown to vendors awaiting launch
- Shows "Coming Soon" status on public pages before opening
- Enables automated trial period activation on opening day
- Supports date change notifications to affected vendors

## Acceptance Criteria
- [x] Settings model created in MongoDB with store opening configuration
- [x] Admin API endpoints functional for getting/updating opening date
- [x] Admin dashboard displays current opening date with edit capability
- [x] Vendor dashboard shows countdown to opening (when date is set)
- [ ] Public pages display "Coming Soon" message before opening date
- [x] Email notifications sent when opening date is changed
- [x] Date validation ensures opening date cannot be in the past
- [x] System correctly identifies whether store is open based on current date

## Subtasks
- [x] Create Settings model schema in server/src/models/Settings.ts
- [x] Add Settings model export to server/src/models/index.ts
- [x] Implement admin controller methods for settings management
- [x] Add admin routes for /api/admin/settings/store-opening
- [x] Create admin Settings page component
- [x] Add settings card to admin dashboard
- [x] Implement StoreSettingsContext for global state
- [x] Add countdown component to vendor dashboard
- [x] Create email templates for opening date notifications
- [x] Add public API endpoint for opening date (no auth)
- [ ] Update public pages to show "Coming Soon" when applicable
- [x] Add date validation middleware
- [ ] Write tests for settings functionality

## Technical Guidance

### Key Integration Points
- **Models**: Create new at `server/src/models/Settings.ts`
- **Controllers**: Extend `server/src/controllers/adminController.ts`
- **Routes**: Add to `server/src/routes/adminRoutes.ts`
- **Admin UI**: New page following pattern from `client/src/pages/admin/`
- **Dashboard**: Update `client/src/pages/admin/DashboardPage.tsx`
- **Vendor Dashboard**: Modify `client/src/pages/VendorDashboardPage.tsx`
- **Email Service**: Extend `server/src/utils/emailService.ts`

### Database Schema Pattern
Follow schema patterns from existing models like `server/src/models/User.ts`:
- Use mongoose Schema with TypeScript interfaces
- Include timestamps
- Add appropriate indexes
- Export both schema and TypeScript interface

### API Endpoints to Implement
```
GET  /api/admin/settings/store-opening     // Get current settings
PUT  /api/admin/settings/store-opening     // Update settings
GET  /api/public/store-opening             // Public endpoint (no auth)
```

### Frontend State Management
Create new context following pattern from `client/src/contexts/AuthContext.tsx`:
- StoreSettingsContext for global opening date state
- Provider wrapper at app level
- Hooks for easy access in components

### Email Integration
Add methods to `emailService.ts`:
- `sendOpeningDateChangeNotification()`
- `sendOpeningReminderEmail()`
- Use existing transporter configuration

### Testing Approach
- Unit tests for Settings model
- Integration tests for API endpoints
- Component tests for admin settings page
- E2E test for complete flow

## Implementation Notes

1. **Settings Model Structure**:
   - Single document pattern (only one settings doc in collection)
   - Include fields for future expansion
   - Version field for migrations

2. **Admin Interface**:
   - Date picker with time selection
   - Confirmation dialog for changes
   - Display timezone clearly
   - Show affected vendor count

3. **Vendor Dashboard Countdown**:
   - Real-time countdown component
   - Handle undefined opening date gracefully
   - Refresh-resistant (use server time)

4. **Public Pages**:
   - Check opening status on page load
   - Cache status with reasonable TTL
   - SEO-friendly "Coming Soon" implementation

5. **Security Considerations**:
   - Admin-only write access to settings
   - Public read access for opening date only
   - Validate date changes (not in past)
   - Audit log for setting changes

6. **Performance**:
   - Cache opening date in memory
   - Minimize database queries
   - Efficient countdown calculations

## Dependencies
- Milestone M001: Vendor Registration with Trial Period
- Requirement R002: Store Opening Configuration
- Existing admin authentication system
- Email service infrastructure

## Output Log
*(This section is populated as work progresses on the task)*

[2025-06-02 14:03:56] Task created
[2025-06-02 14:15:00] Created Settings model schema in server/src/models/Settings.ts
[2025-06-02 14:15:30] Added Settings model export to server/src/models/index.ts
[2025-06-02 14:16:00] Implemented admin controller methods for settings management
[2025-06-02 14:16:30] Added admin routes for /api/admin/settings/store-opening
[2025-06-02 14:17:00] Added email template for opening date notifications
[2025-06-02 14:17:30] Added public API endpoint for opening date (no auth)
[2025-06-02 14:18:00] Created admin Settings page component
[2025-06-02 14:18:30] Added settings card to admin dashboard
[2025-06-02 14:19:00] Added settings menu item to admin layout
[2025-06-02 14:19:30] Added route for settings page in App.tsx
[2025-06-02 14:20:00] Created StoreSettingsContext for global state
[2025-06-02 14:20:30] Added countdown component to vendor dashboard
[2025-06-02 14:30:00] Fixed API URL configuration in Settings page
[2025-06-02 14:30:30] Fixed null date handling in admin controller
[2025-06-02 14:35:00] Fixed token retrieval - using 'token' instead of 'adminToken'
[2025-06-02 14:35:30] Added authentication checks in Settings page
[2025-06-02 14:40:00] Fixed button visibility - changed from primary-orange to primary
[2025-06-02 14:40:30] Fixed navigation back to dashboard - changed route from /admin/dashboard to /admin
[2025-06-02 14:41:00] Added countdown timer to HomePage
[2025-06-02 14:45:00] Removed countdown from HomePage and moved to ConstructionBanner component
[2025-06-02 14:45:30] Enhanced ConstructionBanner with API-driven countdown display
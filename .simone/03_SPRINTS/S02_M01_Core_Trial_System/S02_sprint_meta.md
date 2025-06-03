---
sprint_folder_name: S02_M01_Core_Trial_System
sprint_sequence_id: S02
milestone_id: M01
title: Core Trial System Sprint - Pre-Registration & Public Visibility
status: completed
goal: Implement foundational vendor pre-registration system and public visibility controls
last_updated: 2025-06-02T21:45:00Z
---

# Sprint: Core Trial System Sprint - Pre-Registration & Public Visibility (S02)

## Sprint Goal
Implement the foundational components of the vendor trial system: pre-registration workflow, public visibility controls, and enhanced admin management interface.

## Scope & Key Deliverables
- **R001**: Pre-Launch Registration System (priority focus)
- **R004**: Manual Vendor Activation (public visibility controls)
- **R007**: Admin Vendor Management (enhanced interface)
- **Partial R005**: Enhanced Registration Flow (trial messaging)

## Definition of Done (for the Sprint)
- Vendors can register before store opening with "pre-registered" status
- Admin can control vendor public visibility via `isPubliclyVisible` field
- Public vendor listings respect visibility controls
- Admin interface shows vendor status and management controls
- All new features have basic test coverage

## Planning Notes
### Why These Requirements First?
1. **R001 (Pre-Registration)**: Foundation for entire trial system
2. **R004 (Public Visibility)**: Enables controlled soft-launch
3. **R007 (Admin Management)**: Needed to manage the above features
4. **R005 (Enhanced Flow)**: Improves UX for pre-registration

### Technical Approach
1. **Database Schema Updates**: Add status and visibility fields to User model
2. **API Endpoints**: New pre-registration and admin visibility endpoints  
3. **Frontend Updates**: Enhanced registration flow and admin interface
4. **Public Filtering**: Update public pages to respect visibility

### Estimated Effort
- **R001**: ~6 hours (DB schema, API, frontend)
- **R004**: ~4 hours (admin interface, filtering)
- **R007**: ~4 hours (admin dashboard enhancements)
- **R005**: ~2 hours (messaging updates)
- **Total**: ~16 hours (2-3 day sprint)

## Success Metrics
- [x] Pre-registration workflow functional end-to-end
- [x] Public visibility toggle working in admin
- [x] Public listings filtered correctly
- [x] Admin can manage vendor statuses
- [ ] All features have test coverage (partial - integration tests only)

## Next Sprint Preview (S03)
After S02 completion, S03 will focus on:
- **R003**: Trial Period Activation (automated trial logic)
- **R006**: Immediate Cancellation (vendor self-service)
- **R009**: Launch Day Automation (scheduled tasks)
# TASK-084: Vendor Auth UX Improvements

**Status**: in-progress
**Created**: 2026-04-02
**Assignee**: Claude
**Priority**: HIGH
**Estimated**: 1-2h

## Goal
Improve vendor authentication UX with two fixes:
1. Allow vendors to change their password
2. Show specific login error messages instead of generic "Ungültige Anmeldedaten"

## Context
Discovered during testing (2026-03-31): A manually created vendor couldn't log in and the error gave no hint that `newsletterConfirmed` and `kontakt.status` were the real blockers. Also, there's no way for vendors to change their password after account creation.

## Acceptance Criteria
- [x] Vendor can change their password (from vendor dashboard/settings)
- [x] Login error shows specific reason (unconfirmed email, inactive account, wrong password)
- [x] Password change requires current password verification
- [x] Success/error notifications for password change
- [x] "Passwort vergessen?" flow with email reset link
- [x] "Bestätigungslink erneut senden" button on unconfirmed email error
- [x] VendorSettingsPage with password change form
- [x] TypeScript compilation successful (server + client)
- [x] All tests passing (22 vendor auth tests)

## Progress Log

### 2026-04-02
- Task created from memory note
- Starting implementation

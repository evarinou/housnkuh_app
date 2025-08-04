# TASK-002: Remove Old Tests and Prepare for New Test Structure

**Status**: COMPLETED
**Created**: 2025-08-04
**Assignee**: Claude
**Priority**: MEDIUM
**Estimated**: 2h

## Goal
Remove all existing test files and prepare for a new co-located test structure where tests live next to their components.

## Context
Current test structure has tests in separate __tests__ directories. We want to move to a pattern where each component has its test file right next to it (e.g., Component.tsx and Component.test.tsx).

## Acceptance Criteria
- [x] All test files in client/src/__tests__/ removed
- [x] All test files in server/src/__tests__/ removed
- [x] E2E tests in tests/ directory removed
- [x] All main directory test scripts removed (run-*-test.sh, debug-booking.sh)
- [x] All JavaScript test files in main directory removed (test-*.js, check-*.js, etc.)
- [x] All Playwright test files and configs removed
- [x] All test documentation and demo files removed
- [x] Test results directory cleaned up
- [x] Test runners still configured correctly
- [x] Verification: No test files remain outside of preserved configurations
- [ ] Git commit with clear message about comprehensive test removal (pending)
- [ ] Documentation updated about new co-located test structure (future task)

## Technical Details
- Keep test configuration files (jest.config.js, setupTests.ts)
- Update .gitignore if needed
- Ensure npm test commands still work (just no tests to run)

## Files to Modify

### Test Directories to Remove
- [x] Remove: `client/src/__tests__/**/*` ✅ COMPLETED
- [x] Remove: `server/src/__tests__/**/*` ✅ COMPLETED 
- [x] Remove: `tests/**/*` ✅ COMPLETED
- [x] Remove: `test-results/**/*` ✅ COMPLETED

### Main Directory Test Scripts to Remove
- [x] Remove: `run-email-test.sh` ✅ COMPLETED
- [x] Remove: `run-booking-tests.sh` ✅ COMPLETED
- [x] Remove: `run-zusatzleistungen-tests.sh` ✅ COMPLETED
- [x] Remove: `debug-booking.sh` ✅ COMPLETED

### JavaScript Test Files to Remove
- [x] Remove: `test-vendor-registration.js` ✅ COMPLETED
- [x] Remove: `test-complete-flow.js` ✅ COMPLETED
- [x] Remove: `test-email-config.js` ✅ COMPLETED
- [x] Remove: `test-email-confirmation.js` ✅ COMPLETED
- [x] Remove: `test-email-functionality.js` ✅ COMPLETED
- [x] Remove: `test-filtering-endpoints.js` ✅ COMPLETED
- [x] Remove: `test-visibility-endpoints.js` ✅ COMPLETED
- [x] Remove: `test-booking-confirmation.js` ✅ COMPLETED
- [x] Remove: `check-email.js` ✅ COMPLETED
- [x] Remove: `check-users.js` ✅ COMPLETED
- [x] Remove: `cleanup-null-emails.js` ✅ COMPLETED
- [x] Remove: `debug-booking-system.js` ✅ COMPLETED
- [x] Remove: `fix-email-index.js` ✅ COMPLETED

### Playwright/E2E Test Files to Remove
- [x] Remove: `playwright-vendor-registration.test.ts` ✅ COMPLETED
- [x] Remove: `playwright.config.js` ✅ COMPLETED
- [x] Remove: `vendor-registration-playwright-test-report.md` ✅ COMPLETED

### Test Configuration/Data Files to Remove
- [x] Remove: `test_booking.json` ✅ COMPLETED
- [x] Remove: `test-image-access.html` ✅ COMPLETED

### Demo/Trial HTML Files to Remove
- [x] Remove: `demo_trial_components.html` ✅ COMPLETED
- [x] Remove: `demo_trial_corrected.html` ✅ COMPLETED
- [x] Remove: `trial_corrected_simple.html` ✅ COMPLETED

### Test Documentation to Remove
- [x] Remove: `BOOKING_TESTS.md` ✅ COMPLETED
- [x] Remove: `docs/email-testing-setup.md` ✅ COMPLETED
- [x] Remove: `docs/vendor-registration-test-report.md` ✅ COMPLETED

### Files to Keep (Preserve)
- [x] Keep: `client/jest.config.js` (if exists) ✅ VERIFIED
- [x] Keep: `client/src/setupTests.ts` ✅ VERIFIED
- [x] Keep: `server/jest.config.js` ✅ VERIFIED
- [x] Keep: `server/tests/testApp.ts` (may be needed for future testing) ✅ VERIFIED
- [x] Keep: `.env.test` configuration file ✅ VERIFIED

### Documentation Updates
- [ ] Update: `docs/DEVELOPMENT.md` with new test structure (future task)

## Related Tasks
- Depends on: Git hooks setup (COMPLETED)
- Blocks: Writing new tests

## Notes
After this comprehensive cleanup, we'll write new tests following the co-location pattern as we work on components. This cleanup removes ALL existing test files and scripts, including those scattered throughout the main directory, ensuring a completely clean slate for the new test structure.

## Verification Commands
After completion, verify cleanup with:
```bash
# Check for remaining test files in main directory
find . -maxdepth 1 -name "*test*" -type f
find . -maxdepth 1 -name "run-*test*" -type f
find . -maxdepth 1 -name "debug-*" -type f

# Check test directories are empty
ls -la client/src/__tests__/ 2>/dev/null || echo "Directory removed"
ls -la server/src/__tests__/ 2>/dev/null || echo "Directory removed"
ls -la tests/ 2>/dev/null || echo "Directory removed"
```

---

## Progress Log

### 2025-08-04
- Status: PLANNING
- Task created for test structure cleanup

### 2025-08-04 (Completion)
- Status: COMPLETED
- All test files and directories successfully removed
- Verification completed: Only `.env.test` configuration file remains (as intended)
- Main directory cleaned of all test scripts and files
- Ready for new co-located test structure
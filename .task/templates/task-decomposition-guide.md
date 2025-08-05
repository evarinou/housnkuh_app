# Task Decomposition Guide

## 🔬 Atomic Task Principle
Each task must represent the **smallest logically coherent unit** of work.

## 📏 Size Guidelines

### ✅ Good Task Size
- **1 specific action** (create, update, fix, add, remove)
- **1 testable outcome** 
- **<50 LOC changes**
- **<2 hours work**
- **1 PR-ready change**

### ❌ Too Large (Needs Decomposition)
- Multiple verbs (e.g., "create AND test")
- Affects multiple unrelated files
- Requires multiple test types
- Takes >2 hours
- Multiple features/fixes

## 🔨 Decomposition Process

### Step 1: Analyze the Request
Break down what's being asked:
```
Original: "Implement user authentication"
Analysis:
- Create user model
- Add password hashing
- Create login endpoint
- Add validation
- Write tests
- Add session management
```

### Step 2: Identify Dependencies
Map out what depends on what:
```
1. User model (no deps)
2. Password hashing (needs #1)
3. Login validation (needs #1)
4. Login endpoint (needs #1, #2, #3)
5. Session management (needs #4)
6. Tests for each component
```

### Step 3: Create Atomic Tasks
One task per action:
```
TASK-001-create-user-model-schema
TASK-002-add-password-hashing-method
TASK-003-create-login-validation-rules
TASK-004-implement-login-endpoint
TASK-005-add-session-management
TASK-006-write-user-model-tests
TASK-007-write-login-endpoint-tests
```

### Step 4: Link Related Tasks
In each task description:
```markdown
## Dependencies
- [ ] Prerequisite: TASK-001-create-user-model-schema
- [ ] Related to: Authentication Feature Set (TASK-001 through TASK-007)
```

## 📋 Decomposition Examples

### Example 1: Refactoring
❌ **Bad**: "Refactor vendor module"

✅ **Good**:
- TASK-010-extract-vendor-validation-utils
- TASK-011-create-vendor-service-class
- TASK-012-update-vendor-controller-imports
- TASK-013-migrate-vendor-tests

### Example 2: Bug Fix
❌ **Bad**: "Fix all booking bugs"

✅ **Good**:
- TASK-020-fix-booking-date-validation
- TASK-021-fix-booking-price-calculation
- TASK-022-fix-booking-email-notification

### Example 3: New Feature
❌ **Bad**: "Add reporting dashboard"

✅ **Good**:
- TASK-030-create-report-data-model
- TASK-031-implement-report-api-endpoint
- TASK-032-create-report-list-component
- TASK-033-add-report-filter-controls
- TASK-034-implement-report-export-function

## 🎯 Task Naming Convention

Format: `TASK-XXX-verb-object-context`

### Verbs (use one):
- create
- add
- update
- fix
- remove
- implement
- write
- migrate
- extract
- validate

### Examples:
- TASK-001-create-user-model
- TASK-002-fix-login-validation
- TASK-003-add-password-reset-endpoint
- TASK-004-update-vendor-permissions
- TASK-005-remove-deprecated-api

## ⚠️ Red Flags (Task Too Large)

1. **Multiple verbs**: "Create model AND add tests"
2. **Vague scope**: "Improve performance"
3. **System-wide**: "Update all components"
4. **Time estimate >2hr**: "Implement complete auth"
5. **Multiple features**: "Add login, logout, and forgot password"

## 💡 Tips

1. **Think in PRs**: Each task = one reviewable PR
2. **Test separately**: Tests can be their own tasks
3. **Vertical slices**: Complete one small feature vs partial big feature
4. **Dependencies clear**: Explicitly state what must be done first
5. **Measure in hours**: If >2hr, decompose further

---
**Remember**: Smaller tasks = faster review, easier testing, clearer progress!
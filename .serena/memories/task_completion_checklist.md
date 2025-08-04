# Task Completion Checklist for housnkuh

## CRITICAL: Commands to Run Before Considering Work Complete

### 1. Test Everything Works
```bash
# Run all tests
cd client && npm test && cd ../server && npm test
```

### 2. Verify Builds Succeed  
```bash
# Build both frontend and backend
cd client && npm run build && cd ../server && npm run build
```

### 3. Check TypeScript Compilation
```bash
# Ensure no TypeScript errors
cd client && npx tsc --noEmit && cd ../server && npx tsc --noEmit
```

## Additional Checks

### Code Quality
- ✓ All tests pass
- ✓ No TypeScript compilation errors
- ✓ No console errors in browser
- ✓ API endpoints return expected responses
- ✓ Error handling is in place

### Before Committing
- ✓ Remove any console.log statements
- ✓ Ensure German translations are correct
- ✓ Update relevant tests for new features
- ✓ Check that migrations are created if schema changed

### Critical Rules from CLAUDE.md
- **NEVER create mock data or simplified components** unless explicitly requested
- **NEVER replace existing complex components** with simplified versions
- **ALWAYS work with the existing codebase**
- **ALWAYS find and fix the root cause** of issues
- **NO Coming Soon pages** - all functionality must be immediately available

### Environment Verification
- MongoDB is running (`mongod`)
- Environment variables are set (.env files)
- Both client (port 3000) and server (port 4000) are accessible

## Note on Linting
No linting configuration currently exists, so manual code review for style consistency is important.
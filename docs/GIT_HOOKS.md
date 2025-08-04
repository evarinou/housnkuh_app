# Git Hooks Documentation

## Overview
This project uses Git hooks to ensure code quality and consistency. All hooks are located in `.git/hooks/`.

## Active Hooks

### 1. Pre-commit Hook
**File**: `.git/hooks/pre-commit`
**Purpose**: Runs before each commit to ensure code quality

**Checks performed**:
- ✅ TypeScript compilation (client & server)
- ✅ Tests for changed files only
- ⚠️ Console.log detection (warning only)
- ⚠️ File documentation check (@file, @purpose tags)

**To skip temporarily**: `git commit --no-verify`

### 2. Pre-push Hook
**File**: `.git/hooks/pre-push`
**Purpose**: Runs before pushing to ensure all tests pass

**Checks performed**:
- ✅ Full test suite (client & server)
- ✅ Build verification
- ⚠️ Security audit (npm audit)

**To skip temporarily**: `git push --no-verify`

### 3. Commit-msg Hook
**File**: `.git/hooks/commit-msg`
**Purpose**: Enforces Conventional Commits format

**Required format**: `<type>(<scope>): <subject>`

**Valid types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance
- `perf`: Performance
- `ci`: CI/CD
- `build`: Build system
- `revert`: Revert commit

**Examples**:
```
feat(vendor): add trial registration flow
fix(auth): resolve JWT token expiration issue
docs(readme): update installation instructions
```

## Troubleshooting

### Hook not executing
```bash
# Check if hook is executable
ls -la .git/hooks/
# Make executable if needed
chmod +x .git/hooks/pre-commit
```

### Bypass hook (emergency only)
```bash
# Skip pre-commit
git commit --no-verify -m "emergency: fix critical bug"

# Skip pre-push
git push --no-verify
```

### Update hooks
Hooks are not tracked by Git. To share updates:
1. Update the hook file
2. Document changes here
3. Team members must manually copy the updated hook

## Best Practices
1. **Don't skip hooks regularly** - They ensure code quality
2. **Fix issues, don't bypass** - If a hook fails, fix the issue
3. **Keep hooks fast** - Slow hooks discourage usage
4. **Document hook changes** - Update this file when modifying hooks
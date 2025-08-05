# CLAUDE.md

## 🚫 CRITICAL: NO COMING SOON PAGE

## Project Overview

housnkuh - Regional marketplace for Direktvermarkter (React/TypeScript + Node/Express/MongoDB)

## 📚 MANDATORY READING ON STARTUP

**READ THESE FIRST:**
1. **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** *(CRITICAL - Development workflow, testing, setup)*
2. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** *(Project structure and decisions)*
3. **[.task/current/](.task/current/)** *(Current active tasks)*

## 🎯 TASK MANAGEMENT PROTOCOL

### STRICT Task Workflow
1. **ONLY work on tasks from**: `.task/current/`
2. **Task files**: Use format `TASK-XXX-description.md` (e.g., `TASK-002-remove-old-tests.md`)
3. **NEVER start work** without an active task file
4. **Use task template**: Copy from `.task/templates/task-template.md`

### 🔬 Task Decomposition Protocol (MANDATORY)
**ATOMIC TASK PRINCIPLE**: Each task = smallest logically coherent unit

#### Task Size Rules
- **Maximum scope**: 1 specific action, 1 testable outcome, <2hr work
- **Split when**: 
  - Task has >1 verb (e.g., "fix AND test")
  - Affects multiple unrelated files
  - Has dependencies on other changes
  - Would result in >50 LOC changes
  
#### Decomposition Examples
❌ **TOO LARGE**:
- "Implement user authentication system"
- "Refactor vendor module"  
- "Fix all booking bugs"

✅ **ATOMIC TASKS**:
- "TASK-001-create-user-model-schema"
- "TASK-002-add-password-hashing-method"
- "TASK-003-implement-login-endpoint-validation"
- "TASK-004-write-login-endpoint-unit-tests"

#### Task Creation Process
1. **Analyze request** → List ALL individual actions needed
2. **Identify dependencies** → What must be done first?
3. **Create atomic tasks** → 1 task per action
4. **Link related tasks** → Reference dependencies in description
5. **Validate size** → Each task should be 1 PR-ready change

### Task File Structure (MANDATORY)
Every task MUST contain:
```yaml
# Task: TASK-XXX-Title
Priority: high|medium|low
Status: in-progress|blocked|review|completed

## User Acceptance Criteria
- [ ] Specific, testable criterion 1
- [ ] Specific, testable criterion 2
- [ ] All tests pass (client & server)

## Test Plan
### Unit Tests
- [ ] Test scenario covering X functionality
- [ ] Test scenario covering Y edge case
- [ ] Co-located test file: ComponentName.test.tsx

### Integration Tests  
- [ ] End-to-end workflow test
- [ ] API integration test

### Manual Testing
- [ ] User workflow verification
- [ ] Cross-browser testing (if UI changes)

## Definition of Done
- [ ] All unit tests implemented and passing
- [ ] Integration tests implemented and passing  
- [ ] All User Acceptance Criteria verified
- [ ] TypeScript compilation successful
- [ ] Manual testing completed
- [ ] Code review (if applicable)
```

### Task Completion Protocol
**BEFORE marking task complete:**
1. **Execute ALL planned tests** as per Development.md:
   ```bash
   # Client tests
   cd client && npm test && npm run build && npx tsc --noEmit
   # Server tests  
   cd server && npm test && npm run build && npx tsc --noEmit
   ```
2. **Verify EVERY User Acceptance Criteria** - check each checkbox
3. **Request user confirmation** for task completion
4. **ONLY after confirmation**: Move task to `.task/completed/`
   ```bash
   mv .task/current/TASK-XXX-*.md .task/completed/
   ```

## Critical Development Rules

1. **NEVER create mock data or simplified components**
2. **NEVER replace existing components with simplified versions**
3. **ALWAYS fix the root cause** - no workarounds
4. **FOLLOW co-located testing** as per Development.md:
   - Place `.test.tsx` files next to React components
   - Place `.test.ts` files next to TypeScript modules
   - Use `__tests__/` only for integration/performance tests
5. **ALWAYS verify all tests** before task completion
6. **NEVER skip planned tests** - complete ALL test scenarios

## Testing Requirements (From Development.md)

### Co-located Test Structure
```
src/components/MyComponent/
  ├── MyComponent.tsx
  ├── MyComponent.test.tsx  ← Required for each component
  └── MyComponent.css

src/services/
  ├── userService.ts
  └── userService.test.ts   ← Required for each service
```

### Test Commands
```bash
# Run client tests
cd client && npm test

# Run server tests  
cd server && npm test

# Run specific test
cd client && npm test -- MyComponent.test.tsx
```

## Documentation Structure

- **Development Guide**: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) *(READ FIRST)*
- **Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Current Tasks**: [.task/current/](.task/current/) *(CHECK ACTIVE TASKS)*
- **Completed Tasks**: [.task/completed/](.task/completed/)
- **Task Templates**: [.task/templates/](.task/templates/)
- **Git Hooks**: [docs/GIT_HOOKS.md](docs/GIT_HOOKS.md)

## Key Project Decisions

1. **Dual Auth System**: AuthContext (admin) + VendorAuthContext (vendors)
2. **File Documentation**: All files need @file and @purpose headers
3. **Co-located Testing**: Tests alongside components (see Development.md)
4. **Commit Format**: Conventional commits (feat/fix/docs/etc)
5. **Task-Driven Development**: Only work on documented tasks

## Quality Gates

### Before ANY Implementation
- [ ] Task exists in `.task/current/` with proper format
- [ ] Task has comprehensive test plan with co-located tests
- [ ] User Acceptance Criteria are clear and testable
- [ ] Development.md guidelines reviewed

### Before Task Completion
- [ ] ALL planned tests implemented and passing
- [ ] Co-located test files created as specified
- [ ] ALL User Acceptance Criteria verified (checkboxes checked)
- [ ] Full build and TypeScript check successful:
   ```bash
   cd client && npm test && npm run build && npx tsc --noEmit
   cd server && npm test && npm run build && npx tsc --noEmit
   ```
- [ ] User confirmation received
- [ ] Task moved to `.task/completed/`

## File Structure (From Development.md)

### File Headers Required
```typescript
/**
 * @file ComponentName.tsx
 * @purpose Brief description of what this file does
 * @created 2025-01-15
 * @modified 2025-08-04
 */
```

## 🛠️ Tool Selection Protocol (MANDATORY)

### Data/Analysis/File Operations → ALWAYS Use Serena MCP
**ENFORCE**: For all code understanding, file analysis, and refactoring tasks

#### Required Serena Tools Usage:
- **File Exploration**: 
  - `mcp__serena__list_dir` → Browse project structure
  - `mcp__serena__find_file` → Locate specific files
- **Code Analysis**:
  - `mcp__serena__get_symbols_overview` → Understand file structure
  - `mcp__serena__find_symbol` → Locate classes/functions/methods
- **Pattern Search**:
  - `mcp__serena__search_for_pattern` → Find code patterns (NOT grep/rg)
- **Code Modifications**:
  - `mcp__serena__replace_regex` → Pattern-based edits
  - `mcp__serena__replace_symbol_body` → AST-aware replacements

#### Tool Selection Rules:
- **Code understanding** → Serena (symbols/structure aware)
- **File discovery** → Serena (respects .gitignore)
- **Refactoring** → Serena (AST-based edits)
- **Simple reads** → Native only if <50 lines
- **NEVER use** grep/find/sed for code tasks

## Auto-Updated Resources

- Architecture stats: `npm run update:architecture`
- Task management: `.task/` directory
- Git hooks enforce quality checks

---
**WORKFLOW**: Read Development.md → Check .task/current/ → Plan tests → Implement → Verify UAC → Move to completed

*This file is loaded automatically by Claude Code on startup*

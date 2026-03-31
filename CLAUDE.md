# CLAUDE.md

## Project Overview

housnkuh - Regional marketplace for Direktvermarkter (React/TypeScript + Node/Express/MongoDB)

## Key References

- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Development workflow, testing, setup
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Project structure and decisions
- **[.task/current/](.task/current/)** - Current active tasks

## Architecture

- **Client**: React 18 + TypeScript + Tailwind CSS (CRA with craco)
- **Server**: Node.js + Express + TypeScript + MongoDB (Mongoose)
- **Dual Auth**: AuthContext (admin) + VendorAuthContext (vendors)
- **Flourio Integration**: External ERP system for article/stock sync

## Development Rules

1. **Fix the root cause** - no workarounds or mock data
2. **Co-located testing**: `.test.tsx` next to components, `.test.ts` next to modules
3. **Conventional commits**: `feat|fix|docs|style|refactor|test|chore(scope): message`
4. **File headers recommended**: `@file` and `@purpose` for new files

## Testing

```bash
# Client
cd client && npm test && npm run build && npx tsc --noEmit

# Server
cd server && npm test && npm run build && npx tsc --noEmit

# Linting
cd server && npm run lint
cd client && npm run lint
```

## Task Management

Tasks live in `.task/current/` using format `TASK-XXX-description.md`. When working on a task:
1. Check task file for User Acceptance Criteria and Test Plan
2. Implement and verify all criteria
3. Run full test suite before marking complete
4. Move to `.task/completed/` after user confirmation

Ad-hoc work without a task file is fine when explicitly requested.

## Key Project Decisions

1. **Dual Auth System**: AuthContext (admin) + VendorAuthContext (vendors)
2. **Co-located Testing**: Tests alongside components (see Development.md)
3. **Commit Format**: Conventional commits enforced by git hook
4. **Controller Architecture**: Thin facade pattern - adminController.ts re-exports from domain modules in admin/
5. **ESLint + Prettier**: Server has `.eslintrc.json`, shared `.prettierrc`, pre-commit hooks enforce quality

## Auto-Updated Resources

- Architecture stats: `npm run update:architecture` (runs automatically on commit)
- Git hooks: pre-commit (TSC + ESLint + Prettier), commit-msg (Conventional Commits), pre-push (Tests + Build)

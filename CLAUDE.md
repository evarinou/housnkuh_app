# CLAUDE.md

## 🚫 CRITICAL: NO COMING SOON PAGE

**PERMANENTLY ESTABLISHED**: This application has **NO Coming Soon page** and **NO pre-launch functionality**.

- **NEVER implement Coming Soon pages**
- **NO conditional rendering based on launch dates**
- **Vendor trials start immediately upon registration**
- If docs mention "Coming Soon" → **IGNORE**

## Project Overview

housnkuh - Regional marketplace for Direktvermarkter (React/TypeScript + Node/Express/MongoDB)

## Critical Development Rules

1. **NEVER create mock data or simplified components**
2. **NEVER replace existing components with simplified versions**
3. **ALWAYS fix the root cause** - no workarounds
4. **ALWAYS verify before completing work:**
   ```bash
   cd client && npm test && npm run build && npx tsc --noEmit
   cd ../server && npm test && npm run build
   ```

## Documentation Structure

- **Architecture**: See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) *(MUST READ)*
- **Development**: See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- **Current Tasks**: See [.task/current/](.task/current/) *(CHECK ACTIVE TASKS)*
- **Git Hooks**: See [docs/GIT_HOOKS.md](docs/GIT_HOOKS.md)

## Key Project Decisions

1. **Dual Auth System**: AuthContext (admin) + VendorAuthContext (vendors)
2. **File Documentation**: All files need @file and @purpose headers
3. **Test Structure**: Co-located tests (Component.tsx + Component.test.tsx)
4. **Commit Format**: Conventional commits (feat/fix/docs/etc)

## Auto-Updated Resources

- Architecture stats: `npm run update:architecture`
- Task management: `.task/` directory
- Git hooks enforce quality checks

---
*This file is loaded automatically by Claude Code on startup*
#!/bin/bash
# Update architecture statistics automatically

echo "📐 Updating architecture statistics..."

# Get current date
DATE=$(date +"%Y-%m-%d %H:%M:%S")

# Count components
CLIENT_COMPONENTS=$(find client/src/components -name "*.tsx" -o -name "*.jsx" 2>/dev/null | wc -l)
CLIENT_PAGES=$(find client/src/pages -name "*.tsx" -o -name "*.jsx" 2>/dev/null | wc -l)
CLIENT_HOOKS=$(find client/src/hooks -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)

# Count server files
SERVER_CONTROLLERS=$(find server/src/controllers -name "*.ts" 2>/dev/null | wc -l)
SERVER_MODELS=$(find server/src/models -name "*.ts" 2>/dev/null | wc -l)
SERVER_SERVICES=$(find server/src/services -name "*.ts" 2>/dev/null | wc -l)
SERVER_ROUTES=$(find server/src/routes -name "*.ts" 2>/dev/null | wc -l)

# Count tests
CLIENT_TESTS=$(find client/src -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | wc -l)
SERVER_TESTS=$(find server/src -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | wc -l)

# Total TypeScript files
TOTAL_TS=$(find . -path ./node_modules -prune -o -name "*.ts" -o -name "*.tsx" | grep -v node_modules | wc -l)

# Create architecture auto file
cat > docs/ARCHITECTURE_AUTO.md << EOF
# Architecture Statistics (Auto-Generated)

**Generated**: $DATE
**Generator**: scripts/update-architecture.sh

## File Counts

### Frontend (Client)
- Components: $CLIENT_COMPONENTS
- Pages: $CLIENT_PAGES
- Hooks: $CLIENT_HOOKS
- Tests: $CLIENT_TESTS

### Backend (Server)
- Controllers: $SERVER_CONTROLLERS
- Models: $SERVER_MODELS
- Services: $SERVER_SERVICES
- Routes: $SERVER_ROUTES
- Tests: $SERVER_TESTS

### Overall
- Total TypeScript Files: $TOTAL_TS
- Total Tests: $((CLIENT_TESTS + SERVER_TESTS))

## Component Breakdown

### Top-Level Components
\`\`\`
$(find client/src/components -maxdepth 1 -name "*.tsx" -exec basename {} \; 2>/dev/null | sort)
\`\`\`

### Admin Components
\`\`\`
$(find client/src/components/admin -name "*.tsx" -exec basename {} \; 2>/dev/null | sort)
\`\`\`

### Vendor Components
\`\`\`
$(find client/src/components/vendor -name "*.tsx" -exec basename {} \; 2>/dev/null | sort)
\`\`\`

## Model Overview
\`\`\`
$(find server/src/models -name "*.ts" -exec basename {} \; 2>/dev/null | grep -v "index.ts" | sort)
\`\`\`

---
*This file is auto-generated. Do not edit manually.*
*Run \`npm run update:architecture\` to refresh.*
EOF

echo "✅ Architecture statistics updated in docs/ARCHITECTURE_AUTO.md"
# Development Guide

## Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- Git

## Setup and Installation

### 1. Clone and Install Dependencies
```bash
# Clone the repository
git clone <repository-url>
cd housnkuh_app

# Install all dependencies (root, client, and server)
npm run install-all
```

### 2. Environment Configuration
Create `.env` file in the server directory:
```
# Server
PORT=4000
MONGO_URI=mongodb://localhost:27017/housnkuh
JWT_SECRET=your_jwt_secret_here
ADMIN_SETUP_KEY=your_admin_setup_key_here

# Email (optional)
EMAIL_FROM=noreply@housnkuh.de
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password
```

### 3. Database Setup
```bash
# Ensure MongoDB is running
# For local MongoDB:
mongod

# Seed initial data (optional)
cd server && npm run seed
```

## Development Commands

### Running the Application
```bash
# Start both client and server in development mode
npm run dev

# Start only the client
npm run client

# Start only the server
npm run server
```

### Building for Production
```bash
# Build both client and server
npm run build-all
```

### Testing
```bash
# Run client tests
cd client && npm test

# Run server tests
cd server && npm test

# Run tests in watch mode
cd client && npm test -- --watch
cd server && npm run test:watch

# Run E2E tests
npm run test:e2e
```

### Code Quality Checks
```bash
# TypeScript compilation check
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit

# Update architecture documentation
npm run update:architecture
```

## Project Scripts

### Root Package.json
- `npm run dev` - Start full stack development
- `npm run install-all` - Install all dependencies
- `npm run build-all` - Build for production
- `npm run update:architecture` - Update architecture stats

### Client Scripts
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Lint code (if configured)

### Server Scripts
- `npm run dev` - Start with nodemon
- `npm run build` - Compile TypeScript
- `npm test` - Run tests
- `npm run seed` - Seed database

## Git Workflow

### Commit Convention
Use conventional commits format:
```
feat(scope): add new feature
fix(scope): fix bug
docs(scope): update documentation
style(scope): formatting changes
refactor(scope): code refactoring
test(scope): add tests
chore(scope): maintenance
```

### Git Hooks
The project uses Git hooks for quality assurance:
- **pre-commit**: TypeScript check, tests, documentation check
- **pre-push**: Full test suite, build verification
- **commit-msg**: Enforces conventional commit format

To skip hooks in emergency:
```bash
git commit --no-verify -m "emergency: fix"
git push --no-verify
```

## File Structure Guidelines

### File Documentation
Every file should have a header:
```typescript
/**
 * @file ComponentName.tsx
 * @purpose Brief description of what this file does
 * @created 2025-01-15
 * @modified 2025-08-04
 */
```

### Test Structure
Tests are co-located with components:
```
components/
  MyComponent/
    MyComponent.tsx
    MyComponent.test.tsx
    MyComponent.css
```

## Common Tasks

### Adding a New Component
1. Create component file with documentation header
2. Create test file alongside
3. Update relevant Task document in `.task/current/`
4. Run `npm run update:architecture` if adding to main directories

### Working with Tasks
```bash
# View current tasks
ls .task/current/

# Create new task
cp .task/templates/task-template.md .task/current/TASK-XXX-description.md

# Complete a task
mv .task/current/TASK-XXX-*.md .task/completed/
```

### Debugging

#### Client Issues
- Check browser console for errors
- Verify API endpoint configuration
- Check React Developer Tools

#### Server Issues
- Check server logs
- Verify MongoDB connection
- Test API endpoints with curl/Postman

#### Common Issues
1. **Port already in use**: Kill process on port 3000/4000
2. **MongoDB connection failed**: Ensure MongoDB is running
3. **Module not found**: Run `npm run install-all`

## Deployment

### Production Build
```bash
# Build everything
npm run build-all

# Client build output: client/build/
# Server build output: server/dist/
```

### Environment Variables
Ensure all required environment variables are set in production:
- `NODE_ENV=production`
- `MONGO_URI` with production database
- Strong `JWT_SECRET`
- Email configuration

## Additional Resources

- [Architecture Overview](./ARCHITECTURE.md)
- [Git Hooks Documentation](./GIT_HOOKS.md)
- [Task Management](./../.task/README.md)
- [API Documentation](./API.md) *(TODO)*

---
*For project-specific rules and guidelines, see [CLAUDE.md](../CLAUDE.md)*
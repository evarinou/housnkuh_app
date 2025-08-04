# Suggested Commands for housnkuh Development

## Essential Development Commands

### Setup & Installation
```bash
# Install all dependencies (root, client, and server)
npm run install-all

# MongoDB must be installed and running on your system
# Default connection: mongodb://localhost:27017/housnkuh
```

### Development
```bash
# Start both client and server in development mode (recommended)
npm run dev

# Start only the client (React on port 3000)
npm run client

# Start only the server (Express on port 4000)
npm run server

# Seed the database with test data
cd server && npm run seed
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
```

### Building
```bash
# Build both client and server for production
npm run build-all

# Build client only
cd client && npm run build

# Build server only
cd server && npm run build
```

### TypeScript Compilation Check
```bash
# Check client TypeScript compilation
cd client && npx tsc --noEmit

# Check server TypeScript compilation  
cd server && npx tsc --noEmit
```

### Database Migrations
```bash
# Run migrations up
cd server && npm run migrate:up

# Run migrations down
cd server && npm run migrate:down
```

### System Utilities (Linux)
- `git` - Version control
- `ls` - List directory contents
- `cd` - Change directory
- `grep` - Search text patterns (use ripgrep `rg` if available)
- `find` - Find files and directories
- `cat` - Display file contents
- `npm` - Node package manager
- `node` - JavaScript runtime
- `mongod` - MongoDB daemon (must be running)

## Environment Variables
Create `.env` file in server directory:
```
PORT=4000
MONGO_URI=mongodb://localhost:27017/housnkuh
JWT_SECRET=your_jwt_secret
ADMIN_SETUP_KEY=your_admin_setup_key
```

Create `.env` file in client directory:
```
REACT_APP_API_URL=http://localhost:4000/api
```
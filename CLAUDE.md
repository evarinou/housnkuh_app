# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚫 CRITICAL PROJECT DECISION: NO COMING SOON PAGE

**PERMANENTLY ESTABLISHED**: This application has **NO Coming Soon page** and **NO pre-launch functionality**.

### Absolute Requirements:
- **NEVER implement Coming Soon pages**
- **NO store opening configuration or logic**
- **NO conditional rendering based on launch dates**
- **NO pre-registration or waiting states**
- **Full application functionality must be immediately available**
- **Vendor trials start immediately upon registration**

### If Any Documentation Mentions:
- "Coming Soon" → **IGNORE**
- "Pre-launch" → **IGNORE**  
- "Store opening date" → **IGNORE**
- "Launch day automation" → **Implement as immediate trial management**

## Project Overview

housnkuh is a regional marketplace platform for direct marketers (Direktvermarkter) built as a full-stack JavaScript/TypeScript application with a React frontend and Node.js/Express backend.

## Development Commands

### Critical Rules - DO NOT VIOLATE

- **NEVER create mock data or simplified components** unless explicitly told to do so

- **NEVER replace existing complex components with simplified versions** - always fix the actual problem

- **ALWAYS work with the existing codebase** - do not create new simplified alternatives

- **ALWAYS find and fix the root cause** of issues instead of creating workarounds

- When debugging issues, focus on fixing the existing implementation, not replacing it

- When something doesn't work, debug and fix it - don't start over with a simple version

### Essential Workflow Commands

**ALWAYS run these commands before considering work complete:**

```bash
# Test everything works
cd client && npm test && cd ../server && npm test

# Verify builds succeed
cd client && npm run build && cd ../server && npm run build

# Check TypeScript compilation
cd client && npx tsc --noEmit && cd ../server && npx tsc --noEmit
```
### Setup and Installation

```bash
# Install all dependencies (root, client, and server)
npm run install-all

# Set up MongoDB (required for the application to run)
# MongoDB should be installed and running on your system
```

### Development

```bash
# Start both the client and server in development mode
npm run dev

# Start only the client
npm run client

# Start only the server
npm run server

# Seed the database with test data
cd server && npm run seed
```

### Building

```bash
# Build both client and server for production
npm run build-all
```

### Testing

```bash
# Run client tests (Jest with React Testing Library)
cd client && npm test

# Run server tests (Jest with Supertest)
cd server && npm test

# Run tests in watch mode
cd client && npm test -- --watch
cd server && npm run test:watch
```

### Code Quality

```bash
# Check TypeScript compilation
cd client && npx tsc --noEmit
cd server && npm run build

# Lint code (if configured)
cd client && npm run lint  # if available
cd server && npm run lint  # if available
```

## Architecture

### Frontend (React TypeScript)

The client is a React TypeScript application structured as follows:

- **Auth System**: Two separate authentication contexts:
  - `AuthContext`: For administrator users
  - `VendorAuthContext`: For vendors/direct marketers

- **Routing Structure**:
  - Public routes for general visitors
  - Protected admin routes (`/admin/*`) using `ProtectedRoute` component
  - Vendor-specific routes

- **Main Components**:
  - Layout components (Navigation, Hero, Footer)
  - Public pages (Home, Direktvermarkter, Standort, etc.)
  - Admin pages (Dashboard, Newsletter, Setup)
  - Vendor-related components (VendorRegistrationModal, VendorContest)

### Backend (Node.js, Express, TypeScript)

The server is a Node.js Express application with TypeScript, structured as follows:

- **Database**: MongoDB with Mongoose for ODM
- **Authentication**: JWT-based auth with separate flows for admins and vendors
- **API Structure**:
  - Route groups for different features (users, mietfaecher, vertraege, etc.)
  - Controller pattern for business logic
  - Middleware for auth validation

- **Data Models**:
  - User: Admin and vendor users with role flags
  - Mietfach: Rental units/spaces
  - Vertrag: Contracts
  - Additional schemas for addresses, contacts

## Environment Setup

The application expects certain environment variables:

```
# Server
PORT=4000
MONGO_URI=mongodb://localhost:27017/housnkuh
JWT_SECRET=your_jwt_secret
ADMIN_SETUP_KEY=your_admin_setup_key

# Client
REACT_APP_API_URL=http://localhost:4000/api
```

## Project Structure

- `client/`: React frontend application
  - `src/components/`: UI components
  - `src/contexts/`: Authentication contexts 
  - `src/pages/`: Page components
  - `src/styles/`: CSS files
  
- `server/`: Node.js backend application
  - `src/controllers/`: API controllers
  - `src/models/`: Mongoose models
  - `src/routes/`: Express routes
  - `src/middleware/`: Express middleware
  - `src/config/`: Configuration files
  - `src/utils/`: Utility functions

## Key Features

1. Direct marketer marketplace and listings
2. Location-based services
3. Rental system (Mietfach)
4. Newsletter subscription and management
5. Vendor registration and authentication
6. Admin dashboard for site management
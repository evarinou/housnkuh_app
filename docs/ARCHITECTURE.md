# System Architecture

**IMPORTANT**: This document is referenced by CLAUDE.md and should be kept up-to-date.

## Overview
housnkuh is a regional marketplace platform for direct marketers (Direktvermarkter) built with:
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript  
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with dual auth contexts

## Core Architecture Decisions

### 1. NO Coming Soon Page
- Full functionality available immediately
- Vendor trials start upon registration
- No pre-launch states or conditional rendering

### 2. Dual Authentication System
- **AuthContext**: Admin users only
- **VendorAuthContext**: Vendors/Direktvermarkter
- Separate JWT tokens and login flows

### 3. Business Domain Structure
```
User (with vendor profile)
  └── Vertrag (contracts)
       └── Mietfach (rental units)
            └── Bookings
                 └── Zusatzleistungen (additional services)
```

## Component Statistics
For current counts see: [ARCHITECTURE_AUTO.md](./ARCHITECTURE_AUTO.md)

## Directory Structure
```
client/
├── src/
│   ├── components/     # UI Components
│   ├── contexts/       # React Contexts (Auth, VendorAuth)
│   ├── pages/         # Route Pages
│   ├── hooks/         # Custom React Hooks
│   ├── services/      # Business Logic
│   ├── types/         # TypeScript Definitions
│   └── utils/         # Helper Functions

server/
├── src/
│   ├── controllers/   # Request Handlers
│   ├── models/        # Mongoose Schemas
│   ├── routes/        # API Routes
│   ├── middleware/    # Express Middleware
│   ├── services/      # Business Logic
│   └── utils/         # Helper Functions
```

## Key Patterns

### API Structure
- RESTful endpoints under `/api/v1/`
- Protected routes require JWT authentication
- Separate route groups by domain (admin, vendor, public)

### State Management
- React Context for global state
- Local component state for UI
- Server state with React Query patterns

### Testing Strategy
- Co-located tests (Component.tsx, Component.test.tsx)
- Jest + React Testing Library for frontend
- Jest + Supertest for backend

## Performance Optimizations
- MongoDB indexes on frequently queried fields
- Response caching for public endpoints
- Lazy loading for route components
- Image optimization and CDN usage

## Security Measures
- JWT tokens with expiration
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Security headers via Helmet

## Deployment Architecture
- Frontend: Static hosting (Vercel/Netlify)
- Backend: Node.js server (VPS/Cloud)
- Database: MongoDB Atlas
- File Storage: Local filesystem (future: S3)

---
*Last manual update: 2025-08-04*
*For automated metrics see: ARCHITECTURE_AUTO.md*
# housnkuh Project Architecture

## Overall Structure
Full-stack TypeScript application with clear separation between frontend and backend.

## Frontend Architecture (React)

### Directory Structure
```
client/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── admin/       # Admin-specific components
│   │   ├── common/      # Shared components
│   │   ├── layout/      # Layout components (Header, Footer, etc.)
│   │   ├── ui/          # Base UI components
│   │   └── vendor/      # Vendor-specific components
│   ├── contexts/        # React Context providers
│   │   ├── AuthContext.tsx        # Admin authentication
│   │   └── VendorAuthContext.tsx  # Vendor authentication
│   ├── pages/           # Page components (route endpoints)
│   │   ├── admin/       # Admin pages
│   │   └── vendor/      # Vendor pages
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── assets/          # Static assets (images, fonts)
```

### Key Architectural Decisions
- **Dual Authentication**: Separate contexts for admin and vendor users
- **Protected Routes**: Using ProtectedRoute component for access control
- **Component Organization**: Feature-based with role separation (admin/vendor)
- **State Management**: React Context API (no Redux)

## Backend Architecture (Node.js/Express)

### Directory Structure
```
server/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic layer
│   ├── utils/           # Utility functions
│   ├── migrations/      # Database migrations
│   └── jobs/            # Background jobs (cron)
```

### API Design
- RESTful endpoints with consistent naming
- JWT-based authentication
- Middleware for auth validation
- Separate route files by feature
- Controller-Service pattern for business logic

### Database Models
- **User**: Central user model with vendor/admin roles
- **Mietfach**: Rental units/spaces
- **Vertrag**: Contracts linking vendors to Mietfächer
- **VendorContest**: Contest entries
- **MonthlyRevenue**: Revenue tracking
- **Settings**: Application settings

### Key Services
- **emailService**: Nodemailer integration
- **vertragService**: Contract management
- **revenueService**: Revenue calculations
- **trialService**: Trial booking management
- **scheduledJobs**: Cron jobs for automation

## Data Flow
1. React components → API calls via Axios
2. Express routes → Controllers → Services
3. Services → Mongoose models → MongoDB
4. Response flow back through the same layers

## Security Considerations
- JWT tokens for authentication
- bcrypt for password hashing
- CORS configuration
- Helmet.js for security headers
- Rate limiting on API endpoints
- Input validation at controller level
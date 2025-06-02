# housnkuh Architecture Documentation

## Project Overview

housnkuh ist eine regionale Marktplatz-Plattform für Direktvermarkter mit folgenden Hauptzielen:

1. **Direktvermarkter-Portal**: Verwaltung von Produkten und Präsenz im Laden
2. **Kunden-Interface**: Übersicht über aktuelle Direktvermarkter und deren Produkte
3. **Kassensystem-Integration**: REST API für externes Kassensystem (geplant)
4. **Verkaufsberichte**: Tägliche Berichte über Produktverkäufe (geplant)
5. **Online-Vertragsabschluss**: Direktbuchung von Mietverträgen

## System Architecture

### Technology Stack

#### Frontend
- **Framework**: React 18.2 mit TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **State Management**: React Context API (dual contexts)
- **HTTP Client**: Axios
- **UI Components**: Radix UI, Lucide Icons
- **Animations**: Framer Motion

#### Backend
- **Runtime**: Node.js mit TypeScript
- **Framework**: Express.js
- **Database**: MongoDB mit Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Email Service**: Nodemailer
- **File Uploads**: Multer
- **Security**: Helmet, CORS

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│                    REST API (Express.js)                     │
├─────────────────────────────────────────────────────────────┤
│                     MongoDB Database                         │
└─────────────────────────────────────────────────────────────┘

Future Extension:
┌─────────────────────────┐
│   External POS System   │
│     (Kassensystem)      │
└───────────┬─────────────┘
            │
            ▼
        REST API
```

### Directory Structure

```
housnkuh_app/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # Auth contexts
│   │   ├── pages/         # Route pages
│   │   └── utils/         # Helper functions
│   └── public/           # Static assets
│
├── server/                # Express Backend
│   ├── src/
│   │   ├── controllers/  # Business logic
│   │   ├── models/       # Database schemas
│   │   ├── routes/       # API endpoints
│   │   ├── middleware/   # Auth & validation
│   │   └── utils/        # Helpers
│   └── scripts/          # DB scripts
│
└── .simone/              # Project management
```

## Core Components

### Authentication System

**Dual Authentication Architecture**:
- **Admin Context**: For platform administrators
- **Vendor Context**: For Direktvermarkter

**Why separate contexts?**
- Clear separation of concerns
- Different permission models
- Independent session management
- Simplified vendor onboarding flow

### Data Models

#### User Model
```typescript
{
  username: string          // Unique identifier
  email: string            // Contact & login
  isAdmin: boolean         // Admin privileges
  isVendor: boolean        // Vendor status
  isFullAccount: boolean   // Complete registration
  vendorProfile: {
    businessName: string
    description: string
    products: string[]
    openingHours: Object
    // ... more vendor details
  }
}
```

#### Product Model (Planned)
```typescript
{
  vendorId: ObjectId       // Reference to vendor
  name: string             // Product name
  category: string         // Product category
  price: number            // Current price
  unit: string             // Verkaufseinheit (kg, Stück, etc.)
  availability: boolean    // Currently available
  description: string      // Product details
}
```

#### Mietfach Model
```typescript
{
  standNumber: string      // Physical location
  size: string             // Unit size
  location: string         // Store section
  features: string[]       // Special features
  available: boolean       // Booking status
  currentContract: ObjectId // Active contract
}
```

### API Structure

#### Current Endpoints
- `/api/auth/*` - Admin authentication
- `/api/vendor-auth/*` - Vendor authentication
- `/api/users/*` - User management
- `/api/mietfaecher/*` - Rental unit management
- `/api/vertraege/*` - Contract management
- `/api/newsletter/*` - Newsletter subscriptions
- `/api/contact/*` - Contact forms

#### Planned Endpoints (POS Integration)
- `/api/products/*` - Product management
- `/api/pos/products` - Sync products to POS
- `/api/pos/sales` - Receive sales data
- `/api/reports/daily` - Daily sales reports
- `/api/reports/vendor/:id` - Vendor-specific reports

## Key Features

### 1. Vendor Registration & Onboarding
- Multi-step registration process
- Package selection (rental units)
- Email confirmation
- Automatic contract generation
- Pending booking system

### 2. Product Management (Planned)
- CRUD operations for products
- Category management
- Inventory tracking
- Price management
- Availability status

### 3. POS Integration (Planned)
**Outbound (to POS)**:
- Product catalog sync
- Price updates
- Availability status

**Inbound (from POS)**:
- Daily sales data
- Transaction details
- Inventory updates

### 4. Reporting System (Planned)
- Daily sales summaries
- Product performance metrics
- Revenue tracking
- Customer insights
- Export capabilities

### 5. Customer-Facing Features
- Active vendor display
- Product catalog browsing
- Vendor profiles & hours
- Location information
- Contact options

## Technical Decisions

### Why MongoDB?
- Flexible schema for vendor profiles
- Easy product catalog expansion
- Embedded documents for performance
- Good for varied product data

### Why TypeScript?
- Type safety across full stack
- Better IDE support
- Reduced runtime errors
- Self-documenting code

### Why Separate Auth Contexts?
- Vendor features isolated from admin
- Simplified permission checks
- Independent session management
- Cleaner component logic

## Security Considerations

1. **Authentication**: JWT tokens with expiration
2. **Authorization**: Role-based access control
3. **Data Validation**: Input sanitization
4. **HTTPS**: Required for production
5. **CORS**: Configured for API access
6. **File Uploads**: Type & size restrictions

## Future Enhancements

### Phase 1: Product Management
- Product CRUD interface
- Category system
- Image uploads
- Bulk import

### Phase 2: POS Integration
- REST API for external system
- Real-time sync
- Error handling
- Retry logic

### Phase 3: Analytics & Reporting
- Sales dashboards
- Performance metrics
- Export functionality
- Automated reports

### Phase 4: Customer Features
- Product search
- Filtering options
- Vendor ratings
- Newsletter personalization

## Development Guidelines

### Code Organization
- Feature-based structure
- Shared components library
- Consistent naming conventions
- TypeScript interfaces for all models

### API Design
- RESTful principles
- Consistent response format
- Proper HTTP status codes
- Comprehensive error messages

### Testing Strategy
- Unit tests for utilities
- Integration tests for API
- Component testing for UI
- E2E for critical flows

## Deployment Considerations

### Environment Variables
```env
# Server
MONGO_URI=mongodb://...
JWT_SECRET=...
EMAIL_HOST=...
EMAIL_USER=...
EMAIL_PASS=...
ADMIN_SETUP_KEY=...

# Client
REACT_APP_API_URL=...
```

### Scalability
- Horizontal scaling ready
- Database indexing strategy
- CDN for static assets
- API rate limiting

### Monitoring
- Error tracking
- Performance metrics
- User analytics
- Sales tracking

## Constraints & Requirements

1. **Regional Focus**: Platform designed for local market
2. **German Language**: Primary interface language
3. **GDPR Compliance**: Data privacy requirements
4. **Mobile Responsive**: Must work on all devices
5. **Offline Capability**: POS must handle connection issues
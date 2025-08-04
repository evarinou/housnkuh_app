# housnkuh Project Overview

## Purpose
housnkuh is a regional marketplace platform for direct marketers (Direktvermarkter) - a full-featured e-commerce platform connecting local farmers and producers with customers.

## Key Features
1. Direct marketer marketplace and listings
2. Location-based services with maps (using Leaflet)
3. Rental system (Mietfach) for vendor spaces/units
4. Newsletter subscription and management
5. Vendor registration and authentication system
6. Admin dashboard for site management
7. Trial booking system for vendors
8. Revenue tracking and reporting
9. Multi-language support (primarily German)

## Important Project Decision
**NO Coming Soon Page**: This application has NO pre-launch functionality. Full application functionality must be immediately available, but vendor trials start at the launch-day.

## Tech Stack
- **Frontend**: React 18.2 with TypeScript
- **Styling**: Tailwind CSS 3.3
- **Routing**: React Router DOM 6.30
- **State Management**: React Context API (separate contexts for Admin and Vendor auth)
- **Backend**: Node.js with Express 4.18 and TypeScript
- **Database**: MongoDB with Mongoose 8.15
- **Authentication**: JWT-based with bcrypt
- **Testing**: Jest with React Testing Library (frontend), Jest with Supertest (backend)
- **Build Tools**: Create React App (frontend), tsc (backend)
- **Other Libraries**: Axios, date-fns, Recharts, React Leaflet, Framer Motion
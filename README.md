# Western Sky Maintenance

## Overview

Western Sky Maintenance is a property maintenance management platform that helps property managers, employees, and homeowners stay organized. You can manage properties, track maintenance tasks, message team members, and handle user authentication with different permission levels. The platform supports both Google sign-in and traditional email/password login, including password reset functionality via email.

**Stack:** React 18 · TypeScript · Vite · Tailwind/shadcn · Express · PostgreSQL · Drizzle ORM · Firebase Auth · Resend · Docker

### Features
- Role-based access control (admin / employee / homeowner)
- Property and maintenance-task management
- In-app messaging between team members
- Google sign-in plus email/password auth with emailed password-reset tokens
- Shared, type-safe schema across client and server

## Getting Started

```bash
cp .env.example .env      # fill in DATABASE_URL, SESSION_SECRET, Firebase keys
docker compose up -d      # or point DATABASE_URL at your own Postgres
npm install
npm run db:push           # apply the Drizzle schema
npm run dev               # http://localhost:5000
```

## System Architecture

### Frontend (What Users See)
- **React 18** with TypeScript for type safety and modern React features
- **Wouter** - lightweight routing library to navigate between pages
- **TanStack React Query** - keeps data synced between server and UI, handles caching
- **shadcn/ui** - pre-built, accessible UI components with customizable styling
- **Tailwind CSS** - utility-based styling with an Apple-inspired design system
- **React Hook Form + Zod** - form handling with real-time validation
- **Vite** - fast build tool and dev server

### Backend (The Server)
- **Node.js + Express.js** - web server that handles API requests
- **TypeScript** compiled with esbuild for production
- **RESTful API** - all endpoints start with `/api/`
- **Express-session** - manages user login sessions on the server
- **tsx** - lets you run TypeScript directly during development

### Database (Where Data Lives)
- **PostgreSQL** via Neon serverless - stores all your data (properties, tasks, users, messages)
- **Drizzle ORM** - type-safe database queries without raw SQL
- **Shared schema** in `shared/schema.ts` - same definitions used by both frontend and backend, keeping them in sync

### Authentication & Security
- **Google OAuth** via Firebase - "Sign in with Google" functionality
- **Password hashing** with bcrypt - passwords are never stored in plain text
- **Token-based password reset** - secure reset links sent via email through Resend
- **Role-based access control** - three roles: admin (full control), employee (manage assigned properties), homeowner (view only)
- **Server-side sessions** - login state stored securely on the server

### Code Organization
- **Frontend logic** in `client/` - React components, pages, hooks, and utilities
- **Backend logic** in `server/` - API routes, database operations, session management
- **Shared code** in `shared/` - database schemas and types used by both frontend and backend
- **Database migrations** in `migrations/` - version control for database changes

```
Project Structure:
├── client/              # React app
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components for each route
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Helper functions, auth, API calls
├── server/              # Express backend
│   ├── index.ts         # Server startup file
│   ├── routes.ts        # All API endpoints
│   ├── storage.ts       # Database operations (queries, inserts, updates)
│   └── db.ts            # Database connection setup
├── shared/              # Shared between client & server
│   └── schema.ts        # Database schema definitions
└── migrations/          # Database schema version history
```

## External Services & Configuration

### Database
- **PostgreSQL via Neon** - serverless database
- Set `DATABASE_URL` environment variable with your connection string
- Uses Drizzle ORM for safe, type-checked queries

### Email & Authentication
- **Firebase** - handles Google sign-in
  - Required environment variables: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`
- **Resend** - sends password reset emails
  - Required: `RESEND_API_KEY`
  - Optional: `FROM_EMAIL` (defaults to console logging in development)

### Required Environment Variables
```
DATABASE_URL         → PostgreSQL connection string
SESSION_SECRET       → Secret key for encrypting sessions (use a strong random string)
RESEND_API_KEY       → API key for email service (optional in dev, logs to console)
APP_URL              → Your app's public URL (e.g., http://localhost:5000)
```

### Frontend Libraries You'll Use
- **React Query** - data fetching and caching
- **Radix UI** - accessible component primitives
- **Lucide React** - icons
- **date-fns** - date manipulation
- **Zod** - runtime type validation for forms

## Development Workflow

1. Frontend and backend talk to each other through REST API calls
2. React Query handles data caching and synchronization
3. Database changes go through migrations to keep schema versioned
4. Authentication is role-based - what users can do depends on their role
5. Forms validate data on the client (fast feedback) and server (security)

## Key Takeaways
- **Shared schema** keeps frontend and backend in sync with one source of truth
- **Serverless PostgreSQL** means no database server to manage
- **Role-based access** ensures users only see and do what they're allowed to
- **Email service** handles password resets securely
- **Session-based auth** keeps users logged in securely
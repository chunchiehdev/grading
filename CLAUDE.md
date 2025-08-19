# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Dev server**: `npm run dev` (React Router dev server with hot reload)
- **Build**: `npm run build` (Production build)  
- **Start production**: `npm start` (Serve built application)
- **Test**: `npm test` (Vitest), `npm run test:watch`, `npm run test:coverage`
- **Lint**: `npm run lint`, `npm run lint:fix` (ESLint)
- **Type check**: `npm run typecheck` (TypeScript + React Router typegen)
- **Format**: `npm run format`, `npm run format:check` (Prettier)
- **Database migrations**: `npm run migrate:dev` (development), `npm run migrate:prod` (production)
- **Search**: `rg <pattern>` (ripgrep for fast code search)

## Architecture Overview

This is a React Router v7 application for educational grading with comprehensive AI integration and multi-role support.

**Tech Stack**:
- Frontend: React 19 + React Router v7 + Radix UI + Tailwind CSS + Framer Motion
- Backend: Node.js with Express + Socket.IO for real-time updates
- Database: PostgreSQL with Prisma ORM (custom output: `app/generated/prisma/client`)
- Cache/Sessions: Redis with ioredis + Socket.IO Redis adapter
- Storage: MinIO (S3-compatible) with AWS SDK v3
- State: Zustand stores with persistence (`gradingStore`, `uiStore`, `uploadStore`)
- AI: Multi-provider (OpenAI + Google Generative AI) with fallback mechanisms
- Testing: Vitest + Testing Library + MSW + jsdom
- Internationalization: i18next + react-i18next with language detection
- UI: Comprehensive component library with shadcn/ui pattern + MUI integration

**Key Directories**:
- `app/routes/` - File-based routing with role-based access (teacher/student platforms)
- `app/api/` - API endpoints with centralized error handling middleware
- `app/services/` - Business logic layer with `.server.ts` naming convention
- `app/components/` - UI components organized by feature (grading, landing, ui)
- `app/stores/` - Zustand state management with Immer and persistence
- `app/schemas/` - Zod validation schemas for API and form validation
- `app/types/` - TypeScript type definitions organized by domain
- `app/locales/` - i18n translation files (en/zh) organized by feature
- `prisma/` - Database schema, migrations, and generated client

## Core User Workflows

**Teacher Workflow**:
1. Google OAuth authentication → role selection → teacher dashboard
2. Create courses with invitation codes/QR codes for student enrollment
3. Create assignment areas with attached rubrics (reusable templates)
4. View student submissions with AI analysis results
5. Provide final grades and feedback

**Student Workflow**:
1. Google OAuth authentication → role selection → student dashboard
2. Join courses via invitation codes or QR codes
3. View assignments categorized by status (pending, submitted, graded)
4. Submit files with real-time AI analysis preview
5. Track submission status and view teacher feedback

## Database Schema

PostgreSQL with Prisma ORM featuring:
- **Custom client output**: `app/generated/prisma/client`
- **Multi-platform binaries**: `["native", "linux-musl-openssl-3.0.x"]`
- **Core Models**: User, Course, AssignmentArea, Submission, Rubric, GradingSession, GradingResult, UploadedFile
- **Role-based access**: TEACHER/STUDENT enum with proper relations
- **Course management**: Teacher-owned courses with student enrollments via invitation codes
- **JSON fields**: Flexible rubric criteria, AI analysis results, and metadata storage
- **Audit trail**: Comprehensive timestamps, soft deletes, and status tracking
- **Indexes**: Optimized for common query patterns (userId, courseId, status)

## AI Integration Architecture

**Multi-Provider Strategy**:
- Primary: Google Generative AI (Gemini) with file upload support
- Fallback: OpenAI API with Assistant API for file processing
- Validation: Result quality checks with retry mechanisms
- Error handling: Comprehensive fallback chain with provider switching

**Document Processing Pipeline**:
1. **File Upload**: MinIO storage with chunked uploads and progress tracking
2. **Parsing**: External PDF parser API with async polling
3. **AI Analysis**: Multi-stage fallback (Gemini file → OpenAI file → Gemini text → OpenAI text)
4. **Result Validation**: Quality checks to prevent corrupted AI responses
5. **Storage**: Results stored as JSON in PostgreSQL with metadata

**Progress Tracking**:
- Upload progress: Redis-based real-time tracking per file/session
- Grading progress: Database-stored with phases (check → grade → verify → completed)
- Real-time updates: Socket.IO for live status updates to UI

## Authentication & Authorization

**Session-based Authentication**:
- Google OAuth 2.0 with `google-auth-library`
- Cookie-based sessions with secure configuration
- Redis session storage for scalability
- Role-based route protection (`requireAuth`, `requireTeacher`, `requireStudent`)

**Security Features**:
- CSRF protection via SameSite cookies
- Secure cookie configuration for production
- Role-based access control at route and API levels
- Session expiration and cleanup

## State Management

**Client-side (Zustand)**:
- `gradingStore`: Grading progress, results, file uploads with localStorage persistence
- `uiStore`: Theme, sidebar, navigation state with hydration safety
- `uploadStore`: File upload tracking with Immer for immutable updates

**Server-side (Redis)**:
- Upload progress tracking with TTL expiration
- Session storage for authentication
- Caching for frequently accessed data

## Configuration & Environment

**Docker Development Setup**:
- PostgreSQL database with admin user
- Redis cache with password protection
- MinIO object storage with S3-compatible API
- External PDF parser API integration

**Environment Variables**:
- Database: `DATABASE_URL` for PostgreSQL connection
- Redis: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- Storage: `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
- AI: `GOOGLE_API_KEY`, `OPENAI_API_KEY`
- Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`

## Code Patterns & Conventions

**Service Layer Patterns**:
- All server-side code uses `.server.ts` suffix
- Export interfaces for return types with comprehensive JSDoc
- Always handle errors gracefully with fallback values
- Use descriptive function names and consistent error handling

**API Design**:
- Centralized error handling with `ApiError` class and `withErrorHandler`
- Consistent response format: `{ success: boolean, data?: T, error?: string }`
- Role-based middleware for route protection
- Comprehensive input validation with Zod schemas

**Database Operations**:
- Always use Prisma transactions for multi-model operations
- Proper error handling with user-friendly messages
- Optimized queries with appropriate includes and selects
- Consistent use of UUID primary keys and proper indexing

**Component Architecture**:
- Feature-based organization (grading/, landing/, ui/)
- Comprehensive prop interfaces with TypeScript
- Accessibility-first design with Radix UI primitives
- Consistent styling with Tailwind CSS and shadcn/ui patterns

## Testing Strategy

**Test Structure**:
- Unit tests with Vitest and jsdom environment
- Component testing with React Testing Library
- API mocking with MSW (Mock Service Worker)
- Factory pattern for test data generation
- Isolated test database configuration

**Coverage Areas**:
- Service layer business logic
- Component rendering and interactions
- API endpoint validation
- Database operations and transactions
- File upload and processing workflows

## Internationalization

**i18n Implementation**:
- i18next with react-i18next integration
- Automatic language detection with fallbacks
- Feature-based translation organization (auth, course, grading, etc.)
- Server-side rendering support with hydration safety
- Language switching with persistent user preference

## Performance Optimizations

**Frontend**:
- Code splitting with React Router v7
- Lazy loading for non-critical components
- Optimized bundle analysis with rollup-plugin-visualizer
- Image optimization and lazy loading
- Efficient state updates with Zustand and Immer

**Backend**:
- Redis caching for frequently accessed data
- Database query optimization with proper indexing
- File upload chunking for large files
- Rate limiting and request queuing for AI APIs
- Background job processing for long-running tasks

## Deployment & Infrastructure

**Container Support**:
- Multi-stage Docker builds for production optimization
- Kubernetes manifests for dev/prod environments
- Health check endpoints for container orchestration
- Environment-specific configuration management

**Monitoring & Logging**:
- Structured logging with Pino
- Comprehensive error tracking
- Performance monitoring for AI API usage
- File upload and processing metrics

## Fixed Issues & Technical Debt

- **Rubric Save Hanging**: Fixed loading state persistence in form components
- **Store Hydration**: Proper SSR hydration handling for Zustand stores
- **File Upload Error Handling**: Comprehensive error types and user feedback
- **AI Provider Fallbacks**: Robust error handling with automatic provider switching
- **Database Connection Pooling**: Optimized Prisma client configuration

## Development Best Practices

- Always import database types from `app/types/database.ts` for consistency
- Use Redis for temporary data, PostgreSQL for persistent data
- Implement proper error boundaries in React components
- Follow the established service layer patterns for new features
- Test both success and error paths for critical workflows
- Document complex business logic with comprehensive comments
- dont run the server. I will start it myself using docker-compose.dev.yaml
- do not run npm run typecheck. I will do it myself.
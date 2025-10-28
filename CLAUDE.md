# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a grading system application built with React Router v7, TypeScript, and Prisma. It supports both teacher and student platforms with AI-powered grading capabilities using Gemini and OpenAI APIs.

## Tech Stack

- **Frontend**: React 19, React Router v7, TypeScript, Tailwind CSS, Radix UI, Zustand
- **Backend**: Node.js, Express, Prisma ORM, BullMQ for job queuing
- **Database**: PostgreSQL 16
- **Cache/Queue**: Redis 7 with BullMQ
- **Storage**: MinIO (S3-compatible object storage)
- **AI**: Google Gemini API, OpenAI API
- **Real-time**: Socket.io with Redis adapter
- **Testing**: Vitest, Testing Library
- **Container**: Docker Compose for development

## Development Commands

```bash
# Start development environment (all services)
docker-compose -f docker-compose.dev.yaml up -d

# Install dependencies
npm install

# Run development server (outside Docker)
npm run dev

# Run tests
npm run test                  # Run once
npm run test:watch            # Watch mode
npm run test:coverage         # With coverage
npm run test -- filename      # Specific file

# Database migrations
npm run migrate:dev           # Apply migrations in dev
npm run migrate:prod          # Deploy migrations in production
npx prisma generate          # Generate Prisma client

# Code quality
npm run lint                  # ESLint check
npm run lint:fix             # ESLint auto-fix
npm run format               # Prettier format
npm run typecheck            # TypeScript check

# Build and production
npm run build                # Build for production
npm run start                # Start production server
```

## Architecture Principles

### React Router v7 Patterns

This project uses React Router v7 (NOT Remix). Key patterns:

1. **Server-side data loading** via loaders:
```typescript
export const loader = async ({ request }: { request: Request }) => {
  const userId = await getUserId(request);
  const data = await fetchData(userId);
  return { data };
};
```

2. **Use correct imports** - Always use `react-router`, never `@remix-run/*`:
```typescript
import { useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
```

3. **Routes defined in `app/routes.ts`** using the new routing API

### File Naming Conventions

- **Server-only code**: Must use `.server.ts` suffix (e.g., `auth.server.ts`)
- **Route files**: Follow React Router v7 conventions in `app/routes/`
- **Components**: PascalCase in `app/components/`
- **Utilities**: camelCase in `app/utils/`
- **Schemas**: Zod schemas in `app/schemas/`

### Service Layer Architecture

Services in `app/services/*.server.ts` follow these patterns:

1. **Always handle errors gracefully** - return fallback values, don't throw
2. **Export interfaces** for return types
3. **Use Prisma client** for database operations
4. **ES modules only** - use `await import()`, never `require()`

### Database and Prisma

- **Prisma schema**: Located at `prisma/schema.prisma`
- **Generated client**: Output to `app/generated/prisma/client/`
- **Main entities**: User, Course, Class, Assignment, Submission, Rubric, GradingSession
- **Role-based system**: TEACHER, STUDENT, ADMIN roles

### Queue System (BullMQ)

The application uses BullMQ for async job processing:

- **Grading jobs**: Processed via `bullmq-grading.server.ts`
- **Redis connection**: Configured in `app/config/redis.ts`
- **Worker initialization**: Via `worker-init.server.ts`
- **Rate limiting**: Built-in queue rate limiting support

### Testing Strategy

All tests are consolidated in the `test/` directory with the following structure:

1. **Integration tests** in `test/integration/` - complete workflows and UI testing
2. **Unit tests** in `test/unit/` - isolated functions
3. **Contract tests** in `test/contract/` - API contract validation
4. **Load tests** in `test/load/` - performance and load testing
5. **Fixtures** in `test/fixtures/` - shared test data
6. **Factories** in `test/factories/` - test data creation utilities
7. **Mocks** in `test/mocks/` - mock services and handlers
8. **Sequential execution** to prevent database conflicts
9. **Automatic cleanup** after each test via `cleanupTestData()`

### AI Integration

The system integrates multiple AI providers:

- **Gemini API** for grading and rubric generation
- **OpenAI API** as fallback/alternative
- **Circuit breaker pattern** for resilience
- **Structured prompts** for consistent grading

## Key Services

- `grading-session.server.ts` - Main grading orchestration
- `bullmq-grading.server.ts` - Async grading job processing
- `ai-grader.server.ts` - AI grading logic
- `auth.server.ts` - Authentication and authorization
- `course.server.ts` - Course management
- `enrollment.server.ts` - Student enrollment handling

## Environment Variables

Key environment variables (see docker-compose.dev.yaml for full list):

- `DATABASE_URL` - PostgreSQL connection
- `REDIS_HOST/PORT/PASSWORD` - Redis configuration
- `GEMINI_API_KEY` - Google AI API key
- `OPENAI_API_KEY` - OpenAI API key
- `GOOGLE_CLIENT_ID/SECRET` - OAuth configuration
- `MINIO_*` - Object storage settings
- `AUTH_SECRET` - Session encryption key

## Code Style Requirements

From the existing Copilot instructions:

- Be terse and provide actual code, not high-level explanations
- Treat developers as experts
- No moral lectures or unnecessary warnings
- Respect prettier formatting preferences
- For code adjustments, show only relevant context (few lines before/after changes)

## Component Standards

When creating React components:

1. Use functional components with TypeScript
2. Prefer Radix UI primitives over custom implementations
3. Use Tailwind CSS for styling (with `cn()` utility for conditional classes)
4. Follow the existing component patterns in `app/components/`

## API Route Patterns

API routes follow REST conventions:

- Located in `app/routes/api.*.ts`
- Use Zod for input validation
- Return `Response.json()` for JSON responses
- Handle errors with appropriate status codes

## State Management

- **Zustand** for client-side global state
- **React Query (TanStack Query)** for server state
- **React Context** for theme and localization
- Avoid prop drilling by using appropriate state management

## Important Notes

1. This is an ES modules project - always use `import`, never `require()`
2. Server-side code must have `.server.ts` suffix to prevent client bundling
3. Use `Promise.all()` for parallel data fetching in loaders
4. Always validate user inputs with Zod schemas
5. Handle database operations in service layer, not directly in routes
6. Use transactions for multi-step database operations
7. Tests run against development database with cleanup - ensure Docker is running
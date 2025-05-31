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

This is a React Router v7 application (upgraded from Remix) for educational grading with AI integration.

**Tech Stack**:
- Frontend: React 19 + React Router v7 + Radix UI + Tailwind CSS
- Backend: Node.js with Express
- Database: PostgreSQL with Prisma ORM (custom output path: `app/generated/prisma/client`)
- Cache/Sessions: Redis with ioredis
- Storage: MinIO (S3-compatible) 
- State: Zustand stores (`gradingStore`, `uiStore`, `uploadStore`)
- AI: OpenAI API + Google Generative AI
- Testing: Vitest + Testing Library + MSW

**Key Directories**:
- `app/routes/` - File-based routing (auth, dashboard, rubrics, grading)
- `app/api/` - API endpoints with middleware
- `app/services/` - Business logic (auth, file upload, grading, rubric management)
- `app/components/` - UI components with shadcn/ui pattern
- `app/stores/` - Zustand state management
- `app/schemas/` - Zod validation schemas
- `prisma/` - Database schema and migrations

## Core Workflows

**Authentication**: Session-based with Google OAuth, Redis storage, route protection via `requireAuth` middleware

**Rubric Management**: CRUD operations with Prisma transactions, `UIRubricData` Zod schema for validation, transform utilities between UI and database formats

**File Upload**: Chunked uploads with Redis progress tracking, MinIO backend, real-time status updates using upload IDs

**Grading**: Document processing with AI integration, multi-phase progress tracking, rubric-based scoring, Redis pub/sub for real-time updates

## Database

Prisma schema with PostgreSQL:
- Custom client output: `app/generated/prisma/client`
- Multi-target binaries: `["native", "linux-musl-openssl-3.0.x"]` 
- Models: User, GradingTask, Rubric, RubricCriteria
- JSON fields for flexible data (feedback, metadata, scoring levels)
- UUID primary keys, proper indexing, cascade deletes

Migration commands: `npx prisma migrate dev` (development), `npx prisma migrate deploy` (production)

## Development Setup

Uses Docker Compose for local development with PostgreSQL, Redis, and MinIO containers. Environment variables required for database, Redis, MinIO connections, and external API keys.

## Code Patterns

- Route protection: Use `requireAuth` middleware for authenticated routes
- State management: Zustand stores for client state, Redis for server-side sessions/cache
- Error handling: Comprehensive error types in `app/types/errors.ts`
- Validation: Zod schemas for all API inputs and form validation
- File operations: Always use MinIO service layer, never direct filesystem access
- Database: Always use Prisma transactions for multi-model operations
- Loading states: Always reset `isLoading` state in `useEffect` when `actionData` changes
- JSDoc: All exported functions have comprehensive JSDoc documentation

## Fixed Issues

- **Rubric Save Hanging**: Fixed loading state getting stuck at "正在儲存評分標準..." in both `new.tsx` and `$rubricId.edit.tsx` by adding `useEffect` to reset `isLoading` when `actionData` changes.

## Code Quality

- Unused files have been cleaned up (carousel, hover-card, alert components, test routes)
- Store syntax has been corrected for proper Zustand usage
- Alert components replaced with simple div elements for consistency

- to memorize.
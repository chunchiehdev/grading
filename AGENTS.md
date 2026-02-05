# AGENTS.md

This file contains essential guidelines for agentic coding agents working in this repository.

## Development Commands

### Build & Quality
```bash
npm run build          # Build for production
npm run typecheck      # TypeScript check (REQUIRED)
npm run lint           # ESLint check
npm run lint:fix       # ESLint auto-fix
npm run format         # Prettier format
npm run format:check   # Check formatting
```

### Testing
```bash
npm run test           # Run tests once
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage
npm run test -- filename  # Run specific test file
```

### Database
```bash
npm run migrate:dev    # Apply migrations in dev
npm run migrate:prod   # Deploy migrations in production
npx prisma generate    # Generate Prisma client
```

### Development
```bash
npm run dev            # Start development server
docker-compose -f docker-compose.dev.yaml up -d  # Start all services
```

## Code Style Guidelines

### Import Rules
- Use `react-router` imports, never `@remix-run/*`
- Server-only files must use `.server.ts` suffix
- Use path aliases: `@/` for app root imports
- Import order: external libs → internal modules → relative imports

### TypeScript Requirements
- **NEVER** use `any` type - create proper interfaces
- Check for existing interfaces before creating new ones
- Use proper typing for all function parameters and return values
- Export interfaces for service return types

### File Naming Conventions
- **Server code**: `.server.ts` suffix (e.g., `auth.server.ts`)
- **Routes**: React Router v7 conventions in `app/routes/`
- **Components**: PascalCase in `app/components/`
- **Utilities**: camelCase in `app/utils/`
- **Schemas**: Zod schemas in `app/schemas/`
- **Types**: TypeScript interfaces in `app/types/`

### React Component Standards
- Functional components with TypeScript
- Prefer Radix UI primitives over custom implementations
- Use Tailwind CSS with `cn()` utility for conditional classes
- Follow existing component patterns in `app/components/`

### Service Layer Architecture
Services in `app/services/*.server.ts` must:
1. **Handle errors gracefully** - return fallback values, don't throw
2. **Export interfaces** for return types
3. **Use Prisma client** for database operations
4. **ES modules only** - use `await import()`, never `require()`

### Error Handling
- Services should never throw errors to routes
- Return fallback values or null/undefined on failure
- Use proper error logging with the logger utility
- Handle database errors gracefully

### Database Operations
- Use Prisma client from `@/lib/db.server`
- Perform operations in service layer, not routes
- Use transactions for multi-step operations
- Follow the existing schema patterns

### React Router v7 Patterns
1. **Server-side data loading** via loaders:
```typescript
export const loader = async ({ request }: { request: Request }) => {
  const userId = await getUserId(request);
  const data = await fetchData(userId);
  return { data };
};
```

2. **Use correct imports**:
```typescript
import { useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
```

### API Route Patterns
- Located in `app/routes/api.*.ts`
- Use Zod for input validation
- Return `Response.json()` for JSON responses
- Handle errors with appropriate status codes

### Testing Requirements
- Tests located in `test/` directory
- Use Vitest with Testing Library
- Run against development database
- Clean up test data after each test
- Sequential execution to prevent conflicts

### State Management
- **Zustand** for client-side global state
- **React Query (TanStack Query)** for server state
- **React Context** for theme and localization
- Avoid prop drilling

### Code Quality Rules
- Always run `npm run typecheck` before committing
- Use `npm run lint:fix` to auto-fix linting issues
- Follow Prettier formatting (configured in project)
- Remove unused imports (ESLint rule enforced)

### Git Workflow
- **DO NOT** use `git add .` or `git commit` without explicit instruction
- Make targeted commits for specific changes
- Ensure all tests pass before committing

### Environment & Dependencies
- ES modules project - always use `import`, never `require()`
- Check package.json for available libraries before adding new ones
- Use existing utilities and helpers when possible
- Follow the established tech stack patterns

### Communication Style
From Copilot instructions:
- Be casual, terse, and accurate
- Provide actual code, not high-level explanations
- Give answers immediately, detailed explanations after
- No moral lectures or unnecessary warnings
- Respect Prettier preferences
- Keep responses brief, show only relevant context around changes

### Critical Reminders
- Use `npm run typecheck` instead of `npx tsc` or `npm run build`
- Server-side code must have `.server.ts` suffix
- Never use `any` type - create proper interfaces
- Check for existing interfaces before creating new ones
- Always validate inputs with Zod schemas
- Handle database operations in service layer
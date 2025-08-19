# Repository Guidelines

## Project Structure & Module Organization
- Source: `app/` (React Router v7). Key folders: `app/routes/` (route files), `app/components/` (UI), `app/services/`, `app/api/`, `app/utils/`.
- Tests: `test/` (setup, helpers); JS DOM env via Vitest.
- Assets: `public/` (images, static files), `tailwind.css` in `app/`.
- Data: `prisma/` (schema and migrations). Docs in `docs/`. Deployment manifests in `k8s/`.

## Build, Test, and Development Commands
- `npm run dev`: Start local dev server (React Router).
- `npm run build`: Build client and server bundles to `build/`.
- `npm start`: Serve the built app (uses `react-router-serve`).
- `npm run typecheck`: Generate route types and run TypeScript.
- `npm run test` | `npm run test:watch` | `npm run test:coverage`: Run Vitest.
- `npm run lint` | `npm run lint:fix`: Lint (ESLint) and auto‑fix.
- `npm run format` | `npm run format:check`: Prettier formatting.
- `npm run migrate:dev` / `npm run migrate:prod`: Prisma migrations + generate client.

## Coding Style & Naming Conventions
- Language: TypeScript (`.ts/.tsx`), Node ≥ 20.
- Formatting: Prettier; 2‑space indent, single quotes where possible.
- Linting: ESLint config in `.eslintrc.cjs`; follow rules and fix warnings.
- Naming: React components `PascalCase` (e.g., `CriterionCard.tsx`); hooks `useCamelCase` (e.g., `useFeature.ts`); route files follow file‑system routing with URL‑friendly names (e.g., `app/routes/grading-history.tsx`).
- Imports: Prefer path aliases from `tsconfig.json` where configured; keep imports ordered logically.

## Testing Guidelines
- Framework: Vitest + Testing Library (`jsdom`). Setup at `test/setup.ts`.
- Location: Unit/integration tests in `test/`; component tests may mirror `app/` structure.
- Naming: `*.test.ts` / `*.test.tsx`.
- Running: `npm run test` locally; ensure coverage passes with `npm run test:coverage` for PRs that touch logic.

## Commit & Pull Request Guidelines
- Commits: Conventional style (`feat:`, `fix:`, `chore:`). Example: `feat: add rubric preview accordion`.
- PRs: Include summary, rationale, screenshots/GIFs for UI, and linked issues. Note any schema changes and required env vars.
- Checks: PRs should pass build, typecheck, lint, tests, and schema migration (if applicable).

## Security & Configuration Tips
- Env: Copy `.env.example` to `.env`; never commit secrets. Tests can use `TEST_DATABASE_URL` (see `vitest.config.ts`).
- Database: Use `npm run migrate:dev` before running locally; commit generated migrations.

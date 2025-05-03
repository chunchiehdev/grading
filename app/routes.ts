import { route, type RouteConfig } from "@react-router/dev/routes";


export default [
  // Public routes
  route('/', './routes/_index.tsx'),

  // Auth routes
  route('/auth', './routes/_auth.tsx', [
    route('login', './routes/_auth.login.tsx'),
    route('google', './routes/auth.google.tsx'),
    route('google/callback', './routes/auth.google.callback.tsx'),
    route('logout', './routes/_auth.logout.tsx'),
  ]),

  
  // Dashboard routes
  route('/dashboard', './routes/dashboard.tsx'),

  // Assignment routes
  route('/assignments/grade/:taskId', './routes/assignments.grade.$taskId.tsx'),
  route('/assignments/grading-with-rubric', './routes/assignments.grading-with-rubric.tsx'),

  // Rubric routes
  route('/rubrics', './routes/rubrics.tsx', [
    route('', './routes/rubrics._index.tsx', { index: true }),
    route('new', './routes/rubrics.new.tsx'),
    route(':rubricId', './routes/rubrics.$rubricId.tsx'),
    route(':rubricId/edit', './routes/rubrics.$rubricId.edit.tsx'),
  ]),

  // API routes
  route('/api/grading-progress', './routes/api.grading-progress.ts'),
  route('/api/create-grading', './routes/api.create-grading.ts'),
  route('/api/grade-with-rubric', './routes/api.grade-with-rubric.ts'),
  route('/api/upload', './routes/api.upload.ts'),
  route('/api/upload/create-id', './routes/api.upload.create-id.ts'),
  route('/api/upload/delete-file', './routes/api.upload.delete-file.ts'),
  route('/api/upload/progress/:id', './routes/api.upload.progress.$id.ts'),
  route('/api/process-documents', './routes/api.process-documents.ts'),
  route('/api/grading', './routes/api.grading.ts'),

  // Auth API routes
  route('/api/auth/login', './routes/api.auth.login.ts'),
  route('/api/auth/logout', './routes/api.auth.logout.ts'),
  route('/api/auth/check', './routes/api.auth.check.ts'),
  // Other routes

  route('/grading-history', './routes/grading-history.tsx'),
  route('/health', './routes/health.tsx'),

  // 404 route
  route('*', './routes/_404.tsx'),
] satisfies RouteConfig;

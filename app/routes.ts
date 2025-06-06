import { route, index, layout, prefix, type RouteConfig } from "@react-router/dev/routes";


export default [
  // Public routes
  index('./routes/index.tsx'),

  route('/auth', './routes/auth/layout.tsx', [  
    route('login', './routes/auth/login.tsx'), 
    route('google', './routes/auth/google.tsx'),
    route('google/callback', './routes/auth/google.callback.tsx'),
    route('logout', './routes/auth/logout.tsx'),
  ]),
  
  // Dashboard routes
  route('/dashboard', './routes/dashboard.tsx'),

  // Assignment routes
  route('/grading-with-rubric', './routes/grading-with-rubric.tsx'),

  route('/rubrics', './routes/rubrics/layout.tsx', [
    route('', './routes/rubrics/index.tsx'),
    route('new', './routes/rubrics/new.tsx'),
    route(':rubricId', './routes/rubrics/$rubricId.tsx'),
    route(':rubricId/edit', './routes/rubrics/$rubricId.edit.tsx'),
  ]),

  // API routes
  route('/api/grade-with-rubric', './api/grade/with-rubric.ts'),
  route('/api/grade-progress', './api/grade/progress.ts'),
  route('/api/grade/init', './api/grade/init.ts'),
  route('/api/upload', './api/upload/index.ts'),
  route('/api/upload/create-id', './api/upload/create-id.ts'),
  route('/api/upload/delete-file', './api/upload/delete-file.ts'),
  route('/api/upload/progress/:id', './api/upload/progress.$id.ts'),

  // File management API routes
  route('/api/files', './api/files/index.ts'),
  route('/api/files/user-files', './api/files/user-files.ts'),
  route('/api/files/update-rubric', './api/files/update-rubric.ts'),
  
  // Rubric API routes
  route('/api/rubrics', './api/rubrics/index.ts'),

  // Grading session API routes
  route('/api/grading/session', './api/grading/session.ts'),
  route('/api/grading/session/:sessionId', './api/grading/session.$sessionId.ts'),
  route('/api/grading/results', './api/grading/results.ts'),

  // Admin API routes
  route('/api/admin/queue-status', './api/admin/queue-status.ts'),

  // Auth API routes
  route('/api/auth/login', './api/auth/login.ts'),
  route('/api/auth/logout', './api/auth/logout.ts'),
  route('/api/auth/check', './api/auth/check.ts'),

  // AI API routes
  route('/api/ai/generate-rubric', './routes/api.ai.generate-rubric.ts'),

  // Gemini API routes
  route('/api/gemini/test', './api/gemini/test.ts'),

  // Grading history routes
  route('/grading-history', './routes/grading-history.tsx'),
  route('/grading-history/:sessionId', './routes/grading-history/$sessionId.tsx'),
  route('/health', './routes/health.tsx'),
  route('/test-markdown', './routes/test-markdown.tsx'),
  // route('/test-result-layouts', './routes/test-result-layouts.tsx'),

  // 404 route
  route('*', './routes/_404.tsx'),
] satisfies RouteConfig;

import { route, index, prefix, type RouteConfig } from "@react-router/dev/routes";


export default [
  // Public routes
  index('./routes/index.tsx'),
  route('/join', './routes/join.tsx'),

  route('/auth', './routes/auth/layout.tsx', [  
    route('login', './routes/auth/login.tsx'), 
    route('google', './routes/auth/google.tsx'),
    route('google/callback', './routes/auth/google.callback.tsx'),
    route('logout', './routes/auth/logout.tsx'),
    route('select-role', './routes/auth/select-role.tsx'),
    route('unauthorized', './routes/auth/unauthorized.tsx'),
  ]),
  
  // Teacher Platform routes
  ...prefix('/teacher', [
    route('dashboard', './routes/teacher/dashboard.tsx'),
    route('analytics', './routes/teacher/analytics.tsx'),
    route('courses', './routes/teacher/courses/index.tsx'),
    route('courses/new', './routes/teacher/courses/new.tsx'),
    route('courses/:courseId/edit', './routes/teacher/courses/$courseId/edit.tsx'),
    route('courses/:courseId/settings', './routes/teacher/courses/$courseId/settings.tsx'),
    route('courses/:courseId/students', './routes/teacher/courses/$courseId/students.tsx'),
    
    route('courses/:courseId/classes/new', './routes/teacher/courses/$courseId/classes/new.tsx'),
    route('courses/:courseId/classes/:classId/students', './routes/teacher/courses/$courseId/classes/$classId/students.tsx'),
    route('courses/:courseId/classes/:classId/edit', './routes/teacher/courses/$courseId/classes/$classId/edit.tsx'),

    route('courses/:courseId', './routes/teacher/courses/$courseId.tsx'),
    route('courses/:courseId/assignments/new', './routes/teacher/courses/$courseId/assignments/new.tsx'),
    route('courses/:courseId/assignments/:assignmentId/manage', './routes/teacher/courses/$courseId/assignments/$assignmentId.manage.tsx'),
    route('courses/:courseId/assignments/:assignmentId/submissions', './routes/teacher/courses/$courseId/assignments/$assignmentId.submissions.tsx'),
    route('submissions/:submissionId/view', './routes/teacher/submissions/$submissionId.view.tsx'),
    route('rubrics', './routes/teacher/rubrics.tsx'),
    route('rubrics/new', './routes/teacher/rubrics/new.tsx'),
    route('rubrics/:rubricId', './routes/teacher/rubrics/$rubricId.tsx'),
    route('rubrics/:rubricId/edit', './routes/teacher/rubrics/$rubricId.edit.tsx'),
  ]),

  // Student Platform routes
  ...prefix('/student', [
    route('dashboard', './routes/student/dashboard.tsx'),
    route('courses', './routes/student/courses.tsx'),
    route('assignments', './routes/student/assignments.tsx'),
    route('assignments/:assignmentId/submit', './routes/student/assignments/$assignmentId/submit.tsx'),
    route('submissions', './routes/student/submissions/index.tsx'),
    route('submissions/:submissionId', './routes/student/submissions/$submissionId.tsx'),
  ]),
  

  // API routes
  route('/api/grade-with-rubric', './api/grade/with-rubric.ts'),
  route('/api/grade-progress', './api/grade/progress.ts'),
  route('/api/grade/init', './api/grade/init.ts'),
  route('/api/upload', './api/upload/index.ts'),
  route('/api/upload/create-id', './api/upload/create-id.ts'),
  route('/api/upload/delete-file', './api/upload/delete-file.ts'),
  route('/api/upload/progress', './api/upload/progress.ts'),
  

  // File management API routes
  route('/api/files', './api/files/index.ts'),
  route('/api/files/user-files', './api/files/user-files.ts'),
  route('/api/files/:fileId/download', './routes/api.files.$fileId.download.ts'),
  
  // Rubric API routes
  route('/api/rubrics', './api/rubrics/index.ts'),

  // Grading session API routes
  route('/api/grading/session', './api/grading/session.ts'),
  route('/api/grading/session/:sessionId', './api/grading/session.$sessionId.ts'),
  route('/api/grading/results', './api/grading/results.ts'),

  // Admin API routes
  route('/api/admin/queue-status', './api/admin/queue-status.ts'),

  // Auth API routes
  route('/api/auth/logout', './api/auth/logout.ts'),
  route('/api/auth/check', './api/auth/check.ts'),

  route('/api/chat', './api/chat/index.ts'),
  route('/api/chat/messages', './api/chat/messages.ts'),
  route('/api/chat/:id/messages-since', './routes/api.chat.$id.messages-since.ts'),
  // Use :chatId to match $chatId route module param name
  route('/api/chat/:chatId', './api/chat/$chatId.ts'),
  
  // Message API routes
  route('/api/messages/:id', './routes/api.messages.$id.ts'),

  // Version API route
  route('/api/version', './routes/api.version.ts'),

  // AI API routes
  route('/api/ai/generate-rubric', './routes/api.ai.generate-rubric.ts'),
  
  // Student Submission API
  route('/api/student/submit', './api/student/submit.ts'),
  route('/api/student/assignments', './api/student/assignments/index.ts'),
  route('/api/student/assignments/:assignmentId/draft', './api/student/assignments/$assignmentId/draft.ts'),

  route('/health', './routes/health.tsx'),
  
  
  // 404 route
  route('*', './routes/_404.tsx'),
] satisfies RouteConfig;

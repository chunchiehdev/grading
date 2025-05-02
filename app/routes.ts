import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  // Public routes
  route("/", "./routes/_index.tsx"),

  // Auth routes
  route("/auth", "./routes/_auth.tsx", [
    route("login", "./routes/_auth.login.tsx"),
    route("google", "./routes/auth.google.tsx"),
    route("google/callback", "./routes/auth.google.callback.tsx"),
    route("logout", "./routes/_auth.logout.tsx"),
  ]),

  // Auth API routes
  route("/api/auth/login", "./routes/api.auth.login.ts"),
  route("/api/auth/logout", "./routes/api.auth.logout.ts"),
  route("/api/auth/check", "./routes/api.auth.check.ts"),

  // Dashboard routes
  route("/dashboard", "./routes/dashboard.tsx"),

  // Assignment routes
  route("/assignments/grade/:taskId", "./routes/assignments.grade.$taskId.tsx"),
  route(
    "/assignments/grading-with-rubric",
    "./routes/assignments.grading-with-rubric.tsx"
  ),
  route("/assignments/lti-grading", "./routes/assignments.lti-grading.tsx"),

  // Rubric routes
  route("/rubrics", "./routes/rubrics.tsx", [
    route("", "./routes/rubrics._index.tsx"),
    route("new", "./routes/rubrics.new.tsx"),
    route(":rubricId", "./routes/rubrics.$rubricId.tsx"),
    route(":rubricId/edit", "./routes/rubrics.$rubricId.edit.tsx"),
  ]),

  // API routes
  route("/api/grading-progress", "./routes/api.grading-progress.ts"),
  route("/api/create-grading", "./routes/api.create-grading.ts"),
  route("/api/grade-with-rubric", "./routes/api.grade-with-rubric.ts"),
  route("/api/upload", "./routes/api.upload.ts"),
  route("/api/upload/create-id", "./routes/api.upload.create-id.ts"),
  route(
    "/api/upload/progress/:uploadId",
    "./routes/api.upload.progress.$uploadId.ts"
  ),
  route("/api/upload/delete-file", "./routes/api.upload.delete-file.ts"),
  route(
    "/api/upload/clear-progress/:uploadId/:filename",
    "./routes/api.upload.clear-progress.$uploadId.$filename.ts"
  ),
  route("/api/process-documents", "./routes/api.process-documents.ts"),
  route("/api/grading", "./routes/api.grading.ts"),
  route("/api/batch-grading", "./routes/api.batch-grading.ts"),
  route("/api/counter", "./routes/api.counter.ts"),
  route("/api/lti/launch", "./routes/api.lti.launch.ts"),

  // Admin routes
  route("/admin/api-keys", "./routes/admin.api-keys.tsx"),

  // Other routes
  route("/grading-history", "./routes/grading-history.tsx"),
  route("/health", "./routes/health.tsx"),
  route("/favicon.ico", "./routes/favicon.ico.ts"),

  // 404 route
  route("*", "./routes/_404.tsx"),
] satisfies RouteConfig;

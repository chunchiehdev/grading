import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("/", "./routes/_index.tsx"),
  
  route("/dashboard", "./routes/dashboard.tsx"),
  
  route("*", "./routes/_404.tsx"),
  
  route("/auth/login", "./routes/_layout.auth.login.tsx"),
  route("/auth/logout", "./routes/_auth.logout.tsx"),
  route("/register", "./routes/register.tsx"),
  route("/auth/google", "./routes/auth.google.tsx"),
  route("/auth/google/callback", "./routes/auth.google.callback.tsx"),
  
  route("/assignments/grade/:taskId", "./routes/assignments.grade.$taskId.tsx"),
  route("/assignments/grading-with-rubric", "./routes/assignments.grading-with-rubric.tsx"),
  
  route("/api/grading-progress", "./routes/api.grading-progress.ts"),
  route("/api/create-grading", "./routes/api.create-grading.ts"),
  route("/api/grade-with-rubric", "./routes/api.grade-with-rubric.ts"),
  
  route("/set-theme", "./routes/set-theme.ts")
] satisfies RouteConfig; 
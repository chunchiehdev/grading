# System Context Document

**Target Audience**: LLM (Large Language Model)
**Version**: 2026-01-11
**Database**: PostgreSQL via Prisma ORM

---

## Section 1: Data Schema (Machine Optimized)

### Enums

```typescript
type UserRole = "STUDENT" | "TEACHER" | "ADMIN";
type SubmissionStatus = "DRAFT" | "SUBMITTED" | "ANALYZED" | "GRADED";
type GradingSessionStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
type GradingStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "SKIPPED";
type FileParseStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
type NotificationType = "ASSIGNMENT_CREATED" | "ASSIGNMENT_DUE_SOON" | "SUBMISSION_GRADED" | "COURSE_ANNOUNCEMENT";
type ChatRole = "USER" | "AI";
```

### Core Domain Models

#### User (Central Entity)

```typescript
interface User {
  id: string;              // @id, uuid
  email: string;           // @unique
  role: UserRole;          // Core: Access control
  hasSelectedRole: boolean;
  name: string;
  picture: string;
  aiEnabled: boolean;      // Core: AI feature gate (Admin-managed)
  createdAt: DateTime;
  updatedAt: DateTime;
  // @relation → Course[], Rubric[], GradingSession[], UploadedFile[], Submission[], Enrollment[], Chat[], AgentChatSession[], Notification[]
}
```

#### Course (Teacher-owned)

```typescript
interface Course {
  id: string;              // @id, uuid
  name: string;            // Core: Course identifier
  code?: string;           // @index, e.g. "CS 201"
  description?: string;
  teacherId: string;       // @relation → User
  syllabus?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
  // @relation → Class[], AssignmentArea[], InvitationCode[], Notification[]
}
```

#### Class (Section within Course)

```typescript
interface Class {
  id: string;              // @id, uuid
  courseId: string;        // @relation → Course
  name: string;            // Core: "101班", "Section A"
  schedule?: JSON;         // { weekday, periodCode, room? }
  capacity?: number;
  assistantId?: string;    // @relation → User (TA)
  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
  // @relation → Enrollment[], AssignmentArea[], InvitationCode[]
}
```

#### AssignmentArea (Assignment Definition)

```typescript
interface AssignmentArea {
  id: string;              // @id, uuid
  name: string;            // Core: Assignment title
  description?: string;
  courseId: string;        // @relation → Course
  classId?: string;        // @relation → Class (null = all classes)
  rubricId: string;        // @relation → Rubric (required)
  dueDate?: DateTime;
  referenceFileIds?: string;       // Core: JSON array of UploadedFile IDs for AI context
  customGradingPrompt?: string;    // Core: Custom AI grading instructions
  createdAt: DateTime;
  updatedAt: DateTime;
  // @relation → Submission[], Notification[], GradingResult[]
}
```

#### Submission (Student Work)

```typescript
interface Submission {
  id: string;              // @id, uuid
  studentId: string;       // @relation → User
  assignmentAreaId: string;// @relation → AssignmentArea
  // Version Control
  version: number;         // Core: Submission versioning
  isLatest: boolean;       // @index
  previousVersionId?: string; // @relation → Submission (self)
  filePath: string;        // Core: S3/storage path
  uploadedAt: DateTime;
  // AI Grading Results
  sessionId?: string;      // Links to GradingSession
  aiAnalysisResult?: JSON; // Core: AI analysis output
  thinkingProcess?: string;// AI reasoning (raw)
  gradingRationale?: string;// AI formal rationale
  finalScore?: number;
  normalizedScore?: number;// Core: 0-100 normalized
  usedContext?: JSON;      // Transparency: what AI context was used
  teacherFeedback?: string;
  status: SubmissionStatus;// Core: Workflow state
  // Soft Delete
  isDeleted: boolean;
  deletedAt?: DateTime;
  deletedBy?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

#### Rubric (Grading Criteria)

```typescript
interface Rubric {
  id: string;              // @id, uuid
  userId: string;          // @relation → User (owner)
  teacherId?: string;      // @relation → User (teacher-specific)
  name: string;            // Core: Rubric name
  description: string;
  version: number;
  isActive: boolean;
  isTemplate: boolean;     // Reusable template flag
  criteria: JSON;          // Core: [{ id, name, description, maxScore, levels: [{ score, description }] }]
  createdAt: DateTime;
  updatedAt: DateTime;
  // @relation → GradingResult[], AssignmentArea[]
}
```

### AI Grading Domain

#### GradingSession (Batch Grading Container)

```typescript
interface GradingSession {
  id: string;              // @id, uuid
  userId: string;          // @relation → User
  status: GradingSessionStatus; // Core: Workflow state
  progress: number;        // 0-100
  createdAt: DateTime;
  updatedAt: DateTime;
  // @relation → GradingResult[]
}
```

#### GradingResult (Per-File Grading Output)

```typescript
interface GradingResult {
  id: string;              // @id, uuid
  gradingSessionId: string;// @relation → GradingSession
  uploadedFileId: string;  // @relation → UploadedFile
  rubricId: string;        // @relation → Rubric
  assignmentAreaId?: string;// @relation → AssignmentArea (context)
  status: GradingStatus;   // Core: Per-item state
  progress: number;        // 0-100
  // AI Output
  result?: JSON;           // Core: { totalScore, maxScore, breakdown: [{ criteriaId, score, feedback }], overallFeedback }
  errorMessage?: string;
  thinkingProcess?: string;
  gradingRationale?: string;
  usedContext?: JSON;      // Transparency metadata
  normalizedScore?: number;// Core: 0-100
  // Metrics
  gradingModel?: string;
  gradingTokens?: number;
  sparringTokens?: number; // Dialectical feedback tokens
  gradingDuration?: number;// ms
  // Agent Execution (AI SDK 6)
  agentSteps?: JSON;
  toolCalls?: JSON;
  confidenceScore?: number;// 0-1
  requiresReview: boolean; // Core: Human review flag
  reviewedBy?: string;
  reviewedAt?: DateTime;
  agentModel?: string;
  agentExecutionTime?: number;
  createdAt: DateTime;
  updatedAt: DateTime;
  completedAt?: DateTime;
  // @relation → AgentExecutionLog[]
}
```

#### UploadedFile (File Storage)

```typescript
interface UploadedFile {
  id: string;              // @id, uuid
  userId: string;          // @relation → User
  fileName: string;
  originalFileName: string;
  fileKey: string;         // @unique, S3 key
  fileSize: number;
  mimeType: string;
  parseStatus: FileParseStatus; // Core: Parsing state
  parsedContent?: string;  // Core: Extracted text for AI
  parsedContentTokens?: number;
  parseError?: string;
  isDeleted: boolean;
  deletedAt?: DateTime;
  expiresAt?: DateTime;    // Auto-cleanup
  createdAt: DateTime;
  updatedAt: DateTime;
  // @relation → GradingResult[]
}
```

#### AgentExecutionLog (Agent Step Tracking)

```typescript
interface AgentExecutionLog {
  id: string;              // @id, uuid
  gradingResultId: string; // @relation → GradingResult
  stepNumber: number;
  toolName?: string;       // null = pure reasoning
  toolInput?: JSON;
  toolOutput?: JSON;
  reasoning?: string;
  durationMs?: number;
  timestamp: DateTime;
}
```

### Enrollment & Access

#### Enrollment (Student-Class Link)

```typescript
interface Enrollment {
  id: string;              // @id, uuid
  studentId: string;       // @relation → User
  classId: string;         // @relation → Class
  enrolledAt: DateTime;
  finalGrade?: number;
  attendance?: JSON;
  // @@unique([studentId, classId])
}
```

#### InvitationCode (Course Access)

```typescript
interface InvitationCode {
  id: string;              // @id, uuid
  code: string;            // @unique
  courseId: string;        // @relation → Course
  classId?: string;        // @relation → Class
  expiresAt: DateTime;
  isUsed: boolean;
  usedAt?: DateTime;
  usedById?: string;       // @relation → User
  createdAt: DateTime;
}
```

### Chat & Notification

#### Chat (Rubric Chat)

```typescript
interface Chat {
  id: string;              // @id, uuid
  userId: string;          // @relation → User
  title?: string;
  context?: JSON;          // { courseId, assignmentId, type }
  createdAt: DateTime;
  updatedAt: DateTime;
  // @relation → Msg[]
}
```

#### Msg (Chat Message)

```typescript
interface Msg {
  id: string;              // @id, uuid
  chatId: string;          // @relation → Chat
  role: ChatRole;
  content: string;
  data?: JSON;             // Generated data, error info
  time: DateTime;
}
```

#### Notification

```typescript
interface Notification {
  id: string;              // @id, uuid
  type: NotificationType;
  userId: string;          // @relation → User
  courseId?: string;       // @relation → Course
  assignmentId?: string;   // @relation → AssignmentArea
  title: string;
  message: string;
  isRead: boolean;
  readAt?: DateTime;
  data?: JSON;
  createdAt: DateTime;
}
```

### Agent Chat (Analytics)

#### AgentChatSession

```typescript
interface AgentChatSession {
  id: string;              // @id, uuid
  userId: string;          // @relation → User
  title?: string;
  userRole: string;        // "TEACHER" | "STUDENT" | "ADMIN"
  modelProvider?: string;  // "gemini" | "local" | "auto"
  totalTokens: number;
  totalSteps: number;
  totalDuration: number;   // ms
  status: string;          // "ACTIVE" | "IDLE" | "ERROR"
  lastActivity: DateTime;
  isDeleted: boolean;
  deletedAt?: DateTime;
  deletedBy?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
  // @relation → AgentChatMessage[], AgentChatStepLog[]
}
```

#### AgentChatMessage

```typescript
interface AgentChatMessage {
  id: string;              // @id, uuid
  sessionId: string;       // @relation → AgentChatSession
  role: string;            // "user" | "assistant" | "system"
  content: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  timestamp: DateTime;
}
```

---

## Section 2: Route Capabilities (Intent Analysis)

### Public Routes

| Path | Intent |
|------|--------|
| `/` | Landing page / Dashboard home |
| `/join` | Course enrollment via invitation code |
| `/settings` | User preferences and settings management |
| `/health` | System health check endpoint |
| `/test-sse` | SSE (Server-Sent Events) testing utility |

### Authentication (`/auth/*`)

| Path | Intent |
|------|--------|
| `/auth/login` | User login entry point |
| `/auth/google` | Initiate Google OAuth flow |
| `/auth/google/callback` | Google OAuth callback handler |
| `/auth/logout` | User logout |
| `/auth/select-role` | New user role selection (STUDENT/TEACHER) |
| `/auth/unauthorized` | Unauthorized access error page |
| `/auth/test-login` | Development login bypass |

### Agent Playground (`/agent-playground/*`)

| Path | Intent |
|------|--------|
| `/agent-playground` | AI agent chat interface (index) |
| `/agent-playground/:sessionId` | Specific chat session view |

### Teacher Platform (`/teacher/*`)

| Path | Intent |
|------|--------|
| `/teacher` | Teacher dashboard |
| `/teacher/courses` | Course list management |
| `/teacher/courses/new` | Create new course |
| `/teacher/courses/:courseId` | Course detail view |
| `/teacher/courses/:courseId/edit` | Edit course |
| `/teacher/courses/:courseId/students` | Course student roster |
| `/teacher/courses/:courseId/classes/new` | Create new class/section |
| `/teacher/courses/:courseId/classes/:classId` | Class detail view |
| `/teacher/courses/:courseId/classes/:classId/students` | Class student roster |
| `/teacher/courses/:courseId/classes/:classId/edit` | Edit class |
| `/teacher/courses/:courseId/assignments/new` | Create assignment |
| `/teacher/courses/:courseId/assignments/:assignmentId/manage` | Manage assignment settings |
| `/teacher/courses/:courseId/assignments/:assignmentId/submissions` | View assignment submissions |
| `/teacher/submissions/:submissionId/view` | View specific submission |
| `/teacher/submissions/:submissionId/history` | Submission version history |
| `/teacher/submissions/compare` | Compare submission versions |
| `/teacher/rubrics` | Rubric library |
| `/teacher/rubrics/new` | Create rubric |
| `/teacher/rubrics/:rubricId` | View rubric detail |
| `/teacher/rubrics/:rubricId/edit` | Edit rubric |
| `/teacher/analytics` | Teaching analytics dashboard |
| `/teacher/agent-review` | AI grading review queue |

### Student Platform (`/student/*`)

| Path | Intent |
|------|--------|
| `/student` | Student dashboard |
| `/student/courses` | Enrolled courses list |
| `/student/courses/discover` | Discover available courses |
| `/student/courses/:courseId` | Course detail view |
| `/student/assignments` | All assignments list |
| `/student/assignments/:assignmentId/submit` | Assignment submission interface |
| `/student/submissions` | Submission history |
| `/student/submissions/:submissionId` | View submission detail |
| `/student/submissions/:submissionId/history` | Submission version history |
| `/student/submissions/compare` | Compare own submission versions |

### Admin Platform (`/admin/*`)

| Path | Intent |
|------|--------|
| `/admin` | Admin dashboard |
| `/admin/queues` | Background job queue monitoring |
| `/admin/users` | User management |
| `/admin/analytics` | System-wide analytics |

### API: Grading Engine

| Path | Intent |
|------|--------|
| `/api/grade-with-rubric` | Execute AI grading with rubric |
| `/api/grade-progress` | Polling endpoint for grading progress |
| `/api/grade/init` | Initialize grading session |
| `/api/grading/session` | Create/manage grading session |
| `/api/grading/session/:sessionId` | Get specific session status |
| `/api/grading/events/:sessionId` | SSE stream for grading events |
| `/api/grading/results` | Fetch grading results |
| `/api/grading/bridge` | WebSocket bridge for real-time grading updates |

### API: File Management

| Path | Intent |
|------|--------|
| `/api/upload` | File upload handler |
| `/api/upload/create-id` | Pre-generate upload ID |
| `/api/upload/delete-file` | Delete uploaded file |
| `/api/upload/progress` | Upload progress tracking |
| `/api/files` | List user files |
| `/api/files/user-files` | Get user's uploaded files |
| `/api/files/upload` | Alternative upload endpoint |
| `/api/files/batch` | Batch file operations |
| `/api/files/:fileId/reparse` | Re-trigger file parsing |
| `/api/files/:fileId/download` | Download file |
| `/api/reports/download` | Download grading report |

### API: Rubric Management

| Path | Intent |
|------|--------|
| `/api/rubrics` | CRUD operations for rubrics |

### API: AI Services

| Path | Intent |
|------|--------|
| `/api/ai/rubric-chat` | AI chat for rubric creation/editing |
| `/api/ai/generate-rubric` | Auto-generate rubric from description |
| `/api/agent-chat` | General AI agent chat endpoint |

### API: Chat Session Management

| Path | Intent |
|------|--------|
| `/api/chat-sessions/list` | List user's chat sessions |
| `/api/chat-sessions/:sessionId` | Get specific session |
| `/api/chat-sessions/:sessionId/update` | Update session metadata |
| `/api/chat-sessions/:sessionId/delete` | Delete session |
| `/api/chat` | Create new chat |
| `/api/chat/:id` | Get/update chat |
| `/api/chat/:id/messages-since` | Incremental message fetch |

### API: Assignments

| Path | Intent |
|------|--------|
| `/api/assignments` | List assignments |
| `/api/assignments/:assignmentId` | Get assignment detail |

### API: Teacher-Specific

| Path | Intent |
|------|--------|
| `/api/teacher/submissions/recent` | Recent submissions feed |
| `/api/teacher/submissions/:submissionId/history` | Submission version history |
| `/api/teacher/notifications` | Teacher notifications |
| `/api/teacher/notifications/mark-read` | Mark notifications read |

### API: Student-Specific

| Path | Intent |
|------|--------|
| `/api/student/submit` | Submit assignment |
| `/api/student/assignments` | Student's assignments |
| `/api/student/assignments/:assignmentId/draft` | Save/load draft |
| `/api/student/assignments/:assignmentId/sparring-response` | Dialectical feedback response |
| `/api/student/submissions/:submissionId/history` | Own submission history |

### API: Course & Enrollment

| Path | Intent |
|------|--------|
| `/api/courses/discover` | List discoverable courses |
| `/api/enrollments` | Manage enrollments |
| `/api/invitations/validate` | Validate invitation code |

### API: Notifications

| Path | Intent |
|------|--------|
| `/api/notifications/recent` | Get recent notifications |
| `/api/notifications/mark-read` | Mark notifications as read |

### API: Admin

| Path | Intent |
|------|--------|
| `/api/admin/queue-status` | Job queue status |
| `/api/admin/queue-jobs` | List queue jobs |
| `/api/admin/cleanup-preview` | Preview cleanup operation |
| `/api/admin/cleanup-jobs` | Execute cleanup |
| `/api/admin/users` | List users |
| `/api/admin/users/:userId` | User detail/management |
| `/api/admin/analytics/overview` | Analytics overview |
| `/api/admin/analytics/chat-sessions` | Chat session analytics |
| `/api/admin/analytics/grading-sessions` | Grading session analytics |
| `/api/admin/analytics/insights` | AI-generated insights |

### API: System

| Path | Intent |
|------|--------|
| `/api/auth/logout` | Logout API |
| `/api/auth/check` | Auth status check |
| `/api/version` | API version info |
| `/api/logs` | Research logging endpoint |
| `/api/messages/:id` | Message CRUD |
| `/api/submissions/compare` | Compare two submissions |
| `/api/submissions/:submissionId/delete` | Delete submission (teacher) |

---

## Section 3: WebSocket Server Architecture

### Overview

Standalone WebSocket server for real-time event delivery using Socket.IO.

### Configuration

```typescript
const CONFIG = {
  port: process.env.PORT || 3001,
  allowedOrigins: string[],  // CORS origins
  transports: ["websocket", "polling"],
  redisEnabled: boolean      // Multi-pod scaling via Redis adapter
};
```

### Key Components

| Component | Responsibility |
|-----------|----------------|
| `SocketServer` | Socket.IO server instance with CORS |
| `WebSocketEventHandler` | Custom event processing from Redis pub/sub |
| `setupSocketHandlers` | Socket connection lifecycle handlers |
| `@socket.io/redis-adapter` | Multi-instance sync via Redis |

### Endpoints

| Path | Method | Response |
|------|--------|----------|
| `/health` | GET | `{ status, service, timestamp, connections }` |

### Lifecycle

1. `setupRedisAdapter()` - Connect to Redis if configured
2. `eventHandler.start()` - Begin listening for events
3. `httpServer.listen()` - Start accepting connections
4. `io.on('connection')` - Setup per-socket handlers

### Graceful Shutdown

Handles `SIGTERM` and `SIGINT`:
1. Stop event handler
2. Close Socket.IO
3. Close HTTP server

### Scaling

Redis adapter enables horizontal scaling across multiple pods. Without Redis, operates in single-instance mode.

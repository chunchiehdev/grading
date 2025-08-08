
/**
 * Client
 */

import * as runtime from '@prisma/client/runtime/library'
import * as process from 'node:process'
import * as path from 'node:path'
    import { fileURLToPath } from 'node:url'

    const __dirname = path.dirname(fileURLToPath(import.meta.url))


export type PrismaPromise<T> = runtime.Types.Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = runtime.Types.Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Course
 * 
 */
export type Course = runtime.Types.Result.DefaultSelection<Prisma.$CoursePayload>
/**
 * Model AssignmentArea
 * 
 */
export type AssignmentArea = runtime.Types.Result.DefaultSelection<Prisma.$AssignmentAreaPayload>
/**
 * Model Submission
 * 
 */
export type Submission = runtime.Types.Result.DefaultSelection<Prisma.$SubmissionPayload>
/**
 * Model Rubric
 * 
 */
export type Rubric = runtime.Types.Result.DefaultSelection<Prisma.$RubricPayload>
/**
 * Model GradingSession
 * 
 */
export type GradingSession = runtime.Types.Result.DefaultSelection<Prisma.$GradingSessionPayload>
/**
 * Model UploadedFile
 * 
 */
export type UploadedFile = runtime.Types.Result.DefaultSelection<Prisma.$UploadedFilePayload>
/**
 * Model GradingResult
 * 
 */
export type GradingResult = runtime.Types.Result.DefaultSelection<Prisma.$GradingResultPayload>
/**
 * Model Enrollment
 * 
 */
export type Enrollment = runtime.Types.Result.DefaultSelection<Prisma.$EnrollmentPayload>
/**
 * Model InvitationCode
 * 
 */
export type InvitationCode = runtime.Types.Result.DefaultSelection<Prisma.$InvitationCodePayload>

/**
 * Enums
 */
export namespace $Enums {
  export const GradingSessionStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
} as const

export type GradingSessionStatus = (typeof GradingSessionStatus)[keyof typeof GradingSessionStatus]


export const GradingStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED'
} as const

export type GradingStatus = (typeof GradingStatus)[keyof typeof GradingStatus]


export const FileParseStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
} as const

export type FileParseStatus = (typeof FileParseStatus)[keyof typeof FileParseStatus]


export const UserRole = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER'
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]


export const SubmissionStatus = {
  SUBMITTED: 'SUBMITTED',
  ANALYZED: 'ANALYZED',
  GRADED: 'GRADED'
} as const

export type SubmissionStatus = (typeof SubmissionStatus)[keyof typeof SubmissionStatus]

}

export type GradingSessionStatus = $Enums.GradingSessionStatus

export const GradingSessionStatus = $Enums.GradingSessionStatus

export type GradingStatus = $Enums.GradingStatus

export const GradingStatus = $Enums.GradingStatus

export type FileParseStatus = $Enums.FileParseStatus

export const FileParseStatus = $Enums.FileParseStatus

export type UserRole = $Enums.UserRole

export const UserRole = $Enums.UserRole

export type SubmissionStatus = $Enums.SubmissionStatus

export const SubmissionStatus = $Enums.SubmissionStatus



/**
 * Create the Client
 */
const config: runtime.GetPrismaClientConfig = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client"
    },
    "output": {
      "value": "/home/chunc/workspace/grading/app/generated/prisma/client",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "debian-openssl-3.0.x",
        "native": true
      },
      {
        "fromEnvVar": null,
        "value": "linux-musl-openssl-3.0.x"
      }
    ],
    "previewFeatures": [],
    "sourceFilePath": "/home/chunc/workspace/grading/prisma/schema.prisma",
    "isCustomOutput": true
  },
  "relativePath": "../../../../prisma",
  "clientVersion": "6.6.0",
  "engineVersion": "f676762280b54cd07c770017ed3711ddde35f37a",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": "postgresql://grading_admin:password@localhost:5432/grading_db"
      }
    }
  },
  "inlineSchema": "generator client {\n  provider      = \"prisma-client\"\n  output        = \"../app/generated/prisma/client\"\n  binaryTargets = [\"native\", \"linux-musl-openssl-3.0.x\"]\n}\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\nmodel User {\n  id        String   @id @default(uuid())\n  email     String   @unique\n  role      UserRole @default(STUDENT) // New role field with default to STUDENT\n  name      String   @db.VarChar(255)\n  picture   String   @db.VarChar(500)\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  // Relations\n  rubrics         Rubric[]\n  gradingSessions GradingSession[]\n  uploadedFiles   UploadedFile[]\n\n  // Teacher-specific relations\n  courses        Course[]\n  teacherRubrics Rubric[] @relation(\"TeacherRubrics\")\n\n  // Student-specific relations\n  submissions     Submission[]\n  enrollments     Enrollment[]\n  usedInvitations InvitationCode[] @relation(\"InvitationCodeUsage\")\n\n  @@map(\"users\")\n}\n\n// Course management for teachers\nmodel Course {\n  id          String  @id @default(uuid())\n  name        String  @db.VarChar(255)\n  description String? @db.Text\n  teacherId   String\n  teacher     User    @relation(fields: [teacherId], references: [id], onDelete: Cascade)\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  // Relations\n  assignmentAreas AssignmentArea[]\n  enrollments     Enrollment[]\n  invitationCodes InvitationCode[]\n\n  @@index([teacherId])\n  @@map(\"courses\")\n}\n\n// Assignment areas within courses\nmodel AssignmentArea {\n  id          String    @id @default(uuid())\n  name        String    @db.VarChar(255)\n  description String?   @db.Text\n  courseId    String\n  course      Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)\n  rubricId    String\n  rubric      Rubric    @relation(\"AssignmentAreaRubrics\", fields: [rubricId], references: [id], onDelete: Restrict)\n  dueDate     DateTime?\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  // Relations\n  submissions Submission[]\n\n  @@index([courseId])\n  @@index([rubricId])\n  @@map(\"assignment_areas\")\n}\n\n// Student submissions to assignment areas\nmodel Submission {\n  id               String         @id @default(uuid())\n  studentId        String\n  student          User           @relation(fields: [studentId], references: [id], onDelete: Cascade)\n  assignmentAreaId String\n  assignmentArea   AssignmentArea @relation(fields: [assignmentAreaId], references: [id], onDelete: Cascade)\n\n  filePath   String   @db.VarChar(500) // Path/URL of uploaded assignment\n  uploadedAt DateTime @default(now())\n\n  // AI analysis and grading\n  aiAnalysisResult Json? // AI analysis results\n  finalScore       Int? // Final score\n  teacherFeedback  String?          @db.Text\n  status           SubmissionStatus @default(SUBMITTED)\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([studentId])\n  @@index([assignmentAreaId])\n  @@index([status])\n  @@map(\"submissions\")\n}\n\n// 評分標準表\nmodel Rubric {\n  id        String  @id @default(uuid())\n  userId    String\n  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)\n  teacherId String? // New field for teacher-created rubrics\n  teacher   User?   @relation(\"TeacherRubrics\", fields: [teacherId], references: [id], onDelete: Cascade)\n\n  name        String  @db.VarChar(255)\n  description String  @db.Text\n  version     Int     @default(1) // 版本號\n  isActive    Boolean @default(true) // 是否為當前版本\n  isTemplate  Boolean @default(false) // Whether it's a reusable template\n\n  // 評分標準結構 (JSON)\n  criteria Json // [{ id, name, description, maxScore, levels: [{ score, description }] }]\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  // Relations\n  gradingResults  GradingResult[]\n  assignmentAreas AssignmentArea[] @relation(\"AssignmentAreaRubrics\")\n\n  @@index([userId, isActive])\n  @@index([teacherId, isTemplate])\n  @@map(\"rubrics\")\n}\n\n// 評分對話 - 一次評分請求可包含多個檔案\nmodel GradingSession {\n  id     String @id @default(uuid())\n  userId String\n  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  status   GradingSessionStatus @default(PENDING)\n  progress Int                  @default(0) // 整體進度 0-100\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  // Relations\n  gradingResults GradingResult[]\n\n  @@index([userId, status])\n  @@map(\"grading_sessions\")\n}\n\n// 上傳的檔案記錄\nmodel UploadedFile {\n  id     String @id @default(uuid())\n  userId String\n  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  fileName         String @db.VarChar(500)\n  originalFileName String @db.VarChar(500)\n  fileKey          String @unique // S3 key\n  fileSize         Int\n  mimeType         String @db.VarChar(100)\n\n  // 檔案處理狀態\n  parseStatus   FileParseStatus @default(PENDING)\n  parsedContent String?         @db.Text // 解析後的文字內容\n  parseError    String? // 解析錯誤訊息\n\n  // 軟刪除標記\n  isDeleted Boolean   @default(false)\n  deletedAt DateTime? // 刪除時間\n\n  createdAt DateTime  @default(now())\n  updatedAt DateTime  @updatedAt\n  expiresAt DateTime? // 檔案過期時間，用於自動清理\n\n  // Relations\n  gradingResults GradingResult[]\n\n  @@index([userId, parseStatus])\n  @@index([userId, isDeleted]) // 用於過濾已刪除檔案\n  @@index([expiresAt]) // 用於清理過期檔案\n  @@map(\"uploaded_files\")\n}\n\n// 評分結果 - 每個檔案對應一個評分標準的結果\nmodel GradingResult {\n  id               String         @id @default(uuid())\n  gradingSessionId String\n  gradingSession   GradingSession @relation(fields: [gradingSessionId], references: [id], onDelete: Cascade)\n\n  uploadedFileId String\n  uploadedFile   UploadedFile @relation(fields: [uploadedFileId], references: [id], onDelete: Cascade)\n\n  rubricId String\n  rubric   Rubric @relation(fields: [rubricId], references: [id], onDelete: Restrict)\n\n  // 評分狀態和結果\n  status   GradingStatus @default(PENDING)\n  progress Int           @default(0) // 此項評分進度 0-100\n\n  // LLM評分結果 (JSON結構)\n  result       Json? // { totalScore, maxScore, breakdown: [{ criteriaId, score, feedback }], overallFeedback }\n  errorMessage String? // 評分失敗時的錯誤訊息\n\n  // 評分原始數據\n  gradingModel    String? @db.VarChar(100) // 使用的模型名稱\n  gradingTokens   Int? // 消耗的tokens數量\n  gradingDuration Int? // 評分耗時(毫秒)\n\n  createdAt   DateTime  @default(now())\n  updatedAt   DateTime  @updatedAt\n  completedAt DateTime? // 評分完成時間\n\n  @@index([gradingSessionId, status])\n  @@index([uploadedFileId])\n  @@index([rubricId])\n  @@map(\"grading_results\")\n}\n\n// 評分會話狀態\nenum GradingSessionStatus {\n  PENDING // 等待開始\n  PROCESSING // 評分中\n  COMPLETED // 全部完成\n  FAILED // 失敗\n  CANCELLED // 已取消\n}\n\n// 單項評分狀態\nenum GradingStatus {\n  PENDING // 等待評分\n  PROCESSING // 評分中\n  COMPLETED // 評分完成\n  FAILED // 評分失敗\n  SKIPPED // 跳過(檔案解析失敗等)\n}\n\n// 檔案解析狀態\nenum FileParseStatus {\n  PENDING // 等待解析\n  PROCESSING // 解析中\n  COMPLETED // 解析完成\n  FAILED // 解析失敗\n}\n\n// User roles\nenum UserRole {\n  STUDENT\n  TEACHER\n}\n\n// Submission status\nenum SubmissionStatus {\n  SUBMITTED // Just submitted\n  ANALYZED // AI analysis complete\n  GRADED // Teacher has provided feedback/grade\n}\n\n// Course enrollment for students\nmodel Enrollment {\n  id         String   @id @default(uuid())\n  studentId  String\n  student    User     @relation(fields: [studentId], references: [id], onDelete: Cascade)\n  courseId   String\n  course     Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)\n  enrolledAt DateTime @default(now())\n\n  @@unique([studentId, courseId])\n  @@index([studentId])\n  @@index([courseId])\n  @@map(\"enrollments\")\n}\n\n// Course invitation codes\nmodel InvitationCode {\n  id        String    @id @default(uuid())\n  code      String    @unique @db.VarChar(50)\n  courseId  String\n  course    Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)\n  createdAt DateTime  @default(now())\n  expiresAt DateTime\n  isUsed    Boolean   @default(false)\n  usedAt    DateTime?\n  usedById  String?\n  usedBy    User?     @relation(\"InvitationCodeUsage\", fields: [usedById], references: [id])\n\n  @@index([code])\n  @@index([courseId])\n  @@index([expiresAt])\n  @@map(\"invitation_codes\")\n}\n",
  "inlineSchemaHash": "671ed6af31986e4bf921e6b899cf72c3485cf55e4281383fa7c5769ced52cf41",
  "copyEngine": true,
  "runtimeDataModel": {
    "models": {},
    "enums": {},
    "types": {}
  },
  "dirname": ""
}
config.dirname = __dirname

config.runtimeDataModel = JSON.parse("{\"models\":{\"User\":{\"dbName\":\"users\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"email\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"role\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"UserRole\",\"nativeType\":null,\"default\":\"STUDENT\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"255\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"picture\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"500\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"rubrics\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Rubric\",\"nativeType\":null,\"relationName\":\"RubricToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"gradingSessions\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"GradingSession\",\"nativeType\":null,\"relationName\":\"GradingSessionToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"uploadedFiles\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"UploadedFile\",\"nativeType\":null,\"relationName\":\"UploadedFileToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"courses\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Course\",\"nativeType\":null,\"relationName\":\"CourseToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"teacherRubrics\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Rubric\",\"nativeType\":null,\"relationName\":\"TeacherRubrics\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"submissions\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Submission\",\"nativeType\":null,\"relationName\":\"SubmissionToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"enrollments\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Enrollment\",\"nativeType\":null,\"relationName\":\"EnrollmentToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"usedInvitations\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"InvitationCode\",\"nativeType\":null,\"relationName\":\"InvitationCodeUsage\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Course\":{\"dbName\":\"courses\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"255\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"Text\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"teacherId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"teacher\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"nativeType\":null,\"relationName\":\"CourseToUser\",\"relationFromFields\":[\"teacherId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"assignmentAreas\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"AssignmentArea\",\"nativeType\":null,\"relationName\":\"AssignmentAreaToCourse\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"enrollments\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Enrollment\",\"nativeType\":null,\"relationName\":\"CourseToEnrollment\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"invitationCodes\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"InvitationCode\",\"nativeType\":null,\"relationName\":\"CourseToInvitationCode\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"AssignmentArea\":{\"dbName\":\"assignment_areas\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"255\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"Text\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"courseId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"course\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Course\",\"nativeType\":null,\"relationName\":\"AssignmentAreaToCourse\",\"relationFromFields\":[\"courseId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rubricId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rubric\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Rubric\",\"nativeType\":null,\"relationName\":\"AssignmentAreaRubrics\",\"relationFromFields\":[\"rubricId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Restrict\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"dueDate\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"submissions\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Submission\",\"nativeType\":null,\"relationName\":\"AssignmentAreaToSubmission\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Submission\":{\"dbName\":\"submissions\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"studentId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"student\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"nativeType\":null,\"relationName\":\"SubmissionToUser\",\"relationFromFields\":[\"studentId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"assignmentAreaId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"assignmentArea\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"AssignmentArea\",\"nativeType\":null,\"relationName\":\"AssignmentAreaToSubmission\",\"relationFromFields\":[\"assignmentAreaId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"filePath\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"500\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"uploadedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"aiAnalysisResult\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"finalScore\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"teacherFeedback\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"Text\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"SubmissionStatus\",\"nativeType\":null,\"default\":\"SUBMITTED\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Rubric\":{\"dbName\":\"rubrics\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"userId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"user\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"nativeType\":null,\"relationName\":\"RubricToUser\",\"relationFromFields\":[\"userId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"teacherId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"teacher\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"nativeType\":null,\"relationName\":\"TeacherRubrics\",\"relationFromFields\":[\"teacherId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"255\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"Text\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"version\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":1,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isActive\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"nativeType\":null,\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isTemplate\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"nativeType\":null,\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"criteria\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"gradingResults\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"GradingResult\",\"nativeType\":null,\"relationName\":\"GradingResultToRubric\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"assignmentAreas\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"AssignmentArea\",\"nativeType\":null,\"relationName\":\"AssignmentAreaRubrics\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"GradingSession\":{\"dbName\":\"grading_sessions\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"userId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"user\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"nativeType\":null,\"relationName\":\"GradingSessionToUser\",\"relationFromFields\":[\"userId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"GradingSessionStatus\",\"nativeType\":null,\"default\":\"PENDING\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"progress\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"gradingResults\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"GradingResult\",\"nativeType\":null,\"relationName\":\"GradingResultToGradingSession\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"UploadedFile\":{\"dbName\":\"uploaded_files\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"userId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"user\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"nativeType\":null,\"relationName\":\"UploadedFileToUser\",\"relationFromFields\":[\"userId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fileName\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"500\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"originalFileName\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"500\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fileKey\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fileSize\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"mimeType\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"100\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"parseStatus\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"FileParseStatus\",\"nativeType\":null,\"default\":\"PENDING\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"parsedContent\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"Text\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"parseError\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDeleted\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"nativeType\":null,\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"deletedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"expiresAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"gradingResults\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"GradingResult\",\"nativeType\":null,\"relationName\":\"GradingResultToUploadedFile\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"GradingResult\":{\"dbName\":\"grading_results\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"gradingSessionId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"gradingSession\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"GradingSession\",\"nativeType\":null,\"relationName\":\"GradingResultToGradingSession\",\"relationFromFields\":[\"gradingSessionId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"uploadedFileId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"uploadedFile\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"UploadedFile\",\"nativeType\":null,\"relationName\":\"GradingResultToUploadedFile\",\"relationFromFields\":[\"uploadedFileId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rubricId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rubric\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Rubric\",\"nativeType\":null,\"relationName\":\"GradingResultToRubric\",\"relationFromFields\":[\"rubricId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Restrict\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"GradingStatus\",\"nativeType\":null,\"default\":\"PENDING\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"progress\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"result\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"errorMessage\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"gradingModel\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"100\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"gradingTokens\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"gradingDuration\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"completedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Enrollment\":{\"dbName\":\"enrollments\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"studentId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"student\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"nativeType\":null,\"relationName\":\"EnrollmentToUser\",\"relationFromFields\":[\"studentId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"courseId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"course\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Course\",\"nativeType\":null,\"relationName\":\"CourseToEnrollment\",\"relationFromFields\":[\"courseId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"enrolledAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"studentId\",\"courseId\"]],\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"studentId\",\"courseId\"]}],\"isGenerated\":false},\"InvitationCode\":{\"dbName\":\"invitation_codes\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"code\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"50\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"courseId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"course\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Course\",\"nativeType\":null,\"relationName\":\"CourseToInvitationCode\",\"relationFromFields\":[\"courseId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"expiresAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isUsed\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"nativeType\":null,\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"usedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"usedById\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"usedBy\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"nativeType\":null,\"relationName\":\"InvitationCodeUsage\",\"relationFromFields\":[\"usedById\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false}},\"enums\":{\"GradingSessionStatus\":{\"values\":[{\"name\":\"PENDING\",\"dbName\":null},{\"name\":\"PROCESSING\",\"dbName\":null},{\"name\":\"COMPLETED\",\"dbName\":null},{\"name\":\"FAILED\",\"dbName\":null},{\"name\":\"CANCELLED\",\"dbName\":null}],\"dbName\":null},\"GradingStatus\":{\"values\":[{\"name\":\"PENDING\",\"dbName\":null},{\"name\":\"PROCESSING\",\"dbName\":null},{\"name\":\"COMPLETED\",\"dbName\":null},{\"name\":\"FAILED\",\"dbName\":null},{\"name\":\"SKIPPED\",\"dbName\":null}],\"dbName\":null},\"FileParseStatus\":{\"values\":[{\"name\":\"PENDING\",\"dbName\":null},{\"name\":\"PROCESSING\",\"dbName\":null},{\"name\":\"COMPLETED\",\"dbName\":null},{\"name\":\"FAILED\",\"dbName\":null}],\"dbName\":null},\"UserRole\":{\"values\":[{\"name\":\"STUDENT\",\"dbName\":null},{\"name\":\"TEACHER\",\"dbName\":null}],\"dbName\":null},\"SubmissionStatus\":{\"values\":[{\"name\":\"SUBMITTED\",\"dbName\":null},{\"name\":\"ANALYZED\",\"dbName\":null},{\"name\":\"GRADED\",\"dbName\":null}],\"dbName\":null}},\"types\":{}}")
config.engineWasm = undefined
config.compilerWasm = undefined



// file annotations for bundling tools to include these files
path.join(__dirname, "libquery_engine-debian-openssl-3.0.x.so.node")
path.join(process.cwd(), "app/generated/prisma/client/libquery_engine-debian-openssl-3.0.x.so.node")

// file annotations for bundling tools to include these files
path.join(__dirname, "libquery_engine-linux-musl-openssl-3.0.x.so.node")
path.join(process.cwd(), "app/generated/prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node")
// file annotations for bundling tools to include these files
path.join(__dirname, "schema.prisma")
path.join(process.cwd(), "app/generated/prisma/client/schema.prisma")


interface PrismaClientConstructor {
    /**
   * ## Prisma Client
   *
   * Type-safe database client for TypeScript
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */
  new <
    ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
    U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
    ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs
  >(options?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>): PrismaClient<ClientOptions, U, ExtArgs>
}

/**
 * ## Prisma Client
 *
 * Type-safe database client for TypeScript
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export interface PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): runtime.Types.Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): runtime.Types.Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): runtime.Types.Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => runtime.Types.Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): runtime.Types.Utils.JsPromise<R>


  $extends: runtime.Types.Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, runtime.Types.Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.course`: Exposes CRUD operations for the **Course** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Courses
    * const courses = await prisma.course.findMany()
    * ```
    */
  get course(): Prisma.CourseDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.assignmentArea`: Exposes CRUD operations for the **AssignmentArea** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AssignmentAreas
    * const assignmentAreas = await prisma.assignmentArea.findMany()
    * ```
    */
  get assignmentArea(): Prisma.AssignmentAreaDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.submission`: Exposes CRUD operations for the **Submission** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Submissions
    * const submissions = await prisma.submission.findMany()
    * ```
    */
  get submission(): Prisma.SubmissionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.rubric`: Exposes CRUD operations for the **Rubric** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Rubrics
    * const rubrics = await prisma.rubric.findMany()
    * ```
    */
  get rubric(): Prisma.RubricDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.gradingSession`: Exposes CRUD operations for the **GradingSession** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more GradingSessions
    * const gradingSessions = await prisma.gradingSession.findMany()
    * ```
    */
  get gradingSession(): Prisma.GradingSessionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.uploadedFile`: Exposes CRUD operations for the **UploadedFile** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more UploadedFiles
    * const uploadedFiles = await prisma.uploadedFile.findMany()
    * ```
    */
  get uploadedFile(): Prisma.UploadedFileDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.gradingResult`: Exposes CRUD operations for the **GradingResult** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more GradingResults
    * const gradingResults = await prisma.gradingResult.findMany()
    * ```
    */
  get gradingResult(): Prisma.GradingResultDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.enrollment`: Exposes CRUD operations for the **Enrollment** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Enrollments
    * const enrollments = await prisma.enrollment.findMany()
    * ```
    */
  get enrollment(): Prisma.EnrollmentDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.invitationCode`: Exposes CRUD operations for the **InvitationCode** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more InvitationCodes
    * const invitationCodes = await prisma.invitationCode.findMany()
    * ```
    */
  get invitationCode(): Prisma.InvitationCodeDelegate<ExtArgs, ClientOptions>;
}

export const PrismaClient = runtime.getPrismaClient(config) as unknown as PrismaClientConstructor

export namespace Prisma {
  export type DMMF = typeof runtime.DMMF

  export type PrismaPromise<T> = runtime.Types.Public.PrismaPromise<T>

  /**
   * Validator
   */
  export const validator = runtime.Public.validator

  /**
   * Prisma Errors
   */

  export const PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export type PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError

  export const PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export type PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError

  export const PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export type PrismaClientRustPanicError = runtime.PrismaClientRustPanicError

  export const PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export type PrismaClientInitializationError = runtime.PrismaClientInitializationError

  export const PrismaClientValidationError = runtime.PrismaClientValidationError
  export type PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export const sql = runtime.sqltag
  export const empty = runtime.empty
  export const join = runtime.join
  export const raw = runtime.raw
  export const Sql = runtime.Sql
  export type Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export const Decimal = runtime.Decimal
  export type Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export type Extension = runtime.Types.Extensions.UserArgs
  export const getExtensionContext = runtime.Extensions.getExtensionContext
  export type Args<T, F extends runtime.Operation> = runtime.Types.Public.Args<T, F>
  export type Payload<T, F extends runtime.Operation = never> = runtime.Types.Public.Payload<T, F>
  export type Result<T, A, F extends runtime.Operation> = runtime.Types.Public.Result<T, A, F>
  export type Exact<A, W> = runtime.Types.Public.Exact<A, W>

  export type PrismaVersion = {
    client: string
    engine: string
  }

  /**
   * Prisma Client JS version: 6.6.0
   * Query Engine version: f676762280b54cd07c770017ed3711ddde35f37a
   */
  export const prismaVersion: PrismaVersion = {
    client: "6.6.0",
    engine: "f676762280b54cd07c770017ed3711ddde35f37a"
  }

  /**
   * Utility Types
   */


  export type JsonObject = runtime.JsonObject
  export type JsonArray = runtime.JsonArray
  export type JsonValue = runtime.JsonValue
  export type InputJsonObject = runtime.InputJsonObject
  export type InputJsonArray = runtime.InputJsonArray
  export type InputJsonValue = runtime.InputJsonValue

  export const NullTypes = {
    DbNull: runtime.objectEnumValues.classes.DbNull as (new (secret: never) => typeof runtime.objectEnumValues.instances.DbNull),
    JsonNull: runtime.objectEnumValues.classes.JsonNull as (new (secret: never) => typeof runtime.objectEnumValues.instances.JsonNull),
    AnyNull: runtime.objectEnumValues.classes.AnyNull as (new (secret: never) => typeof runtime.objectEnumValues.instances.AnyNull),
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull = runtime.objectEnumValues.instances.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull = runtime.objectEnumValues.instances.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull = runtime.objectEnumValues.instances.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };

  export type Enumerable<T> = T | Array<T>;

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  export type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  export type Boolean = True | False

  export type True = 1

  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName = {
    User: 'User',
    Course: 'Course',
    AssignmentArea: 'AssignmentArea',
    Submission: 'Submission',
    Rubric: 'Rubric',
    GradingSession: 'GradingSession',
    UploadedFile: 'UploadedFile',
    GradingResult: 'GradingResult',
    Enrollment: 'Enrollment',
    InvitationCode: 'InvitationCode'
  } as const

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  export interface TypeMapCb<ClientOptions = {}> extends runtime.Types.Utils.Fn<{extArgs: runtime.Types.Extensions.InternalArgs }, runtime.Types.Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "course" | "assignmentArea" | "submission" | "rubric" | "gradingSession" | "uploadedFile" | "gradingResult" | "enrollment" | "invitationCode"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Course: {
        payload: Prisma.$CoursePayload<ExtArgs>
        fields: Prisma.CourseFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CourseFindUniqueArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$CoursePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CourseFindUniqueOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$CoursePayload>
          }
          findFirst: {
            args: Prisma.CourseFindFirstArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$CoursePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CourseFindFirstOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$CoursePayload>
          }
          findMany: {
            args: Prisma.CourseFindManyArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$CoursePayload>[]
          }
          create: {
            args: Prisma.CourseCreateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$CoursePayload>
          }
          createMany: {
            args: Prisma.CourseCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CourseCreateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$CoursePayload>[]
          }
          delete: {
            args: Prisma.CourseDeleteArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$CoursePayload>
          }
          update: {
            args: Prisma.CourseUpdateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$CoursePayload>
          }
          deleteMany: {
            args: Prisma.CourseDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CourseUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CourseUpdateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$CoursePayload>[]
          }
          upsert: {
            args: Prisma.CourseUpsertArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$CoursePayload>
          }
          aggregate: {
            args: Prisma.CourseAggregateArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<AggregateCourse>
          }
          groupBy: {
            args: Prisma.CourseGroupByArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<CourseGroupByOutputType>[]
          }
          count: {
            args: Prisma.CourseCountArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<CourseCountAggregateOutputType> | number
          }
        }
      }
      AssignmentArea: {
        payload: Prisma.$AssignmentAreaPayload<ExtArgs>
        fields: Prisma.AssignmentAreaFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AssignmentAreaFindUniqueArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$AssignmentAreaPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AssignmentAreaFindUniqueOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$AssignmentAreaPayload>
          }
          findFirst: {
            args: Prisma.AssignmentAreaFindFirstArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$AssignmentAreaPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AssignmentAreaFindFirstOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$AssignmentAreaPayload>
          }
          findMany: {
            args: Prisma.AssignmentAreaFindManyArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$AssignmentAreaPayload>[]
          }
          create: {
            args: Prisma.AssignmentAreaCreateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$AssignmentAreaPayload>
          }
          createMany: {
            args: Prisma.AssignmentAreaCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AssignmentAreaCreateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$AssignmentAreaPayload>[]
          }
          delete: {
            args: Prisma.AssignmentAreaDeleteArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$AssignmentAreaPayload>
          }
          update: {
            args: Prisma.AssignmentAreaUpdateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$AssignmentAreaPayload>
          }
          deleteMany: {
            args: Prisma.AssignmentAreaDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AssignmentAreaUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AssignmentAreaUpdateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$AssignmentAreaPayload>[]
          }
          upsert: {
            args: Prisma.AssignmentAreaUpsertArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$AssignmentAreaPayload>
          }
          aggregate: {
            args: Prisma.AssignmentAreaAggregateArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<AggregateAssignmentArea>
          }
          groupBy: {
            args: Prisma.AssignmentAreaGroupByArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<AssignmentAreaGroupByOutputType>[]
          }
          count: {
            args: Prisma.AssignmentAreaCountArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<AssignmentAreaCountAggregateOutputType> | number
          }
        }
      }
      Submission: {
        payload: Prisma.$SubmissionPayload<ExtArgs>
        fields: Prisma.SubmissionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SubmissionFindUniqueArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$SubmissionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SubmissionFindUniqueOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          findFirst: {
            args: Prisma.SubmissionFindFirstArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$SubmissionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SubmissionFindFirstOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          findMany: {
            args: Prisma.SubmissionFindManyArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$SubmissionPayload>[]
          }
          create: {
            args: Prisma.SubmissionCreateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          createMany: {
            args: Prisma.SubmissionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SubmissionCreateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$SubmissionPayload>[]
          }
          delete: {
            args: Prisma.SubmissionDeleteArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          update: {
            args: Prisma.SubmissionUpdateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          deleteMany: {
            args: Prisma.SubmissionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SubmissionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SubmissionUpdateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$SubmissionPayload>[]
          }
          upsert: {
            args: Prisma.SubmissionUpsertArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          aggregate: {
            args: Prisma.SubmissionAggregateArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<AggregateSubmission>
          }
          groupBy: {
            args: Prisma.SubmissionGroupByArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<SubmissionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SubmissionCountArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<SubmissionCountAggregateOutputType> | number
          }
        }
      }
      Rubric: {
        payload: Prisma.$RubricPayload<ExtArgs>
        fields: Prisma.RubricFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RubricFindUniqueArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RubricFindUniqueOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>
          }
          findFirst: {
            args: Prisma.RubricFindFirstArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RubricFindFirstOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>
          }
          findMany: {
            args: Prisma.RubricFindManyArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>[]
          }
          create: {
            args: Prisma.RubricCreateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>
          }
          createMany: {
            args: Prisma.RubricCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RubricCreateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>[]
          }
          delete: {
            args: Prisma.RubricDeleteArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>
          }
          update: {
            args: Prisma.RubricUpdateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>
          }
          deleteMany: {
            args: Prisma.RubricDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RubricUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.RubricUpdateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>[]
          }
          upsert: {
            args: Prisma.RubricUpsertArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$RubricPayload>
          }
          aggregate: {
            args: Prisma.RubricAggregateArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<AggregateRubric>
          }
          groupBy: {
            args: Prisma.RubricGroupByArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<RubricGroupByOutputType>[]
          }
          count: {
            args: Prisma.RubricCountArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<RubricCountAggregateOutputType> | number
          }
        }
      }
      GradingSession: {
        payload: Prisma.$GradingSessionPayload<ExtArgs>
        fields: Prisma.GradingSessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.GradingSessionFindUniqueArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingSessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.GradingSessionFindUniqueOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingSessionPayload>
          }
          findFirst: {
            args: Prisma.GradingSessionFindFirstArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingSessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.GradingSessionFindFirstOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingSessionPayload>
          }
          findMany: {
            args: Prisma.GradingSessionFindManyArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingSessionPayload>[]
          }
          create: {
            args: Prisma.GradingSessionCreateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingSessionPayload>
          }
          createMany: {
            args: Prisma.GradingSessionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.GradingSessionCreateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingSessionPayload>[]
          }
          delete: {
            args: Prisma.GradingSessionDeleteArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingSessionPayload>
          }
          update: {
            args: Prisma.GradingSessionUpdateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingSessionPayload>
          }
          deleteMany: {
            args: Prisma.GradingSessionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.GradingSessionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.GradingSessionUpdateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingSessionPayload>[]
          }
          upsert: {
            args: Prisma.GradingSessionUpsertArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingSessionPayload>
          }
          aggregate: {
            args: Prisma.GradingSessionAggregateArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<AggregateGradingSession>
          }
          groupBy: {
            args: Prisma.GradingSessionGroupByArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<GradingSessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.GradingSessionCountArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<GradingSessionCountAggregateOutputType> | number
          }
        }
      }
      UploadedFile: {
        payload: Prisma.$UploadedFilePayload<ExtArgs>
        fields: Prisma.UploadedFileFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UploadedFileFindUniqueArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadedFilePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UploadedFileFindUniqueOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadedFilePayload>
          }
          findFirst: {
            args: Prisma.UploadedFileFindFirstArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadedFilePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UploadedFileFindFirstOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadedFilePayload>
          }
          findMany: {
            args: Prisma.UploadedFileFindManyArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadedFilePayload>[]
          }
          create: {
            args: Prisma.UploadedFileCreateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadedFilePayload>
          }
          createMany: {
            args: Prisma.UploadedFileCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UploadedFileCreateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadedFilePayload>[]
          }
          delete: {
            args: Prisma.UploadedFileDeleteArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadedFilePayload>
          }
          update: {
            args: Prisma.UploadedFileUpdateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadedFilePayload>
          }
          deleteMany: {
            args: Prisma.UploadedFileDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UploadedFileUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UploadedFileUpdateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadedFilePayload>[]
          }
          upsert: {
            args: Prisma.UploadedFileUpsertArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$UploadedFilePayload>
          }
          aggregate: {
            args: Prisma.UploadedFileAggregateArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<AggregateUploadedFile>
          }
          groupBy: {
            args: Prisma.UploadedFileGroupByArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<UploadedFileGroupByOutputType>[]
          }
          count: {
            args: Prisma.UploadedFileCountArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<UploadedFileCountAggregateOutputType> | number
          }
        }
      }
      GradingResult: {
        payload: Prisma.$GradingResultPayload<ExtArgs>
        fields: Prisma.GradingResultFieldRefs
        operations: {
          findUnique: {
            args: Prisma.GradingResultFindUniqueArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingResultPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.GradingResultFindUniqueOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingResultPayload>
          }
          findFirst: {
            args: Prisma.GradingResultFindFirstArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingResultPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.GradingResultFindFirstOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingResultPayload>
          }
          findMany: {
            args: Prisma.GradingResultFindManyArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingResultPayload>[]
          }
          create: {
            args: Prisma.GradingResultCreateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingResultPayload>
          }
          createMany: {
            args: Prisma.GradingResultCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.GradingResultCreateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingResultPayload>[]
          }
          delete: {
            args: Prisma.GradingResultDeleteArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingResultPayload>
          }
          update: {
            args: Prisma.GradingResultUpdateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingResultPayload>
          }
          deleteMany: {
            args: Prisma.GradingResultDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.GradingResultUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.GradingResultUpdateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingResultPayload>[]
          }
          upsert: {
            args: Prisma.GradingResultUpsertArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$GradingResultPayload>
          }
          aggregate: {
            args: Prisma.GradingResultAggregateArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<AggregateGradingResult>
          }
          groupBy: {
            args: Prisma.GradingResultGroupByArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<GradingResultGroupByOutputType>[]
          }
          count: {
            args: Prisma.GradingResultCountArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<GradingResultCountAggregateOutputType> | number
          }
        }
      }
      Enrollment: {
        payload: Prisma.$EnrollmentPayload<ExtArgs>
        fields: Prisma.EnrollmentFieldRefs
        operations: {
          findUnique: {
            args: Prisma.EnrollmentFindUniqueArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$EnrollmentPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.EnrollmentFindUniqueOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$EnrollmentPayload>
          }
          findFirst: {
            args: Prisma.EnrollmentFindFirstArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$EnrollmentPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.EnrollmentFindFirstOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$EnrollmentPayload>
          }
          findMany: {
            args: Prisma.EnrollmentFindManyArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$EnrollmentPayload>[]
          }
          create: {
            args: Prisma.EnrollmentCreateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$EnrollmentPayload>
          }
          createMany: {
            args: Prisma.EnrollmentCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.EnrollmentCreateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$EnrollmentPayload>[]
          }
          delete: {
            args: Prisma.EnrollmentDeleteArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$EnrollmentPayload>
          }
          update: {
            args: Prisma.EnrollmentUpdateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$EnrollmentPayload>
          }
          deleteMany: {
            args: Prisma.EnrollmentDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.EnrollmentUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.EnrollmentUpdateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$EnrollmentPayload>[]
          }
          upsert: {
            args: Prisma.EnrollmentUpsertArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$EnrollmentPayload>
          }
          aggregate: {
            args: Prisma.EnrollmentAggregateArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<AggregateEnrollment>
          }
          groupBy: {
            args: Prisma.EnrollmentGroupByArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<EnrollmentGroupByOutputType>[]
          }
          count: {
            args: Prisma.EnrollmentCountArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<EnrollmentCountAggregateOutputType> | number
          }
        }
      }
      InvitationCode: {
        payload: Prisma.$InvitationCodePayload<ExtArgs>
        fields: Prisma.InvitationCodeFieldRefs
        operations: {
          findUnique: {
            args: Prisma.InvitationCodeFindUniqueArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$InvitationCodePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.InvitationCodeFindUniqueOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$InvitationCodePayload>
          }
          findFirst: {
            args: Prisma.InvitationCodeFindFirstArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$InvitationCodePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.InvitationCodeFindFirstOrThrowArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$InvitationCodePayload>
          }
          findMany: {
            args: Prisma.InvitationCodeFindManyArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$InvitationCodePayload>[]
          }
          create: {
            args: Prisma.InvitationCodeCreateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$InvitationCodePayload>
          }
          createMany: {
            args: Prisma.InvitationCodeCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.InvitationCodeCreateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$InvitationCodePayload>[]
          }
          delete: {
            args: Prisma.InvitationCodeDeleteArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$InvitationCodePayload>
          }
          update: {
            args: Prisma.InvitationCodeUpdateArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$InvitationCodePayload>
          }
          deleteMany: {
            args: Prisma.InvitationCodeDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.InvitationCodeUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.InvitationCodeUpdateManyAndReturnArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$InvitationCodePayload>[]
          }
          upsert: {
            args: Prisma.InvitationCodeUpsertArgs<ExtArgs>
            result: runtime.Types.Utils.PayloadToResult<Prisma.$InvitationCodePayload>
          }
          aggregate: {
            args: Prisma.InvitationCodeAggregateArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<AggregateInvitationCode>
          }
          groupBy: {
            args: Prisma.InvitationCodeGroupByArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<InvitationCodeGroupByOutputType>[]
          }
          count: {
            args: Prisma.InvitationCodeCountArgs<ExtArgs>
            result: runtime.Types.Utils.Optional<InvitationCodeCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension = runtime.Extensions.defineExtension as unknown as runtime.Types.Extensions.ExtendsHook<"define", Prisma.TypeMapCb, runtime.Types.Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    course?: CourseOmit
    assignmentArea?: AssignmentAreaOmit
    submission?: SubmissionOmit
    rubric?: RubricOmit
    gradingSession?: GradingSessionOmit
    uploadedFile?: UploadedFileOmit
    gradingResult?: GradingResultOmit
    enrollment?: EnrollmentOmit
    invitationCode?: InvitationCodeOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => runtime.Types.Utils.JsPromise<T>,
  ) => runtime.Types.Utils.JsPromise<T>

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    rubrics: number
    gradingSessions: number
    uploadedFiles: number
    courses: number
    teacherRubrics: number
    submissions: number
    enrollments: number
    usedInvitations: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    rubrics?: boolean | UserCountOutputTypeCountRubricsArgs
    gradingSessions?: boolean | UserCountOutputTypeCountGradingSessionsArgs
    uploadedFiles?: boolean | UserCountOutputTypeCountUploadedFilesArgs
    courses?: boolean | UserCountOutputTypeCountCoursesArgs
    teacherRubrics?: boolean | UserCountOutputTypeCountTeacherRubricsArgs
    submissions?: boolean | UserCountOutputTypeCountSubmissionsArgs
    enrollments?: boolean | UserCountOutputTypeCountEnrollmentsArgs
    usedInvitations?: boolean | UserCountOutputTypeCountUsedInvitationsArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountRubricsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: RubricWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountGradingSessionsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: GradingSessionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountUploadedFilesArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: UploadedFileWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountCoursesArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: CourseWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountTeacherRubricsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: RubricWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSubmissionsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: SubmissionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountEnrollmentsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: EnrollmentWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountUsedInvitationsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: InvitationCodeWhereInput
  }


  /**
   * Count Type CourseCountOutputType
   */

  export type CourseCountOutputType = {
    assignmentAreas: number
    enrollments: number
    invitationCodes: number
  }

  export type CourseCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    assignmentAreas?: boolean | CourseCountOutputTypeCountAssignmentAreasArgs
    enrollments?: boolean | CourseCountOutputTypeCountEnrollmentsArgs
    invitationCodes?: boolean | CourseCountOutputTypeCountInvitationCodesArgs
  }

  // Custom InputTypes
  /**
   * CourseCountOutputType without action
   */
  export type CourseCountOutputTypeDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CourseCountOutputType
     */
    select?: CourseCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * CourseCountOutputType without action
   */
  export type CourseCountOutputTypeCountAssignmentAreasArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: AssignmentAreaWhereInput
  }

  /**
   * CourseCountOutputType without action
   */
  export type CourseCountOutputTypeCountEnrollmentsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: EnrollmentWhereInput
  }

  /**
   * CourseCountOutputType without action
   */
  export type CourseCountOutputTypeCountInvitationCodesArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: InvitationCodeWhereInput
  }


  /**
   * Count Type AssignmentAreaCountOutputType
   */

  export type AssignmentAreaCountOutputType = {
    submissions: number
  }

  export type AssignmentAreaCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    submissions?: boolean | AssignmentAreaCountOutputTypeCountSubmissionsArgs
  }

  // Custom InputTypes
  /**
   * AssignmentAreaCountOutputType without action
   */
  export type AssignmentAreaCountOutputTypeDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssignmentAreaCountOutputType
     */
    select?: AssignmentAreaCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * AssignmentAreaCountOutputType without action
   */
  export type AssignmentAreaCountOutputTypeCountSubmissionsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: SubmissionWhereInput
  }


  /**
   * Count Type RubricCountOutputType
   */

  export type RubricCountOutputType = {
    gradingResults: number
    assignmentAreas: number
  }

  export type RubricCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    gradingResults?: boolean | RubricCountOutputTypeCountGradingResultsArgs
    assignmentAreas?: boolean | RubricCountOutputTypeCountAssignmentAreasArgs
  }

  // Custom InputTypes
  /**
   * RubricCountOutputType without action
   */
  export type RubricCountOutputTypeDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RubricCountOutputType
     */
    select?: RubricCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * RubricCountOutputType without action
   */
  export type RubricCountOutputTypeCountGradingResultsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: GradingResultWhereInput
  }

  /**
   * RubricCountOutputType without action
   */
  export type RubricCountOutputTypeCountAssignmentAreasArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: AssignmentAreaWhereInput
  }


  /**
   * Count Type GradingSessionCountOutputType
   */

  export type GradingSessionCountOutputType = {
    gradingResults: number
  }

  export type GradingSessionCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    gradingResults?: boolean | GradingSessionCountOutputTypeCountGradingResultsArgs
  }

  // Custom InputTypes
  /**
   * GradingSessionCountOutputType without action
   */
  export type GradingSessionCountOutputTypeDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingSessionCountOutputType
     */
    select?: GradingSessionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * GradingSessionCountOutputType without action
   */
  export type GradingSessionCountOutputTypeCountGradingResultsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: GradingResultWhereInput
  }


  /**
   * Count Type UploadedFileCountOutputType
   */

  export type UploadedFileCountOutputType = {
    gradingResults: number
  }

  export type UploadedFileCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    gradingResults?: boolean | UploadedFileCountOutputTypeCountGradingResultsArgs
  }

  // Custom InputTypes
  /**
   * UploadedFileCountOutputType without action
   */
  export type UploadedFileCountOutputTypeDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFileCountOutputType
     */
    select?: UploadedFileCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UploadedFileCountOutputType without action
   */
  export type UploadedFileCountOutputTypeCountGradingResultsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: GradingResultWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    email: string | null
    role: $Enums.UserRole | null
    name: string | null
    picture: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    email: string | null
    role: $Enums.UserRole | null
    name: string | null
    picture: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    email: number
    role: number
    name: number
    picture: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    email?: true
    role?: true
    name?: true
    picture?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    email?: true
    role?: true
    name?: true
    picture?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    email?: true
    role?: true
    name?: true
    picture?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    email: string
    role: $Enums.UserRole
    name: string
    picture: string
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    role?: boolean
    name?: boolean
    picture?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    rubrics?: boolean | User$rubricsArgs<ExtArgs>
    gradingSessions?: boolean | User$gradingSessionsArgs<ExtArgs>
    uploadedFiles?: boolean | User$uploadedFilesArgs<ExtArgs>
    courses?: boolean | User$coursesArgs<ExtArgs>
    teacherRubrics?: boolean | User$teacherRubricsArgs<ExtArgs>
    submissions?: boolean | User$submissionsArgs<ExtArgs>
    enrollments?: boolean | User$enrollmentsArgs<ExtArgs>
    usedInvitations?: boolean | User$usedInvitationsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    role?: boolean
    name?: boolean
    picture?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    role?: boolean
    name?: boolean
    picture?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    email?: boolean
    role?: boolean
    name?: boolean
    picture?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "email" | "role" | "name" | "picture" | "createdAt" | "updatedAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    rubrics?: boolean | User$rubricsArgs<ExtArgs>
    gradingSessions?: boolean | User$gradingSessionsArgs<ExtArgs>
    uploadedFiles?: boolean | User$uploadedFilesArgs<ExtArgs>
    courses?: boolean | User$coursesArgs<ExtArgs>
    teacherRubrics?: boolean | User$teacherRubricsArgs<ExtArgs>
    submissions?: boolean | User$submissionsArgs<ExtArgs>
    enrollments?: boolean | User$enrollmentsArgs<ExtArgs>
    usedInvitations?: boolean | User$usedInvitationsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      rubrics: Prisma.$RubricPayload<ExtArgs>[]
      gradingSessions: Prisma.$GradingSessionPayload<ExtArgs>[]
      uploadedFiles: Prisma.$UploadedFilePayload<ExtArgs>[]
      courses: Prisma.$CoursePayload<ExtArgs>[]
      teacherRubrics: Prisma.$RubricPayload<ExtArgs>[]
      submissions: Prisma.$SubmissionPayload<ExtArgs>[]
      enrollments: Prisma.$EnrollmentPayload<ExtArgs>[]
      usedInvitations: Prisma.$InvitationCodePayload<ExtArgs>[]
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      email: string
      role: $Enums.UserRole
      name: string
      picture: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  export type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$UserPayload, S>

  export type UserCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends runtime.Types.Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    rubrics<T extends User$rubricsArgs<ExtArgs> = {}>(args?: Subset<T, User$rubricsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    gradingSessions<T extends User$gradingSessionsArgs<ExtArgs> = {}>(args?: Subset<T, User$gradingSessionsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$GradingSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    uploadedFiles<T extends User$uploadedFilesArgs<ExtArgs> = {}>(args?: Subset<T, User$uploadedFilesArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    courses<T extends User$coursesArgs<ExtArgs> = {}>(args?: Subset<T, User$coursesArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    teacherRubrics<T extends User$teacherRubricsArgs<ExtArgs> = {}>(args?: Subset<T, User$teacherRubricsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    submissions<T extends User$submissionsArgs<ExtArgs> = {}>(args?: Subset<T, User$submissionsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    enrollments<T extends User$enrollmentsArgs<ExtArgs> = {}>(args?: Subset<T, User$enrollmentsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$EnrollmentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    usedInvitations<T extends User$usedInvitationsArgs<ExtArgs> = {}>(args?: Subset<T, User$usedInvitationsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$InvitationCodePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  export interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'UserRole'>
    readonly name: FieldRef<"User", 'String'>
    readonly picture: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.rubrics
   */
  export type User$rubricsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    where?: RubricWhereInput
    orderBy?: RubricOrderByWithRelationInput | RubricOrderByWithRelationInput[]
    cursor?: RubricWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RubricScalarFieldEnum | RubricScalarFieldEnum[]
  }

  /**
   * User.gradingSessions
   */
  export type User$gradingSessionsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingSession
     */
    select?: GradingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingSession
     */
    omit?: GradingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingSessionInclude<ExtArgs> | null
    where?: GradingSessionWhereInput
    orderBy?: GradingSessionOrderByWithRelationInput | GradingSessionOrderByWithRelationInput[]
    cursor?: GradingSessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: GradingSessionScalarFieldEnum | GradingSessionScalarFieldEnum[]
  }

  /**
   * User.uploadedFiles
   */
  export type User$uploadedFilesArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    where?: UploadedFileWhereInput
    orderBy?: UploadedFileOrderByWithRelationInput | UploadedFileOrderByWithRelationInput[]
    cursor?: UploadedFileWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UploadedFileScalarFieldEnum | UploadedFileScalarFieldEnum[]
  }

  /**
   * User.courses
   */
  export type User$coursesArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    where?: CourseWhereInput
    orderBy?: CourseOrderByWithRelationInput | CourseOrderByWithRelationInput[]
    cursor?: CourseWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CourseScalarFieldEnum | CourseScalarFieldEnum[]
  }

  /**
   * User.teacherRubrics
   */
  export type User$teacherRubricsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    where?: RubricWhereInput
    orderBy?: RubricOrderByWithRelationInput | RubricOrderByWithRelationInput[]
    cursor?: RubricWhereUniqueInput
    take?: number
    skip?: number
    distinct?: RubricScalarFieldEnum | RubricScalarFieldEnum[]
  }

  /**
   * User.submissions
   */
  export type User$submissionsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    where?: SubmissionWhereInput
    orderBy?: SubmissionOrderByWithRelationInput | SubmissionOrderByWithRelationInput[]
    cursor?: SubmissionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SubmissionScalarFieldEnum | SubmissionScalarFieldEnum[]
  }

  /**
   * User.enrollments
   */
  export type User$enrollmentsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Enrollment
     */
    select?: EnrollmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Enrollment
     */
    omit?: EnrollmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnrollmentInclude<ExtArgs> | null
    where?: EnrollmentWhereInput
    orderBy?: EnrollmentOrderByWithRelationInput | EnrollmentOrderByWithRelationInput[]
    cursor?: EnrollmentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: EnrollmentScalarFieldEnum | EnrollmentScalarFieldEnum[]
  }

  /**
   * User.usedInvitations
   */
  export type User$usedInvitationsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvitationCode
     */
    select?: InvitationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvitationCode
     */
    omit?: InvitationCodeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvitationCodeInclude<ExtArgs> | null
    where?: InvitationCodeWhereInput
    orderBy?: InvitationCodeOrderByWithRelationInput | InvitationCodeOrderByWithRelationInput[]
    cursor?: InvitationCodeWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InvitationCodeScalarFieldEnum | InvitationCodeScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Course
   */

  export type AggregateCourse = {
    _count: CourseCountAggregateOutputType | null
    _min: CourseMinAggregateOutputType | null
    _max: CourseMaxAggregateOutputType | null
  }

  export type CourseMinAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    teacherId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CourseMaxAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    teacherId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CourseCountAggregateOutputType = {
    id: number
    name: number
    description: number
    teacherId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type CourseMinAggregateInputType = {
    id?: true
    name?: true
    description?: true
    teacherId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CourseMaxAggregateInputType = {
    id?: true
    name?: true
    description?: true
    teacherId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CourseCountAggregateInputType = {
    id?: true
    name?: true
    description?: true
    teacherId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type CourseAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Course to aggregate.
     */
    where?: CourseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Courses to fetch.
     */
    orderBy?: CourseOrderByWithRelationInput | CourseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CourseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Courses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Courses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Courses
    **/
    _count?: true | CourseCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CourseMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CourseMaxAggregateInputType
  }

  export type GetCourseAggregateType<T extends CourseAggregateArgs> = {
        [P in keyof T & keyof AggregateCourse]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCourse[P]>
      : GetScalarType<T[P], AggregateCourse[P]>
  }




  export type CourseGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: CourseWhereInput
    orderBy?: CourseOrderByWithAggregationInput | CourseOrderByWithAggregationInput[]
    by: CourseScalarFieldEnum[] | CourseScalarFieldEnum
    having?: CourseScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CourseCountAggregateInputType | true
    _min?: CourseMinAggregateInputType
    _max?: CourseMaxAggregateInputType
  }

  export type CourseGroupByOutputType = {
    id: string
    name: string
    description: string | null
    teacherId: string
    createdAt: Date
    updatedAt: Date
    _count: CourseCountAggregateOutputType | null
    _min: CourseMinAggregateOutputType | null
    _max: CourseMaxAggregateOutputType | null
  }

  type GetCourseGroupByPayload<T extends CourseGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CourseGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CourseGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CourseGroupByOutputType[P]>
            : GetScalarType<T[P], CourseGroupByOutputType[P]>
        }
      >
    >


  export type CourseSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    teacherId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    teacher?: boolean | UserDefaultArgs<ExtArgs>
    assignmentAreas?: boolean | Course$assignmentAreasArgs<ExtArgs>
    enrollments?: boolean | Course$enrollmentsArgs<ExtArgs>
    invitationCodes?: boolean | Course$invitationCodesArgs<ExtArgs>
    _count?: boolean | CourseCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["course"]>

  export type CourseSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    teacherId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    teacher?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["course"]>

  export type CourseSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    teacherId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    teacher?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["course"]>

  export type CourseSelectScalar = {
    id?: boolean
    name?: boolean
    description?: boolean
    teacherId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type CourseOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "name" | "description" | "teacherId" | "createdAt" | "updatedAt", ExtArgs["result"]["course"]>
  export type CourseInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    teacher?: boolean | UserDefaultArgs<ExtArgs>
    assignmentAreas?: boolean | Course$assignmentAreasArgs<ExtArgs>
    enrollments?: boolean | Course$enrollmentsArgs<ExtArgs>
    invitationCodes?: boolean | Course$invitationCodesArgs<ExtArgs>
    _count?: boolean | CourseCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type CourseIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    teacher?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type CourseIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    teacher?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $CoursePayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Course"
    objects: {
      teacher: Prisma.$UserPayload<ExtArgs>
      assignmentAreas: Prisma.$AssignmentAreaPayload<ExtArgs>[]
      enrollments: Prisma.$EnrollmentPayload<ExtArgs>[]
      invitationCodes: Prisma.$InvitationCodePayload<ExtArgs>[]
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      name: string
      description: string | null
      teacherId: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["course"]>
    composites: {}
  }

  export type CourseGetPayload<S extends boolean | null | undefined | CourseDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$CoursePayload, S>

  export type CourseCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
    Omit<CourseFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CourseCountAggregateInputType | true
    }

  export interface CourseDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Course'], meta: { name: 'Course' } }
    /**
     * Find zero or one Course that matches the filter.
     * @param {CourseFindUniqueArgs} args - Arguments to find a Course
     * @example
     * // Get one Course
     * const course = await prisma.course.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CourseFindUniqueArgs>(args: SelectSubset<T, CourseFindUniqueArgs<ExtArgs>>): Prisma__CourseClient<runtime.Types.Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Course that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CourseFindUniqueOrThrowArgs} args - Arguments to find a Course
     * @example
     * // Get one Course
     * const course = await prisma.course.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CourseFindUniqueOrThrowArgs>(args: SelectSubset<T, CourseFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CourseClient<runtime.Types.Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Course that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseFindFirstArgs} args - Arguments to find a Course
     * @example
     * // Get one Course
     * const course = await prisma.course.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CourseFindFirstArgs>(args?: SelectSubset<T, CourseFindFirstArgs<ExtArgs>>): Prisma__CourseClient<runtime.Types.Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Course that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseFindFirstOrThrowArgs} args - Arguments to find a Course
     * @example
     * // Get one Course
     * const course = await prisma.course.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CourseFindFirstOrThrowArgs>(args?: SelectSubset<T, CourseFindFirstOrThrowArgs<ExtArgs>>): Prisma__CourseClient<runtime.Types.Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Courses that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Courses
     * const courses = await prisma.course.findMany()
     * 
     * // Get first 10 Courses
     * const courses = await prisma.course.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const courseWithIdOnly = await prisma.course.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CourseFindManyArgs>(args?: SelectSubset<T, CourseFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Course.
     * @param {CourseCreateArgs} args - Arguments to create a Course.
     * @example
     * // Create one Course
     * const Course = await prisma.course.create({
     *   data: {
     *     // ... data to create a Course
     *   }
     * })
     * 
     */
    create<T extends CourseCreateArgs>(args: SelectSubset<T, CourseCreateArgs<ExtArgs>>): Prisma__CourseClient<runtime.Types.Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Courses.
     * @param {CourseCreateManyArgs} args - Arguments to create many Courses.
     * @example
     * // Create many Courses
     * const course = await prisma.course.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CourseCreateManyArgs>(args?: SelectSubset<T, CourseCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Courses and returns the data saved in the database.
     * @param {CourseCreateManyAndReturnArgs} args - Arguments to create many Courses.
     * @example
     * // Create many Courses
     * const course = await prisma.course.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Courses and only return the `id`
     * const courseWithIdOnly = await prisma.course.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CourseCreateManyAndReturnArgs>(args?: SelectSubset<T, CourseCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Course.
     * @param {CourseDeleteArgs} args - Arguments to delete one Course.
     * @example
     * // Delete one Course
     * const Course = await prisma.course.delete({
     *   where: {
     *     // ... filter to delete one Course
     *   }
     * })
     * 
     */
    delete<T extends CourseDeleteArgs>(args: SelectSubset<T, CourseDeleteArgs<ExtArgs>>): Prisma__CourseClient<runtime.Types.Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Course.
     * @param {CourseUpdateArgs} args - Arguments to update one Course.
     * @example
     * // Update one Course
     * const course = await prisma.course.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CourseUpdateArgs>(args: SelectSubset<T, CourseUpdateArgs<ExtArgs>>): Prisma__CourseClient<runtime.Types.Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Courses.
     * @param {CourseDeleteManyArgs} args - Arguments to filter Courses to delete.
     * @example
     * // Delete a few Courses
     * const { count } = await prisma.course.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CourseDeleteManyArgs>(args?: SelectSubset<T, CourseDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Courses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Courses
     * const course = await prisma.course.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CourseUpdateManyArgs>(args: SelectSubset<T, CourseUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Courses and returns the data updated in the database.
     * @param {CourseUpdateManyAndReturnArgs} args - Arguments to update many Courses.
     * @example
     * // Update many Courses
     * const course = await prisma.course.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Courses and only return the `id`
     * const courseWithIdOnly = await prisma.course.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CourseUpdateManyAndReturnArgs>(args: SelectSubset<T, CourseUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Course.
     * @param {CourseUpsertArgs} args - Arguments to update or create a Course.
     * @example
     * // Update or create a Course
     * const course = await prisma.course.upsert({
     *   create: {
     *     // ... data to create a Course
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Course we want to update
     *   }
     * })
     */
    upsert<T extends CourseUpsertArgs>(args: SelectSubset<T, CourseUpsertArgs<ExtArgs>>): Prisma__CourseClient<runtime.Types.Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Courses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseCountArgs} args - Arguments to filter Courses to count.
     * @example
     * // Count the number of Courses
     * const count = await prisma.course.count({
     *   where: {
     *     // ... the filter for the Courses we want to count
     *   }
     * })
    **/
    count<T extends CourseCountArgs>(
      args?: Subset<T, CourseCountArgs>,
    ): Prisma.PrismaPromise<
      T extends runtime.Types.Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CourseCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Course.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CourseAggregateArgs>(args: Subset<T, CourseAggregateArgs>): Prisma.PrismaPromise<GetCourseAggregateType<T>>

    /**
     * Group by Course.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CourseGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CourseGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CourseGroupByArgs['orderBy'] }
        : { orderBy?: CourseGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CourseGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCourseGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Course model
   */
  readonly fields: CourseFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Course.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CourseClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    teacher<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    assignmentAreas<T extends Course$assignmentAreasArgs<ExtArgs> = {}>(args?: Subset<T, Course$assignmentAreasArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$AssignmentAreaPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    enrollments<T extends Course$enrollmentsArgs<ExtArgs> = {}>(args?: Subset<T, Course$enrollmentsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$EnrollmentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    invitationCodes<T extends Course$invitationCodesArgs<ExtArgs> = {}>(args?: Subset<T, Course$invitationCodesArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$InvitationCodePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>
  }




  /**
   * Fields of the Course model
   */
  export interface CourseFieldRefs {
    readonly id: FieldRef<"Course", 'String'>
    readonly name: FieldRef<"Course", 'String'>
    readonly description: FieldRef<"Course", 'String'>
    readonly teacherId: FieldRef<"Course", 'String'>
    readonly createdAt: FieldRef<"Course", 'DateTime'>
    readonly updatedAt: FieldRef<"Course", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Course findUnique
   */
  export type CourseFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * Filter, which Course to fetch.
     */
    where: CourseWhereUniqueInput
  }

  /**
   * Course findUniqueOrThrow
   */
  export type CourseFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * Filter, which Course to fetch.
     */
    where: CourseWhereUniqueInput
  }

  /**
   * Course findFirst
   */
  export type CourseFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * Filter, which Course to fetch.
     */
    where?: CourseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Courses to fetch.
     */
    orderBy?: CourseOrderByWithRelationInput | CourseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Courses.
     */
    cursor?: CourseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Courses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Courses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Courses.
     */
    distinct?: CourseScalarFieldEnum | CourseScalarFieldEnum[]
  }

  /**
   * Course findFirstOrThrow
   */
  export type CourseFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * Filter, which Course to fetch.
     */
    where?: CourseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Courses to fetch.
     */
    orderBy?: CourseOrderByWithRelationInput | CourseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Courses.
     */
    cursor?: CourseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Courses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Courses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Courses.
     */
    distinct?: CourseScalarFieldEnum | CourseScalarFieldEnum[]
  }

  /**
   * Course findMany
   */
  export type CourseFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * Filter, which Courses to fetch.
     */
    where?: CourseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Courses to fetch.
     */
    orderBy?: CourseOrderByWithRelationInput | CourseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Courses.
     */
    cursor?: CourseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Courses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Courses.
     */
    skip?: number
    distinct?: CourseScalarFieldEnum | CourseScalarFieldEnum[]
  }

  /**
   * Course create
   */
  export type CourseCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * The data needed to create a Course.
     */
    data: XOR<CourseCreateInput, CourseUncheckedCreateInput>
  }

  /**
   * Course createMany
   */
  export type CourseCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many Courses.
     */
    data: CourseCreateManyInput | CourseCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Course createManyAndReturn
   */
  export type CourseCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * The data used to create many Courses.
     */
    data: CourseCreateManyInput | CourseCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Course update
   */
  export type CourseUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * The data needed to update a Course.
     */
    data: XOR<CourseUpdateInput, CourseUncheckedUpdateInput>
    /**
     * Choose, which Course to update.
     */
    where: CourseWhereUniqueInput
  }

  /**
   * Course updateMany
   */
  export type CourseUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update Courses.
     */
    data: XOR<CourseUpdateManyMutationInput, CourseUncheckedUpdateManyInput>
    /**
     * Filter which Courses to update
     */
    where?: CourseWhereInput
    /**
     * Limit how many Courses to update.
     */
    limit?: number
  }

  /**
   * Course updateManyAndReturn
   */
  export type CourseUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * The data used to update Courses.
     */
    data: XOR<CourseUpdateManyMutationInput, CourseUncheckedUpdateManyInput>
    /**
     * Filter which Courses to update
     */
    where?: CourseWhereInput
    /**
     * Limit how many Courses to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Course upsert
   */
  export type CourseUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * The filter to search for the Course to update in case it exists.
     */
    where: CourseWhereUniqueInput
    /**
     * In case the Course found by the `where` argument doesn't exist, create a new Course with this data.
     */
    create: XOR<CourseCreateInput, CourseUncheckedCreateInput>
    /**
     * In case the Course was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CourseUpdateInput, CourseUncheckedUpdateInput>
  }

  /**
   * Course delete
   */
  export type CourseDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
    /**
     * Filter which Course to delete.
     */
    where: CourseWhereUniqueInput
  }

  /**
   * Course deleteMany
   */
  export type CourseDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Courses to delete
     */
    where?: CourseWhereInput
    /**
     * Limit how many Courses to delete.
     */
    limit?: number
  }

  /**
   * Course.assignmentAreas
   */
  export type Course$assignmentAreasArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssignmentArea
     */
    select?: AssignmentAreaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssignmentArea
     */
    omit?: AssignmentAreaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssignmentAreaInclude<ExtArgs> | null
    where?: AssignmentAreaWhereInput
    orderBy?: AssignmentAreaOrderByWithRelationInput | AssignmentAreaOrderByWithRelationInput[]
    cursor?: AssignmentAreaWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AssignmentAreaScalarFieldEnum | AssignmentAreaScalarFieldEnum[]
  }

  /**
   * Course.enrollments
   */
  export type Course$enrollmentsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Enrollment
     */
    select?: EnrollmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Enrollment
     */
    omit?: EnrollmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnrollmentInclude<ExtArgs> | null
    where?: EnrollmentWhereInput
    orderBy?: EnrollmentOrderByWithRelationInput | EnrollmentOrderByWithRelationInput[]
    cursor?: EnrollmentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: EnrollmentScalarFieldEnum | EnrollmentScalarFieldEnum[]
  }

  /**
   * Course.invitationCodes
   */
  export type Course$invitationCodesArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvitationCode
     */
    select?: InvitationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvitationCode
     */
    omit?: InvitationCodeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvitationCodeInclude<ExtArgs> | null
    where?: InvitationCodeWhereInput
    orderBy?: InvitationCodeOrderByWithRelationInput | InvitationCodeOrderByWithRelationInput[]
    cursor?: InvitationCodeWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InvitationCodeScalarFieldEnum | InvitationCodeScalarFieldEnum[]
  }

  /**
   * Course without action
   */
  export type CourseDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Course
     */
    select?: CourseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Course
     */
    omit?: CourseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CourseInclude<ExtArgs> | null
  }


  /**
   * Model AssignmentArea
   */

  export type AggregateAssignmentArea = {
    _count: AssignmentAreaCountAggregateOutputType | null
    _min: AssignmentAreaMinAggregateOutputType | null
    _max: AssignmentAreaMaxAggregateOutputType | null
  }

  export type AssignmentAreaMinAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    courseId: string | null
    rubricId: string | null
    dueDate: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AssignmentAreaMaxAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    courseId: string | null
    rubricId: string | null
    dueDate: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AssignmentAreaCountAggregateOutputType = {
    id: number
    name: number
    description: number
    courseId: number
    rubricId: number
    dueDate: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type AssignmentAreaMinAggregateInputType = {
    id?: true
    name?: true
    description?: true
    courseId?: true
    rubricId?: true
    dueDate?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AssignmentAreaMaxAggregateInputType = {
    id?: true
    name?: true
    description?: true
    courseId?: true
    rubricId?: true
    dueDate?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AssignmentAreaCountAggregateInputType = {
    id?: true
    name?: true
    description?: true
    courseId?: true
    rubricId?: true
    dueDate?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type AssignmentAreaAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which AssignmentArea to aggregate.
     */
    where?: AssignmentAreaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AssignmentAreas to fetch.
     */
    orderBy?: AssignmentAreaOrderByWithRelationInput | AssignmentAreaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AssignmentAreaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AssignmentAreas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AssignmentAreas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AssignmentAreas
    **/
    _count?: true | AssignmentAreaCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AssignmentAreaMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AssignmentAreaMaxAggregateInputType
  }

  export type GetAssignmentAreaAggregateType<T extends AssignmentAreaAggregateArgs> = {
        [P in keyof T & keyof AggregateAssignmentArea]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAssignmentArea[P]>
      : GetScalarType<T[P], AggregateAssignmentArea[P]>
  }




  export type AssignmentAreaGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: AssignmentAreaWhereInput
    orderBy?: AssignmentAreaOrderByWithAggregationInput | AssignmentAreaOrderByWithAggregationInput[]
    by: AssignmentAreaScalarFieldEnum[] | AssignmentAreaScalarFieldEnum
    having?: AssignmentAreaScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AssignmentAreaCountAggregateInputType | true
    _min?: AssignmentAreaMinAggregateInputType
    _max?: AssignmentAreaMaxAggregateInputType
  }

  export type AssignmentAreaGroupByOutputType = {
    id: string
    name: string
    description: string | null
    courseId: string
    rubricId: string
    dueDate: Date | null
    createdAt: Date
    updatedAt: Date
    _count: AssignmentAreaCountAggregateOutputType | null
    _min: AssignmentAreaMinAggregateOutputType | null
    _max: AssignmentAreaMaxAggregateOutputType | null
  }

  type GetAssignmentAreaGroupByPayload<T extends AssignmentAreaGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AssignmentAreaGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AssignmentAreaGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AssignmentAreaGroupByOutputType[P]>
            : GetScalarType<T[P], AssignmentAreaGroupByOutputType[P]>
        }
      >
    >


  export type AssignmentAreaSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    courseId?: boolean
    rubricId?: boolean
    dueDate?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    course?: boolean | CourseDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
    submissions?: boolean | AssignmentArea$submissionsArgs<ExtArgs>
    _count?: boolean | AssignmentAreaCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["assignmentArea"]>

  export type AssignmentAreaSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    courseId?: boolean
    rubricId?: boolean
    dueDate?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    course?: boolean | CourseDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["assignmentArea"]>

  export type AssignmentAreaSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    courseId?: boolean
    rubricId?: boolean
    dueDate?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    course?: boolean | CourseDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["assignmentArea"]>

  export type AssignmentAreaSelectScalar = {
    id?: boolean
    name?: boolean
    description?: boolean
    courseId?: boolean
    rubricId?: boolean
    dueDate?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type AssignmentAreaOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "name" | "description" | "courseId" | "rubricId" | "dueDate" | "createdAt" | "updatedAt", ExtArgs["result"]["assignmentArea"]>
  export type AssignmentAreaInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    course?: boolean | CourseDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
    submissions?: boolean | AssignmentArea$submissionsArgs<ExtArgs>
    _count?: boolean | AssignmentAreaCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type AssignmentAreaIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    course?: boolean | CourseDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }
  export type AssignmentAreaIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    course?: boolean | CourseDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }

  export type $AssignmentAreaPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "AssignmentArea"
    objects: {
      course: Prisma.$CoursePayload<ExtArgs>
      rubric: Prisma.$RubricPayload<ExtArgs>
      submissions: Prisma.$SubmissionPayload<ExtArgs>[]
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      name: string
      description: string | null
      courseId: string
      rubricId: string
      dueDate: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["assignmentArea"]>
    composites: {}
  }

  export type AssignmentAreaGetPayload<S extends boolean | null | undefined | AssignmentAreaDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$AssignmentAreaPayload, S>

  export type AssignmentAreaCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
    Omit<AssignmentAreaFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AssignmentAreaCountAggregateInputType | true
    }

  export interface AssignmentAreaDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AssignmentArea'], meta: { name: 'AssignmentArea' } }
    /**
     * Find zero or one AssignmentArea that matches the filter.
     * @param {AssignmentAreaFindUniqueArgs} args - Arguments to find a AssignmentArea
     * @example
     * // Get one AssignmentArea
     * const assignmentArea = await prisma.assignmentArea.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AssignmentAreaFindUniqueArgs>(args: SelectSubset<T, AssignmentAreaFindUniqueArgs<ExtArgs>>): Prisma__AssignmentAreaClient<runtime.Types.Result.GetResult<Prisma.$AssignmentAreaPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AssignmentArea that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AssignmentAreaFindUniqueOrThrowArgs} args - Arguments to find a AssignmentArea
     * @example
     * // Get one AssignmentArea
     * const assignmentArea = await prisma.assignmentArea.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AssignmentAreaFindUniqueOrThrowArgs>(args: SelectSubset<T, AssignmentAreaFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AssignmentAreaClient<runtime.Types.Result.GetResult<Prisma.$AssignmentAreaPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AssignmentArea that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssignmentAreaFindFirstArgs} args - Arguments to find a AssignmentArea
     * @example
     * // Get one AssignmentArea
     * const assignmentArea = await prisma.assignmentArea.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AssignmentAreaFindFirstArgs>(args?: SelectSubset<T, AssignmentAreaFindFirstArgs<ExtArgs>>): Prisma__AssignmentAreaClient<runtime.Types.Result.GetResult<Prisma.$AssignmentAreaPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AssignmentArea that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssignmentAreaFindFirstOrThrowArgs} args - Arguments to find a AssignmentArea
     * @example
     * // Get one AssignmentArea
     * const assignmentArea = await prisma.assignmentArea.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AssignmentAreaFindFirstOrThrowArgs>(args?: SelectSubset<T, AssignmentAreaFindFirstOrThrowArgs<ExtArgs>>): Prisma__AssignmentAreaClient<runtime.Types.Result.GetResult<Prisma.$AssignmentAreaPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AssignmentAreas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssignmentAreaFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AssignmentAreas
     * const assignmentAreas = await prisma.assignmentArea.findMany()
     * 
     * // Get first 10 AssignmentAreas
     * const assignmentAreas = await prisma.assignmentArea.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const assignmentAreaWithIdOnly = await prisma.assignmentArea.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AssignmentAreaFindManyArgs>(args?: SelectSubset<T, AssignmentAreaFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$AssignmentAreaPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AssignmentArea.
     * @param {AssignmentAreaCreateArgs} args - Arguments to create a AssignmentArea.
     * @example
     * // Create one AssignmentArea
     * const AssignmentArea = await prisma.assignmentArea.create({
     *   data: {
     *     // ... data to create a AssignmentArea
     *   }
     * })
     * 
     */
    create<T extends AssignmentAreaCreateArgs>(args: SelectSubset<T, AssignmentAreaCreateArgs<ExtArgs>>): Prisma__AssignmentAreaClient<runtime.Types.Result.GetResult<Prisma.$AssignmentAreaPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AssignmentAreas.
     * @param {AssignmentAreaCreateManyArgs} args - Arguments to create many AssignmentAreas.
     * @example
     * // Create many AssignmentAreas
     * const assignmentArea = await prisma.assignmentArea.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AssignmentAreaCreateManyArgs>(args?: SelectSubset<T, AssignmentAreaCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AssignmentAreas and returns the data saved in the database.
     * @param {AssignmentAreaCreateManyAndReturnArgs} args - Arguments to create many AssignmentAreas.
     * @example
     * // Create many AssignmentAreas
     * const assignmentArea = await prisma.assignmentArea.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AssignmentAreas and only return the `id`
     * const assignmentAreaWithIdOnly = await prisma.assignmentArea.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AssignmentAreaCreateManyAndReturnArgs>(args?: SelectSubset<T, AssignmentAreaCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$AssignmentAreaPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AssignmentArea.
     * @param {AssignmentAreaDeleteArgs} args - Arguments to delete one AssignmentArea.
     * @example
     * // Delete one AssignmentArea
     * const AssignmentArea = await prisma.assignmentArea.delete({
     *   where: {
     *     // ... filter to delete one AssignmentArea
     *   }
     * })
     * 
     */
    delete<T extends AssignmentAreaDeleteArgs>(args: SelectSubset<T, AssignmentAreaDeleteArgs<ExtArgs>>): Prisma__AssignmentAreaClient<runtime.Types.Result.GetResult<Prisma.$AssignmentAreaPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AssignmentArea.
     * @param {AssignmentAreaUpdateArgs} args - Arguments to update one AssignmentArea.
     * @example
     * // Update one AssignmentArea
     * const assignmentArea = await prisma.assignmentArea.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AssignmentAreaUpdateArgs>(args: SelectSubset<T, AssignmentAreaUpdateArgs<ExtArgs>>): Prisma__AssignmentAreaClient<runtime.Types.Result.GetResult<Prisma.$AssignmentAreaPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AssignmentAreas.
     * @param {AssignmentAreaDeleteManyArgs} args - Arguments to filter AssignmentAreas to delete.
     * @example
     * // Delete a few AssignmentAreas
     * const { count } = await prisma.assignmentArea.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AssignmentAreaDeleteManyArgs>(args?: SelectSubset<T, AssignmentAreaDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AssignmentAreas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssignmentAreaUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AssignmentAreas
     * const assignmentArea = await prisma.assignmentArea.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AssignmentAreaUpdateManyArgs>(args: SelectSubset<T, AssignmentAreaUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AssignmentAreas and returns the data updated in the database.
     * @param {AssignmentAreaUpdateManyAndReturnArgs} args - Arguments to update many AssignmentAreas.
     * @example
     * // Update many AssignmentAreas
     * const assignmentArea = await prisma.assignmentArea.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AssignmentAreas and only return the `id`
     * const assignmentAreaWithIdOnly = await prisma.assignmentArea.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AssignmentAreaUpdateManyAndReturnArgs>(args: SelectSubset<T, AssignmentAreaUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$AssignmentAreaPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AssignmentArea.
     * @param {AssignmentAreaUpsertArgs} args - Arguments to update or create a AssignmentArea.
     * @example
     * // Update or create a AssignmentArea
     * const assignmentArea = await prisma.assignmentArea.upsert({
     *   create: {
     *     // ... data to create a AssignmentArea
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AssignmentArea we want to update
     *   }
     * })
     */
    upsert<T extends AssignmentAreaUpsertArgs>(args: SelectSubset<T, AssignmentAreaUpsertArgs<ExtArgs>>): Prisma__AssignmentAreaClient<runtime.Types.Result.GetResult<Prisma.$AssignmentAreaPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AssignmentAreas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssignmentAreaCountArgs} args - Arguments to filter AssignmentAreas to count.
     * @example
     * // Count the number of AssignmentAreas
     * const count = await prisma.assignmentArea.count({
     *   where: {
     *     // ... the filter for the AssignmentAreas we want to count
     *   }
     * })
    **/
    count<T extends AssignmentAreaCountArgs>(
      args?: Subset<T, AssignmentAreaCountArgs>,
    ): Prisma.PrismaPromise<
      T extends runtime.Types.Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AssignmentAreaCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AssignmentArea.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssignmentAreaAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AssignmentAreaAggregateArgs>(args: Subset<T, AssignmentAreaAggregateArgs>): Prisma.PrismaPromise<GetAssignmentAreaAggregateType<T>>

    /**
     * Group by AssignmentArea.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AssignmentAreaGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AssignmentAreaGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AssignmentAreaGroupByArgs['orderBy'] }
        : { orderBy?: AssignmentAreaGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AssignmentAreaGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAssignmentAreaGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AssignmentArea model
   */
  readonly fields: AssignmentAreaFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AssignmentArea.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AssignmentAreaClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    course<T extends CourseDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CourseDefaultArgs<ExtArgs>>): Prisma__CourseClient<runtime.Types.Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    rubric<T extends RubricDefaultArgs<ExtArgs> = {}>(args?: Subset<T, RubricDefaultArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    submissions<T extends AssignmentArea$submissionsArgs<ExtArgs> = {}>(args?: Subset<T, AssignmentArea$submissionsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>
  }




  /**
   * Fields of the AssignmentArea model
   */
  export interface AssignmentAreaFieldRefs {
    readonly id: FieldRef<"AssignmentArea", 'String'>
    readonly name: FieldRef<"AssignmentArea", 'String'>
    readonly description: FieldRef<"AssignmentArea", 'String'>
    readonly courseId: FieldRef<"AssignmentArea", 'String'>
    readonly rubricId: FieldRef<"AssignmentArea", 'String'>
    readonly dueDate: FieldRef<"AssignmentArea", 'DateTime'>
    readonly createdAt: FieldRef<"AssignmentArea", 'DateTime'>
    readonly updatedAt: FieldRef<"AssignmentArea", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AssignmentArea findUnique
   */
  export type AssignmentAreaFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssignmentArea
     */
    select?: AssignmentAreaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssignmentArea
     */
    omit?: AssignmentAreaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssignmentAreaInclude<ExtArgs> | null
    /**
     * Filter, which AssignmentArea to fetch.
     */
    where: AssignmentAreaWhereUniqueInput
  }

  /**
   * AssignmentArea findUniqueOrThrow
   */
  export type AssignmentAreaFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssignmentArea
     */
    select?: AssignmentAreaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssignmentArea
     */
    omit?: AssignmentAreaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssignmentAreaInclude<ExtArgs> | null
    /**
     * Filter, which AssignmentArea to fetch.
     */
    where: AssignmentAreaWhereUniqueInput
  }

  /**
   * AssignmentArea findFirst
   */
  export type AssignmentAreaFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssignmentArea
     */
    select?: AssignmentAreaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssignmentArea
     */
    omit?: AssignmentAreaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssignmentAreaInclude<ExtArgs> | null
    /**
     * Filter, which AssignmentArea to fetch.
     */
    where?: AssignmentAreaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AssignmentAreas to fetch.
     */
    orderBy?: AssignmentAreaOrderByWithRelationInput | AssignmentAreaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AssignmentAreas.
     */
    cursor?: AssignmentAreaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AssignmentAreas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AssignmentAreas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AssignmentAreas.
     */
    distinct?: AssignmentAreaScalarFieldEnum | AssignmentAreaScalarFieldEnum[]
  }

  /**
   * AssignmentArea findFirstOrThrow
   */
  export type AssignmentAreaFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssignmentArea
     */
    select?: AssignmentAreaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssignmentArea
     */
    omit?: AssignmentAreaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssignmentAreaInclude<ExtArgs> | null
    /**
     * Filter, which AssignmentArea to fetch.
     */
    where?: AssignmentAreaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AssignmentAreas to fetch.
     */
    orderBy?: AssignmentAreaOrderByWithRelationInput | AssignmentAreaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AssignmentAreas.
     */
    cursor?: AssignmentAreaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AssignmentAreas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AssignmentAreas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AssignmentAreas.
     */
    distinct?: AssignmentAreaScalarFieldEnum | AssignmentAreaScalarFieldEnum[]
  }

  /**
   * AssignmentArea findMany
   */
  export type AssignmentAreaFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssignmentArea
     */
    select?: AssignmentAreaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssignmentArea
     */
    omit?: AssignmentAreaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssignmentAreaInclude<ExtArgs> | null
    /**
     * Filter, which AssignmentAreas to fetch.
     */
    where?: AssignmentAreaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AssignmentAreas to fetch.
     */
    orderBy?: AssignmentAreaOrderByWithRelationInput | AssignmentAreaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AssignmentAreas.
     */
    cursor?: AssignmentAreaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AssignmentAreas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AssignmentAreas.
     */
    skip?: number
    distinct?: AssignmentAreaScalarFieldEnum | AssignmentAreaScalarFieldEnum[]
  }

  /**
   * AssignmentArea create
   */
  export type AssignmentAreaCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssignmentArea
     */
    select?: AssignmentAreaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssignmentArea
     */
    omit?: AssignmentAreaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssignmentAreaInclude<ExtArgs> | null
    /**
     * The data needed to create a AssignmentArea.
     */
    data: XOR<AssignmentAreaCreateInput, AssignmentAreaUncheckedCreateInput>
  }

  /**
   * AssignmentArea createMany
   */
  export type AssignmentAreaCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many AssignmentAreas.
     */
    data: AssignmentAreaCreateManyInput | AssignmentAreaCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AssignmentArea createManyAndReturn
   */
  export type AssignmentAreaCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssignmentArea
     */
    select?: AssignmentAreaSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AssignmentArea
     */
    omit?: AssignmentAreaOmit<ExtArgs> | null
    /**
     * The data used to create many AssignmentAreas.
     */
    data: AssignmentAreaCreateManyInput | AssignmentAreaCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssignmentAreaIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AssignmentArea update
   */
  export type AssignmentAreaUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssignmentArea
     */
    select?: AssignmentAreaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssignmentArea
     */
    omit?: AssignmentAreaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssignmentAreaInclude<ExtArgs> | null
    /**
     * The data needed to update a AssignmentArea.
     */
    data: XOR<AssignmentAreaUpdateInput, AssignmentAreaUncheckedUpdateInput>
    /**
     * Choose, which AssignmentArea to update.
     */
    where: AssignmentAreaWhereUniqueInput
  }

  /**
   * AssignmentArea updateMany
   */
  export type AssignmentAreaUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update AssignmentAreas.
     */
    data: XOR<AssignmentAreaUpdateManyMutationInput, AssignmentAreaUncheckedUpdateManyInput>
    /**
     * Filter which AssignmentAreas to update
     */
    where?: AssignmentAreaWhereInput
    /**
     * Limit how many AssignmentAreas to update.
     */
    limit?: number
  }

  /**
   * AssignmentArea updateManyAndReturn
   */
  export type AssignmentAreaUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssignmentArea
     */
    select?: AssignmentAreaSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AssignmentArea
     */
    omit?: AssignmentAreaOmit<ExtArgs> | null
    /**
     * The data used to update AssignmentAreas.
     */
    data: XOR<AssignmentAreaUpdateManyMutationInput, AssignmentAreaUncheckedUpdateManyInput>
    /**
     * Filter which AssignmentAreas to update
     */
    where?: AssignmentAreaWhereInput
    /**
     * Limit how many AssignmentAreas to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssignmentAreaIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AssignmentArea upsert
   */
  export type AssignmentAreaUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssignmentArea
     */
    select?: AssignmentAreaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssignmentArea
     */
    omit?: AssignmentAreaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssignmentAreaInclude<ExtArgs> | null
    /**
     * The filter to search for the AssignmentArea to update in case it exists.
     */
    where: AssignmentAreaWhereUniqueInput
    /**
     * In case the AssignmentArea found by the `where` argument doesn't exist, create a new AssignmentArea with this data.
     */
    create: XOR<AssignmentAreaCreateInput, AssignmentAreaUncheckedCreateInput>
    /**
     * In case the AssignmentArea was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AssignmentAreaUpdateInput, AssignmentAreaUncheckedUpdateInput>
  }

  /**
   * AssignmentArea delete
   */
  export type AssignmentAreaDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssignmentArea
     */
    select?: AssignmentAreaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssignmentArea
     */
    omit?: AssignmentAreaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssignmentAreaInclude<ExtArgs> | null
    /**
     * Filter which AssignmentArea to delete.
     */
    where: AssignmentAreaWhereUniqueInput
  }

  /**
   * AssignmentArea deleteMany
   */
  export type AssignmentAreaDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which AssignmentAreas to delete
     */
    where?: AssignmentAreaWhereInput
    /**
     * Limit how many AssignmentAreas to delete.
     */
    limit?: number
  }

  /**
   * AssignmentArea.submissions
   */
  export type AssignmentArea$submissionsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    where?: SubmissionWhereInput
    orderBy?: SubmissionOrderByWithRelationInput | SubmissionOrderByWithRelationInput[]
    cursor?: SubmissionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SubmissionScalarFieldEnum | SubmissionScalarFieldEnum[]
  }

  /**
   * AssignmentArea without action
   */
  export type AssignmentAreaDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssignmentArea
     */
    select?: AssignmentAreaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssignmentArea
     */
    omit?: AssignmentAreaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssignmentAreaInclude<ExtArgs> | null
  }


  /**
   * Model Submission
   */

  export type AggregateSubmission = {
    _count: SubmissionCountAggregateOutputType | null
    _avg: SubmissionAvgAggregateOutputType | null
    _sum: SubmissionSumAggregateOutputType | null
    _min: SubmissionMinAggregateOutputType | null
    _max: SubmissionMaxAggregateOutputType | null
  }

  export type SubmissionAvgAggregateOutputType = {
    finalScore: number | null
  }

  export type SubmissionSumAggregateOutputType = {
    finalScore: number | null
  }

  export type SubmissionMinAggregateOutputType = {
    id: string | null
    studentId: string | null
    assignmentAreaId: string | null
    filePath: string | null
    uploadedAt: Date | null
    finalScore: number | null
    teacherFeedback: string | null
    status: $Enums.SubmissionStatus | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SubmissionMaxAggregateOutputType = {
    id: string | null
    studentId: string | null
    assignmentAreaId: string | null
    filePath: string | null
    uploadedAt: Date | null
    finalScore: number | null
    teacherFeedback: string | null
    status: $Enums.SubmissionStatus | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SubmissionCountAggregateOutputType = {
    id: number
    studentId: number
    assignmentAreaId: number
    filePath: number
    uploadedAt: number
    aiAnalysisResult: number
    finalScore: number
    teacherFeedback: number
    status: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SubmissionAvgAggregateInputType = {
    finalScore?: true
  }

  export type SubmissionSumAggregateInputType = {
    finalScore?: true
  }

  export type SubmissionMinAggregateInputType = {
    id?: true
    studentId?: true
    assignmentAreaId?: true
    filePath?: true
    uploadedAt?: true
    finalScore?: true
    teacherFeedback?: true
    status?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SubmissionMaxAggregateInputType = {
    id?: true
    studentId?: true
    assignmentAreaId?: true
    filePath?: true
    uploadedAt?: true
    finalScore?: true
    teacherFeedback?: true
    status?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SubmissionCountAggregateInputType = {
    id?: true
    studentId?: true
    assignmentAreaId?: true
    filePath?: true
    uploadedAt?: true
    aiAnalysisResult?: true
    finalScore?: true
    teacherFeedback?: true
    status?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SubmissionAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Submission to aggregate.
     */
    where?: SubmissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Submissions to fetch.
     */
    orderBy?: SubmissionOrderByWithRelationInput | SubmissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SubmissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Submissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Submissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Submissions
    **/
    _count?: true | SubmissionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SubmissionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SubmissionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SubmissionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SubmissionMaxAggregateInputType
  }

  export type GetSubmissionAggregateType<T extends SubmissionAggregateArgs> = {
        [P in keyof T & keyof AggregateSubmission]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSubmission[P]>
      : GetScalarType<T[P], AggregateSubmission[P]>
  }




  export type SubmissionGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: SubmissionWhereInput
    orderBy?: SubmissionOrderByWithAggregationInput | SubmissionOrderByWithAggregationInput[]
    by: SubmissionScalarFieldEnum[] | SubmissionScalarFieldEnum
    having?: SubmissionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SubmissionCountAggregateInputType | true
    _avg?: SubmissionAvgAggregateInputType
    _sum?: SubmissionSumAggregateInputType
    _min?: SubmissionMinAggregateInputType
    _max?: SubmissionMaxAggregateInputType
  }

  export type SubmissionGroupByOutputType = {
    id: string
    studentId: string
    assignmentAreaId: string
    filePath: string
    uploadedAt: Date
    aiAnalysisResult: JsonValue | null
    finalScore: number | null
    teacherFeedback: string | null
    status: $Enums.SubmissionStatus
    createdAt: Date
    updatedAt: Date
    _count: SubmissionCountAggregateOutputType | null
    _avg: SubmissionAvgAggregateOutputType | null
    _sum: SubmissionSumAggregateOutputType | null
    _min: SubmissionMinAggregateOutputType | null
    _max: SubmissionMaxAggregateOutputType | null
  }

  type GetSubmissionGroupByPayload<T extends SubmissionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SubmissionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SubmissionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SubmissionGroupByOutputType[P]>
            : GetScalarType<T[P], SubmissionGroupByOutputType[P]>
        }
      >
    >


  export type SubmissionSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    studentId?: boolean
    assignmentAreaId?: boolean
    filePath?: boolean
    uploadedAt?: boolean
    aiAnalysisResult?: boolean
    finalScore?: boolean
    teacherFeedback?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    student?: boolean | UserDefaultArgs<ExtArgs>
    assignmentArea?: boolean | AssignmentAreaDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["submission"]>

  export type SubmissionSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    studentId?: boolean
    assignmentAreaId?: boolean
    filePath?: boolean
    uploadedAt?: boolean
    aiAnalysisResult?: boolean
    finalScore?: boolean
    teacherFeedback?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    student?: boolean | UserDefaultArgs<ExtArgs>
    assignmentArea?: boolean | AssignmentAreaDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["submission"]>

  export type SubmissionSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    studentId?: boolean
    assignmentAreaId?: boolean
    filePath?: boolean
    uploadedAt?: boolean
    aiAnalysisResult?: boolean
    finalScore?: boolean
    teacherFeedback?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    student?: boolean | UserDefaultArgs<ExtArgs>
    assignmentArea?: boolean | AssignmentAreaDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["submission"]>

  export type SubmissionSelectScalar = {
    id?: boolean
    studentId?: boolean
    assignmentAreaId?: boolean
    filePath?: boolean
    uploadedAt?: boolean
    aiAnalysisResult?: boolean
    finalScore?: boolean
    teacherFeedback?: boolean
    status?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type SubmissionOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "studentId" | "assignmentAreaId" | "filePath" | "uploadedAt" | "aiAnalysisResult" | "finalScore" | "teacherFeedback" | "status" | "createdAt" | "updatedAt", ExtArgs["result"]["submission"]>
  export type SubmissionInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    student?: boolean | UserDefaultArgs<ExtArgs>
    assignmentArea?: boolean | AssignmentAreaDefaultArgs<ExtArgs>
  }
  export type SubmissionIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    student?: boolean | UserDefaultArgs<ExtArgs>
    assignmentArea?: boolean | AssignmentAreaDefaultArgs<ExtArgs>
  }
  export type SubmissionIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    student?: boolean | UserDefaultArgs<ExtArgs>
    assignmentArea?: boolean | AssignmentAreaDefaultArgs<ExtArgs>
  }

  export type $SubmissionPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Submission"
    objects: {
      student: Prisma.$UserPayload<ExtArgs>
      assignmentArea: Prisma.$AssignmentAreaPayload<ExtArgs>
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      studentId: string
      assignmentAreaId: string
      filePath: string
      uploadedAt: Date
      aiAnalysisResult: Prisma.JsonValue | null
      finalScore: number | null
      teacherFeedback: string | null
      status: $Enums.SubmissionStatus
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["submission"]>
    composites: {}
  }

  export type SubmissionGetPayload<S extends boolean | null | undefined | SubmissionDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$SubmissionPayload, S>

  export type SubmissionCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
    Omit<SubmissionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SubmissionCountAggregateInputType | true
    }

  export interface SubmissionDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Submission'], meta: { name: 'Submission' } }
    /**
     * Find zero or one Submission that matches the filter.
     * @param {SubmissionFindUniqueArgs} args - Arguments to find a Submission
     * @example
     * // Get one Submission
     * const submission = await prisma.submission.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SubmissionFindUniqueArgs>(args: SelectSubset<T, SubmissionFindUniqueArgs<ExtArgs>>): Prisma__SubmissionClient<runtime.Types.Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Submission that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SubmissionFindUniqueOrThrowArgs} args - Arguments to find a Submission
     * @example
     * // Get one Submission
     * const submission = await prisma.submission.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SubmissionFindUniqueOrThrowArgs>(args: SelectSubset<T, SubmissionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SubmissionClient<runtime.Types.Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Submission that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionFindFirstArgs} args - Arguments to find a Submission
     * @example
     * // Get one Submission
     * const submission = await prisma.submission.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SubmissionFindFirstArgs>(args?: SelectSubset<T, SubmissionFindFirstArgs<ExtArgs>>): Prisma__SubmissionClient<runtime.Types.Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Submission that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionFindFirstOrThrowArgs} args - Arguments to find a Submission
     * @example
     * // Get one Submission
     * const submission = await prisma.submission.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SubmissionFindFirstOrThrowArgs>(args?: SelectSubset<T, SubmissionFindFirstOrThrowArgs<ExtArgs>>): Prisma__SubmissionClient<runtime.Types.Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Submissions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Submissions
     * const submissions = await prisma.submission.findMany()
     * 
     * // Get first 10 Submissions
     * const submissions = await prisma.submission.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const submissionWithIdOnly = await prisma.submission.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SubmissionFindManyArgs>(args?: SelectSubset<T, SubmissionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Submission.
     * @param {SubmissionCreateArgs} args - Arguments to create a Submission.
     * @example
     * // Create one Submission
     * const Submission = await prisma.submission.create({
     *   data: {
     *     // ... data to create a Submission
     *   }
     * })
     * 
     */
    create<T extends SubmissionCreateArgs>(args: SelectSubset<T, SubmissionCreateArgs<ExtArgs>>): Prisma__SubmissionClient<runtime.Types.Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Submissions.
     * @param {SubmissionCreateManyArgs} args - Arguments to create many Submissions.
     * @example
     * // Create many Submissions
     * const submission = await prisma.submission.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SubmissionCreateManyArgs>(args?: SelectSubset<T, SubmissionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Submissions and returns the data saved in the database.
     * @param {SubmissionCreateManyAndReturnArgs} args - Arguments to create many Submissions.
     * @example
     * // Create many Submissions
     * const submission = await prisma.submission.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Submissions and only return the `id`
     * const submissionWithIdOnly = await prisma.submission.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SubmissionCreateManyAndReturnArgs>(args?: SelectSubset<T, SubmissionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Submission.
     * @param {SubmissionDeleteArgs} args - Arguments to delete one Submission.
     * @example
     * // Delete one Submission
     * const Submission = await prisma.submission.delete({
     *   where: {
     *     // ... filter to delete one Submission
     *   }
     * })
     * 
     */
    delete<T extends SubmissionDeleteArgs>(args: SelectSubset<T, SubmissionDeleteArgs<ExtArgs>>): Prisma__SubmissionClient<runtime.Types.Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Submission.
     * @param {SubmissionUpdateArgs} args - Arguments to update one Submission.
     * @example
     * // Update one Submission
     * const submission = await prisma.submission.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SubmissionUpdateArgs>(args: SelectSubset<T, SubmissionUpdateArgs<ExtArgs>>): Prisma__SubmissionClient<runtime.Types.Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Submissions.
     * @param {SubmissionDeleteManyArgs} args - Arguments to filter Submissions to delete.
     * @example
     * // Delete a few Submissions
     * const { count } = await prisma.submission.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SubmissionDeleteManyArgs>(args?: SelectSubset<T, SubmissionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Submissions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Submissions
     * const submission = await prisma.submission.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SubmissionUpdateManyArgs>(args: SelectSubset<T, SubmissionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Submissions and returns the data updated in the database.
     * @param {SubmissionUpdateManyAndReturnArgs} args - Arguments to update many Submissions.
     * @example
     * // Update many Submissions
     * const submission = await prisma.submission.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Submissions and only return the `id`
     * const submissionWithIdOnly = await prisma.submission.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SubmissionUpdateManyAndReturnArgs>(args: SelectSubset<T, SubmissionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Submission.
     * @param {SubmissionUpsertArgs} args - Arguments to update or create a Submission.
     * @example
     * // Update or create a Submission
     * const submission = await prisma.submission.upsert({
     *   create: {
     *     // ... data to create a Submission
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Submission we want to update
     *   }
     * })
     */
    upsert<T extends SubmissionUpsertArgs>(args: SelectSubset<T, SubmissionUpsertArgs<ExtArgs>>): Prisma__SubmissionClient<runtime.Types.Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Submissions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionCountArgs} args - Arguments to filter Submissions to count.
     * @example
     * // Count the number of Submissions
     * const count = await prisma.submission.count({
     *   where: {
     *     // ... the filter for the Submissions we want to count
     *   }
     * })
    **/
    count<T extends SubmissionCountArgs>(
      args?: Subset<T, SubmissionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends runtime.Types.Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SubmissionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Submission.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SubmissionAggregateArgs>(args: Subset<T, SubmissionAggregateArgs>): Prisma.PrismaPromise<GetSubmissionAggregateType<T>>

    /**
     * Group by Submission.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SubmissionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SubmissionGroupByArgs['orderBy'] }
        : { orderBy?: SubmissionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SubmissionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSubmissionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Submission model
   */
  readonly fields: SubmissionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Submission.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SubmissionClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    student<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    assignmentArea<T extends AssignmentAreaDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AssignmentAreaDefaultArgs<ExtArgs>>): Prisma__AssignmentAreaClient<runtime.Types.Result.GetResult<Prisma.$AssignmentAreaPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>
  }




  /**
   * Fields of the Submission model
   */
  export interface SubmissionFieldRefs {
    readonly id: FieldRef<"Submission", 'String'>
    readonly studentId: FieldRef<"Submission", 'String'>
    readonly assignmentAreaId: FieldRef<"Submission", 'String'>
    readonly filePath: FieldRef<"Submission", 'String'>
    readonly uploadedAt: FieldRef<"Submission", 'DateTime'>
    readonly aiAnalysisResult: FieldRef<"Submission", 'Json'>
    readonly finalScore: FieldRef<"Submission", 'Int'>
    readonly teacherFeedback: FieldRef<"Submission", 'String'>
    readonly status: FieldRef<"Submission", 'SubmissionStatus'>
    readonly createdAt: FieldRef<"Submission", 'DateTime'>
    readonly updatedAt: FieldRef<"Submission", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Submission findUnique
   */
  export type SubmissionFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * Filter, which Submission to fetch.
     */
    where: SubmissionWhereUniqueInput
  }

  /**
   * Submission findUniqueOrThrow
   */
  export type SubmissionFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * Filter, which Submission to fetch.
     */
    where: SubmissionWhereUniqueInput
  }

  /**
   * Submission findFirst
   */
  export type SubmissionFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * Filter, which Submission to fetch.
     */
    where?: SubmissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Submissions to fetch.
     */
    orderBy?: SubmissionOrderByWithRelationInput | SubmissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Submissions.
     */
    cursor?: SubmissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Submissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Submissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Submissions.
     */
    distinct?: SubmissionScalarFieldEnum | SubmissionScalarFieldEnum[]
  }

  /**
   * Submission findFirstOrThrow
   */
  export type SubmissionFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * Filter, which Submission to fetch.
     */
    where?: SubmissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Submissions to fetch.
     */
    orderBy?: SubmissionOrderByWithRelationInput | SubmissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Submissions.
     */
    cursor?: SubmissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Submissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Submissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Submissions.
     */
    distinct?: SubmissionScalarFieldEnum | SubmissionScalarFieldEnum[]
  }

  /**
   * Submission findMany
   */
  export type SubmissionFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * Filter, which Submissions to fetch.
     */
    where?: SubmissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Submissions to fetch.
     */
    orderBy?: SubmissionOrderByWithRelationInput | SubmissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Submissions.
     */
    cursor?: SubmissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Submissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Submissions.
     */
    skip?: number
    distinct?: SubmissionScalarFieldEnum | SubmissionScalarFieldEnum[]
  }

  /**
   * Submission create
   */
  export type SubmissionCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * The data needed to create a Submission.
     */
    data: XOR<SubmissionCreateInput, SubmissionUncheckedCreateInput>
  }

  /**
   * Submission createMany
   */
  export type SubmissionCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many Submissions.
     */
    data: SubmissionCreateManyInput | SubmissionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Submission createManyAndReturn
   */
  export type SubmissionCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * The data used to create many Submissions.
     */
    data: SubmissionCreateManyInput | SubmissionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Submission update
   */
  export type SubmissionUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * The data needed to update a Submission.
     */
    data: XOR<SubmissionUpdateInput, SubmissionUncheckedUpdateInput>
    /**
     * Choose, which Submission to update.
     */
    where: SubmissionWhereUniqueInput
  }

  /**
   * Submission updateMany
   */
  export type SubmissionUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update Submissions.
     */
    data: XOR<SubmissionUpdateManyMutationInput, SubmissionUncheckedUpdateManyInput>
    /**
     * Filter which Submissions to update
     */
    where?: SubmissionWhereInput
    /**
     * Limit how many Submissions to update.
     */
    limit?: number
  }

  /**
   * Submission updateManyAndReturn
   */
  export type SubmissionUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * The data used to update Submissions.
     */
    data: XOR<SubmissionUpdateManyMutationInput, SubmissionUncheckedUpdateManyInput>
    /**
     * Filter which Submissions to update
     */
    where?: SubmissionWhereInput
    /**
     * Limit how many Submissions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Submission upsert
   */
  export type SubmissionUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * The filter to search for the Submission to update in case it exists.
     */
    where: SubmissionWhereUniqueInput
    /**
     * In case the Submission found by the `where` argument doesn't exist, create a new Submission with this data.
     */
    create: XOR<SubmissionCreateInput, SubmissionUncheckedCreateInput>
    /**
     * In case the Submission was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SubmissionUpdateInput, SubmissionUncheckedUpdateInput>
  }

  /**
   * Submission delete
   */
  export type SubmissionDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * Filter which Submission to delete.
     */
    where: SubmissionWhereUniqueInput
  }

  /**
   * Submission deleteMany
   */
  export type SubmissionDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Submissions to delete
     */
    where?: SubmissionWhereInput
    /**
     * Limit how many Submissions to delete.
     */
    limit?: number
  }

  /**
   * Submission without action
   */
  export type SubmissionDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
  }


  /**
   * Model Rubric
   */

  export type AggregateRubric = {
    _count: RubricCountAggregateOutputType | null
    _avg: RubricAvgAggregateOutputType | null
    _sum: RubricSumAggregateOutputType | null
    _min: RubricMinAggregateOutputType | null
    _max: RubricMaxAggregateOutputType | null
  }

  export type RubricAvgAggregateOutputType = {
    version: number | null
  }

  export type RubricSumAggregateOutputType = {
    version: number | null
  }

  export type RubricMinAggregateOutputType = {
    id: string | null
    userId: string | null
    teacherId: string | null
    name: string | null
    description: string | null
    version: number | null
    isActive: boolean | null
    isTemplate: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RubricMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    teacherId: string | null
    name: string | null
    description: string | null
    version: number | null
    isActive: boolean | null
    isTemplate: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RubricCountAggregateOutputType = {
    id: number
    userId: number
    teacherId: number
    name: number
    description: number
    version: number
    isActive: number
    isTemplate: number
    criteria: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type RubricAvgAggregateInputType = {
    version?: true
  }

  export type RubricSumAggregateInputType = {
    version?: true
  }

  export type RubricMinAggregateInputType = {
    id?: true
    userId?: true
    teacherId?: true
    name?: true
    description?: true
    version?: true
    isActive?: true
    isTemplate?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RubricMaxAggregateInputType = {
    id?: true
    userId?: true
    teacherId?: true
    name?: true
    description?: true
    version?: true
    isActive?: true
    isTemplate?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RubricCountAggregateInputType = {
    id?: true
    userId?: true
    teacherId?: true
    name?: true
    description?: true
    version?: true
    isActive?: true
    isTemplate?: true
    criteria?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type RubricAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Rubric to aggregate.
     */
    where?: RubricWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Rubrics to fetch.
     */
    orderBy?: RubricOrderByWithRelationInput | RubricOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RubricWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Rubrics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Rubrics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Rubrics
    **/
    _count?: true | RubricCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RubricAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RubricSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RubricMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RubricMaxAggregateInputType
  }

  export type GetRubricAggregateType<T extends RubricAggregateArgs> = {
        [P in keyof T & keyof AggregateRubric]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRubric[P]>
      : GetScalarType<T[P], AggregateRubric[P]>
  }




  export type RubricGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: RubricWhereInput
    orderBy?: RubricOrderByWithAggregationInput | RubricOrderByWithAggregationInput[]
    by: RubricScalarFieldEnum[] | RubricScalarFieldEnum
    having?: RubricScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RubricCountAggregateInputType | true
    _avg?: RubricAvgAggregateInputType
    _sum?: RubricSumAggregateInputType
    _min?: RubricMinAggregateInputType
    _max?: RubricMaxAggregateInputType
  }

  export type RubricGroupByOutputType = {
    id: string
    userId: string
    teacherId: string | null
    name: string
    description: string
    version: number
    isActive: boolean
    isTemplate: boolean
    criteria: JsonValue
    createdAt: Date
    updatedAt: Date
    _count: RubricCountAggregateOutputType | null
    _avg: RubricAvgAggregateOutputType | null
    _sum: RubricSumAggregateOutputType | null
    _min: RubricMinAggregateOutputType | null
    _max: RubricMaxAggregateOutputType | null
  }

  type GetRubricGroupByPayload<T extends RubricGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RubricGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RubricGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RubricGroupByOutputType[P]>
            : GetScalarType<T[P], RubricGroupByOutputType[P]>
        }
      >
    >


  export type RubricSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    teacherId?: boolean
    name?: boolean
    description?: boolean
    version?: boolean
    isActive?: boolean
    isTemplate?: boolean
    criteria?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    teacher?: boolean | Rubric$teacherArgs<ExtArgs>
    gradingResults?: boolean | Rubric$gradingResultsArgs<ExtArgs>
    assignmentAreas?: boolean | Rubric$assignmentAreasArgs<ExtArgs>
    _count?: boolean | RubricCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["rubric"]>

  export type RubricSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    teacherId?: boolean
    name?: boolean
    description?: boolean
    version?: boolean
    isActive?: boolean
    isTemplate?: boolean
    criteria?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    teacher?: boolean | Rubric$teacherArgs<ExtArgs>
  }, ExtArgs["result"]["rubric"]>

  export type RubricSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    teacherId?: boolean
    name?: boolean
    description?: boolean
    version?: boolean
    isActive?: boolean
    isTemplate?: boolean
    criteria?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    teacher?: boolean | Rubric$teacherArgs<ExtArgs>
  }, ExtArgs["result"]["rubric"]>

  export type RubricSelectScalar = {
    id?: boolean
    userId?: boolean
    teacherId?: boolean
    name?: boolean
    description?: boolean
    version?: boolean
    isActive?: boolean
    isTemplate?: boolean
    criteria?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type RubricOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "userId" | "teacherId" | "name" | "description" | "version" | "isActive" | "isTemplate" | "criteria" | "createdAt" | "updatedAt", ExtArgs["result"]["rubric"]>
  export type RubricInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    teacher?: boolean | Rubric$teacherArgs<ExtArgs>
    gradingResults?: boolean | Rubric$gradingResultsArgs<ExtArgs>
    assignmentAreas?: boolean | Rubric$assignmentAreasArgs<ExtArgs>
    _count?: boolean | RubricCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type RubricIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    teacher?: boolean | Rubric$teacherArgs<ExtArgs>
  }
  export type RubricIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    teacher?: boolean | Rubric$teacherArgs<ExtArgs>
  }

  export type $RubricPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Rubric"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      teacher: Prisma.$UserPayload<ExtArgs> | null
      gradingResults: Prisma.$GradingResultPayload<ExtArgs>[]
      assignmentAreas: Prisma.$AssignmentAreaPayload<ExtArgs>[]
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      userId: string
      teacherId: string | null
      name: string
      description: string
      version: number
      isActive: boolean
      isTemplate: boolean
      criteria: Prisma.JsonValue
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["rubric"]>
    composites: {}
  }

  export type RubricGetPayload<S extends boolean | null | undefined | RubricDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$RubricPayload, S>

  export type RubricCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
    Omit<RubricFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: RubricCountAggregateInputType | true
    }

  export interface RubricDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Rubric'], meta: { name: 'Rubric' } }
    /**
     * Find zero or one Rubric that matches the filter.
     * @param {RubricFindUniqueArgs} args - Arguments to find a Rubric
     * @example
     * // Get one Rubric
     * const rubric = await prisma.rubric.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RubricFindUniqueArgs>(args: SelectSubset<T, RubricFindUniqueArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Rubric that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {RubricFindUniqueOrThrowArgs} args - Arguments to find a Rubric
     * @example
     * // Get one Rubric
     * const rubric = await prisma.rubric.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RubricFindUniqueOrThrowArgs>(args: SelectSubset<T, RubricFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Rubric that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricFindFirstArgs} args - Arguments to find a Rubric
     * @example
     * // Get one Rubric
     * const rubric = await prisma.rubric.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RubricFindFirstArgs>(args?: SelectSubset<T, RubricFindFirstArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Rubric that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricFindFirstOrThrowArgs} args - Arguments to find a Rubric
     * @example
     * // Get one Rubric
     * const rubric = await prisma.rubric.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RubricFindFirstOrThrowArgs>(args?: SelectSubset<T, RubricFindFirstOrThrowArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Rubrics that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Rubrics
     * const rubrics = await prisma.rubric.findMany()
     * 
     * // Get first 10 Rubrics
     * const rubrics = await prisma.rubric.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const rubricWithIdOnly = await prisma.rubric.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RubricFindManyArgs>(args?: SelectSubset<T, RubricFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Rubric.
     * @param {RubricCreateArgs} args - Arguments to create a Rubric.
     * @example
     * // Create one Rubric
     * const Rubric = await prisma.rubric.create({
     *   data: {
     *     // ... data to create a Rubric
     *   }
     * })
     * 
     */
    create<T extends RubricCreateArgs>(args: SelectSubset<T, RubricCreateArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Rubrics.
     * @param {RubricCreateManyArgs} args - Arguments to create many Rubrics.
     * @example
     * // Create many Rubrics
     * const rubric = await prisma.rubric.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RubricCreateManyArgs>(args?: SelectSubset<T, RubricCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Rubrics and returns the data saved in the database.
     * @param {RubricCreateManyAndReturnArgs} args - Arguments to create many Rubrics.
     * @example
     * // Create many Rubrics
     * const rubric = await prisma.rubric.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Rubrics and only return the `id`
     * const rubricWithIdOnly = await prisma.rubric.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RubricCreateManyAndReturnArgs>(args?: SelectSubset<T, RubricCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Rubric.
     * @param {RubricDeleteArgs} args - Arguments to delete one Rubric.
     * @example
     * // Delete one Rubric
     * const Rubric = await prisma.rubric.delete({
     *   where: {
     *     // ... filter to delete one Rubric
     *   }
     * })
     * 
     */
    delete<T extends RubricDeleteArgs>(args: SelectSubset<T, RubricDeleteArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Rubric.
     * @param {RubricUpdateArgs} args - Arguments to update one Rubric.
     * @example
     * // Update one Rubric
     * const rubric = await prisma.rubric.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RubricUpdateArgs>(args: SelectSubset<T, RubricUpdateArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Rubrics.
     * @param {RubricDeleteManyArgs} args - Arguments to filter Rubrics to delete.
     * @example
     * // Delete a few Rubrics
     * const { count } = await prisma.rubric.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RubricDeleteManyArgs>(args?: SelectSubset<T, RubricDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Rubrics.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Rubrics
     * const rubric = await prisma.rubric.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RubricUpdateManyArgs>(args: SelectSubset<T, RubricUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Rubrics and returns the data updated in the database.
     * @param {RubricUpdateManyAndReturnArgs} args - Arguments to update many Rubrics.
     * @example
     * // Update many Rubrics
     * const rubric = await prisma.rubric.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Rubrics and only return the `id`
     * const rubricWithIdOnly = await prisma.rubric.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends RubricUpdateManyAndReturnArgs>(args: SelectSubset<T, RubricUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Rubric.
     * @param {RubricUpsertArgs} args - Arguments to update or create a Rubric.
     * @example
     * // Update or create a Rubric
     * const rubric = await prisma.rubric.upsert({
     *   create: {
     *     // ... data to create a Rubric
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Rubric we want to update
     *   }
     * })
     */
    upsert<T extends RubricUpsertArgs>(args: SelectSubset<T, RubricUpsertArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Rubrics.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricCountArgs} args - Arguments to filter Rubrics to count.
     * @example
     * // Count the number of Rubrics
     * const count = await prisma.rubric.count({
     *   where: {
     *     // ... the filter for the Rubrics we want to count
     *   }
     * })
    **/
    count<T extends RubricCountArgs>(
      args?: Subset<T, RubricCountArgs>,
    ): Prisma.PrismaPromise<
      T extends runtime.Types.Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RubricCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Rubric.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends RubricAggregateArgs>(args: Subset<T, RubricAggregateArgs>): Prisma.PrismaPromise<GetRubricAggregateType<T>>

    /**
     * Group by Rubric.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RubricGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends RubricGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RubricGroupByArgs['orderBy'] }
        : { orderBy?: RubricGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, RubricGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRubricGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Rubric model
   */
  readonly fields: RubricFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Rubric.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RubricClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    teacher<T extends Rubric$teacherArgs<ExtArgs> = {}>(args?: Subset<T, Rubric$teacherArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    gradingResults<T extends Rubric$gradingResultsArgs<ExtArgs> = {}>(args?: Subset<T, Rubric$gradingResultsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$GradingResultPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    assignmentAreas<T extends Rubric$assignmentAreasArgs<ExtArgs> = {}>(args?: Subset<T, Rubric$assignmentAreasArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$AssignmentAreaPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>
  }




  /**
   * Fields of the Rubric model
   */
  export interface RubricFieldRefs {
    readonly id: FieldRef<"Rubric", 'String'>
    readonly userId: FieldRef<"Rubric", 'String'>
    readonly teacherId: FieldRef<"Rubric", 'String'>
    readonly name: FieldRef<"Rubric", 'String'>
    readonly description: FieldRef<"Rubric", 'String'>
    readonly version: FieldRef<"Rubric", 'Int'>
    readonly isActive: FieldRef<"Rubric", 'Boolean'>
    readonly isTemplate: FieldRef<"Rubric", 'Boolean'>
    readonly criteria: FieldRef<"Rubric", 'Json'>
    readonly createdAt: FieldRef<"Rubric", 'DateTime'>
    readonly updatedAt: FieldRef<"Rubric", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Rubric findUnique
   */
  export type RubricFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * Filter, which Rubric to fetch.
     */
    where: RubricWhereUniqueInput
  }

  /**
   * Rubric findUniqueOrThrow
   */
  export type RubricFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * Filter, which Rubric to fetch.
     */
    where: RubricWhereUniqueInput
  }

  /**
   * Rubric findFirst
   */
  export type RubricFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * Filter, which Rubric to fetch.
     */
    where?: RubricWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Rubrics to fetch.
     */
    orderBy?: RubricOrderByWithRelationInput | RubricOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Rubrics.
     */
    cursor?: RubricWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Rubrics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Rubrics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Rubrics.
     */
    distinct?: RubricScalarFieldEnum | RubricScalarFieldEnum[]
  }

  /**
   * Rubric findFirstOrThrow
   */
  export type RubricFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * Filter, which Rubric to fetch.
     */
    where?: RubricWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Rubrics to fetch.
     */
    orderBy?: RubricOrderByWithRelationInput | RubricOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Rubrics.
     */
    cursor?: RubricWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Rubrics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Rubrics.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Rubrics.
     */
    distinct?: RubricScalarFieldEnum | RubricScalarFieldEnum[]
  }

  /**
   * Rubric findMany
   */
  export type RubricFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * Filter, which Rubrics to fetch.
     */
    where?: RubricWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Rubrics to fetch.
     */
    orderBy?: RubricOrderByWithRelationInput | RubricOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Rubrics.
     */
    cursor?: RubricWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Rubrics from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Rubrics.
     */
    skip?: number
    distinct?: RubricScalarFieldEnum | RubricScalarFieldEnum[]
  }

  /**
   * Rubric create
   */
  export type RubricCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * The data needed to create a Rubric.
     */
    data: XOR<RubricCreateInput, RubricUncheckedCreateInput>
  }

  /**
   * Rubric createMany
   */
  export type RubricCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many Rubrics.
     */
    data: RubricCreateManyInput | RubricCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Rubric createManyAndReturn
   */
  export type RubricCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * The data used to create many Rubrics.
     */
    data: RubricCreateManyInput | RubricCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Rubric update
   */
  export type RubricUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * The data needed to update a Rubric.
     */
    data: XOR<RubricUpdateInput, RubricUncheckedUpdateInput>
    /**
     * Choose, which Rubric to update.
     */
    where: RubricWhereUniqueInput
  }

  /**
   * Rubric updateMany
   */
  export type RubricUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update Rubrics.
     */
    data: XOR<RubricUpdateManyMutationInput, RubricUncheckedUpdateManyInput>
    /**
     * Filter which Rubrics to update
     */
    where?: RubricWhereInput
    /**
     * Limit how many Rubrics to update.
     */
    limit?: number
  }

  /**
   * Rubric updateManyAndReturn
   */
  export type RubricUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * The data used to update Rubrics.
     */
    data: XOR<RubricUpdateManyMutationInput, RubricUncheckedUpdateManyInput>
    /**
     * Filter which Rubrics to update
     */
    where?: RubricWhereInput
    /**
     * Limit how many Rubrics to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Rubric upsert
   */
  export type RubricUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * The filter to search for the Rubric to update in case it exists.
     */
    where: RubricWhereUniqueInput
    /**
     * In case the Rubric found by the `where` argument doesn't exist, create a new Rubric with this data.
     */
    create: XOR<RubricCreateInput, RubricUncheckedCreateInput>
    /**
     * In case the Rubric was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RubricUpdateInput, RubricUncheckedUpdateInput>
  }

  /**
   * Rubric delete
   */
  export type RubricDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
    /**
     * Filter which Rubric to delete.
     */
    where: RubricWhereUniqueInput
  }

  /**
   * Rubric deleteMany
   */
  export type RubricDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Rubrics to delete
     */
    where?: RubricWhereInput
    /**
     * Limit how many Rubrics to delete.
     */
    limit?: number
  }

  /**
   * Rubric.teacher
   */
  export type Rubric$teacherArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Rubric.gradingResults
   */
  export type Rubric$gradingResultsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingResult
     */
    select?: GradingResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingResult
     */
    omit?: GradingResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingResultInclude<ExtArgs> | null
    where?: GradingResultWhereInput
    orderBy?: GradingResultOrderByWithRelationInput | GradingResultOrderByWithRelationInput[]
    cursor?: GradingResultWhereUniqueInput
    take?: number
    skip?: number
    distinct?: GradingResultScalarFieldEnum | GradingResultScalarFieldEnum[]
  }

  /**
   * Rubric.assignmentAreas
   */
  export type Rubric$assignmentAreasArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AssignmentArea
     */
    select?: AssignmentAreaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AssignmentArea
     */
    omit?: AssignmentAreaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AssignmentAreaInclude<ExtArgs> | null
    where?: AssignmentAreaWhereInput
    orderBy?: AssignmentAreaOrderByWithRelationInput | AssignmentAreaOrderByWithRelationInput[]
    cursor?: AssignmentAreaWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AssignmentAreaScalarFieldEnum | AssignmentAreaScalarFieldEnum[]
  }

  /**
   * Rubric without action
   */
  export type RubricDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Rubric
     */
    select?: RubricSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Rubric
     */
    omit?: RubricOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: RubricInclude<ExtArgs> | null
  }


  /**
   * Model GradingSession
   */

  export type AggregateGradingSession = {
    _count: GradingSessionCountAggregateOutputType | null
    _avg: GradingSessionAvgAggregateOutputType | null
    _sum: GradingSessionSumAggregateOutputType | null
    _min: GradingSessionMinAggregateOutputType | null
    _max: GradingSessionMaxAggregateOutputType | null
  }

  export type GradingSessionAvgAggregateOutputType = {
    progress: number | null
  }

  export type GradingSessionSumAggregateOutputType = {
    progress: number | null
  }

  export type GradingSessionMinAggregateOutputType = {
    id: string | null
    userId: string | null
    status: $Enums.GradingSessionStatus | null
    progress: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type GradingSessionMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    status: $Enums.GradingSessionStatus | null
    progress: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type GradingSessionCountAggregateOutputType = {
    id: number
    userId: number
    status: number
    progress: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type GradingSessionAvgAggregateInputType = {
    progress?: true
  }

  export type GradingSessionSumAggregateInputType = {
    progress?: true
  }

  export type GradingSessionMinAggregateInputType = {
    id?: true
    userId?: true
    status?: true
    progress?: true
    createdAt?: true
    updatedAt?: true
  }

  export type GradingSessionMaxAggregateInputType = {
    id?: true
    userId?: true
    status?: true
    progress?: true
    createdAt?: true
    updatedAt?: true
  }

  export type GradingSessionCountAggregateInputType = {
    id?: true
    userId?: true
    status?: true
    progress?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type GradingSessionAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which GradingSession to aggregate.
     */
    where?: GradingSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GradingSessions to fetch.
     */
    orderBy?: GradingSessionOrderByWithRelationInput | GradingSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: GradingSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GradingSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GradingSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned GradingSessions
    **/
    _count?: true | GradingSessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: GradingSessionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: GradingSessionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: GradingSessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: GradingSessionMaxAggregateInputType
  }

  export type GetGradingSessionAggregateType<T extends GradingSessionAggregateArgs> = {
        [P in keyof T & keyof AggregateGradingSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGradingSession[P]>
      : GetScalarType<T[P], AggregateGradingSession[P]>
  }




  export type GradingSessionGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: GradingSessionWhereInput
    orderBy?: GradingSessionOrderByWithAggregationInput | GradingSessionOrderByWithAggregationInput[]
    by: GradingSessionScalarFieldEnum[] | GradingSessionScalarFieldEnum
    having?: GradingSessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: GradingSessionCountAggregateInputType | true
    _avg?: GradingSessionAvgAggregateInputType
    _sum?: GradingSessionSumAggregateInputType
    _min?: GradingSessionMinAggregateInputType
    _max?: GradingSessionMaxAggregateInputType
  }

  export type GradingSessionGroupByOutputType = {
    id: string
    userId: string
    status: $Enums.GradingSessionStatus
    progress: number
    createdAt: Date
    updatedAt: Date
    _count: GradingSessionCountAggregateOutputType | null
    _avg: GradingSessionAvgAggregateOutputType | null
    _sum: GradingSessionSumAggregateOutputType | null
    _min: GradingSessionMinAggregateOutputType | null
    _max: GradingSessionMaxAggregateOutputType | null
  }

  type GetGradingSessionGroupByPayload<T extends GradingSessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GradingSessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof GradingSessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], GradingSessionGroupByOutputType[P]>
            : GetScalarType<T[P], GradingSessionGroupByOutputType[P]>
        }
      >
    >


  export type GradingSessionSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    status?: boolean
    progress?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    gradingResults?: boolean | GradingSession$gradingResultsArgs<ExtArgs>
    _count?: boolean | GradingSessionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gradingSession"]>

  export type GradingSessionSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    status?: boolean
    progress?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gradingSession"]>

  export type GradingSessionSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    status?: boolean
    progress?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gradingSession"]>

  export type GradingSessionSelectScalar = {
    id?: boolean
    userId?: boolean
    status?: boolean
    progress?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type GradingSessionOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "userId" | "status" | "progress" | "createdAt" | "updatedAt", ExtArgs["result"]["gradingSession"]>
  export type GradingSessionInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    gradingResults?: boolean | GradingSession$gradingResultsArgs<ExtArgs>
    _count?: boolean | GradingSessionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type GradingSessionIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type GradingSessionIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $GradingSessionPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "GradingSession"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      gradingResults: Prisma.$GradingResultPayload<ExtArgs>[]
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      userId: string
      status: $Enums.GradingSessionStatus
      progress: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["gradingSession"]>
    composites: {}
  }

  export type GradingSessionGetPayload<S extends boolean | null | undefined | GradingSessionDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$GradingSessionPayload, S>

  export type GradingSessionCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
    Omit<GradingSessionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: GradingSessionCountAggregateInputType | true
    }

  export interface GradingSessionDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['GradingSession'], meta: { name: 'GradingSession' } }
    /**
     * Find zero or one GradingSession that matches the filter.
     * @param {GradingSessionFindUniqueArgs} args - Arguments to find a GradingSession
     * @example
     * // Get one GradingSession
     * const gradingSession = await prisma.gradingSession.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends GradingSessionFindUniqueArgs>(args: SelectSubset<T, GradingSessionFindUniqueArgs<ExtArgs>>): Prisma__GradingSessionClient<runtime.Types.Result.GetResult<Prisma.$GradingSessionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one GradingSession that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {GradingSessionFindUniqueOrThrowArgs} args - Arguments to find a GradingSession
     * @example
     * // Get one GradingSession
     * const gradingSession = await prisma.gradingSession.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends GradingSessionFindUniqueOrThrowArgs>(args: SelectSubset<T, GradingSessionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__GradingSessionClient<runtime.Types.Result.GetResult<Prisma.$GradingSessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first GradingSession that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingSessionFindFirstArgs} args - Arguments to find a GradingSession
     * @example
     * // Get one GradingSession
     * const gradingSession = await prisma.gradingSession.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends GradingSessionFindFirstArgs>(args?: SelectSubset<T, GradingSessionFindFirstArgs<ExtArgs>>): Prisma__GradingSessionClient<runtime.Types.Result.GetResult<Prisma.$GradingSessionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first GradingSession that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingSessionFindFirstOrThrowArgs} args - Arguments to find a GradingSession
     * @example
     * // Get one GradingSession
     * const gradingSession = await prisma.gradingSession.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends GradingSessionFindFirstOrThrowArgs>(args?: SelectSubset<T, GradingSessionFindFirstOrThrowArgs<ExtArgs>>): Prisma__GradingSessionClient<runtime.Types.Result.GetResult<Prisma.$GradingSessionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more GradingSessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingSessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all GradingSessions
     * const gradingSessions = await prisma.gradingSession.findMany()
     * 
     * // Get first 10 GradingSessions
     * const gradingSessions = await prisma.gradingSession.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const gradingSessionWithIdOnly = await prisma.gradingSession.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends GradingSessionFindManyArgs>(args?: SelectSubset<T, GradingSessionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$GradingSessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a GradingSession.
     * @param {GradingSessionCreateArgs} args - Arguments to create a GradingSession.
     * @example
     * // Create one GradingSession
     * const GradingSession = await prisma.gradingSession.create({
     *   data: {
     *     // ... data to create a GradingSession
     *   }
     * })
     * 
     */
    create<T extends GradingSessionCreateArgs>(args: SelectSubset<T, GradingSessionCreateArgs<ExtArgs>>): Prisma__GradingSessionClient<runtime.Types.Result.GetResult<Prisma.$GradingSessionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many GradingSessions.
     * @param {GradingSessionCreateManyArgs} args - Arguments to create many GradingSessions.
     * @example
     * // Create many GradingSessions
     * const gradingSession = await prisma.gradingSession.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends GradingSessionCreateManyArgs>(args?: SelectSubset<T, GradingSessionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many GradingSessions and returns the data saved in the database.
     * @param {GradingSessionCreateManyAndReturnArgs} args - Arguments to create many GradingSessions.
     * @example
     * // Create many GradingSessions
     * const gradingSession = await prisma.gradingSession.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many GradingSessions and only return the `id`
     * const gradingSessionWithIdOnly = await prisma.gradingSession.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends GradingSessionCreateManyAndReturnArgs>(args?: SelectSubset<T, GradingSessionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$GradingSessionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a GradingSession.
     * @param {GradingSessionDeleteArgs} args - Arguments to delete one GradingSession.
     * @example
     * // Delete one GradingSession
     * const GradingSession = await prisma.gradingSession.delete({
     *   where: {
     *     // ... filter to delete one GradingSession
     *   }
     * })
     * 
     */
    delete<T extends GradingSessionDeleteArgs>(args: SelectSubset<T, GradingSessionDeleteArgs<ExtArgs>>): Prisma__GradingSessionClient<runtime.Types.Result.GetResult<Prisma.$GradingSessionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one GradingSession.
     * @param {GradingSessionUpdateArgs} args - Arguments to update one GradingSession.
     * @example
     * // Update one GradingSession
     * const gradingSession = await prisma.gradingSession.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends GradingSessionUpdateArgs>(args: SelectSubset<T, GradingSessionUpdateArgs<ExtArgs>>): Prisma__GradingSessionClient<runtime.Types.Result.GetResult<Prisma.$GradingSessionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more GradingSessions.
     * @param {GradingSessionDeleteManyArgs} args - Arguments to filter GradingSessions to delete.
     * @example
     * // Delete a few GradingSessions
     * const { count } = await prisma.gradingSession.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends GradingSessionDeleteManyArgs>(args?: SelectSubset<T, GradingSessionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GradingSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingSessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many GradingSessions
     * const gradingSession = await prisma.gradingSession.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends GradingSessionUpdateManyArgs>(args: SelectSubset<T, GradingSessionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GradingSessions and returns the data updated in the database.
     * @param {GradingSessionUpdateManyAndReturnArgs} args - Arguments to update many GradingSessions.
     * @example
     * // Update many GradingSessions
     * const gradingSession = await prisma.gradingSession.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more GradingSessions and only return the `id`
     * const gradingSessionWithIdOnly = await prisma.gradingSession.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends GradingSessionUpdateManyAndReturnArgs>(args: SelectSubset<T, GradingSessionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$GradingSessionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one GradingSession.
     * @param {GradingSessionUpsertArgs} args - Arguments to update or create a GradingSession.
     * @example
     * // Update or create a GradingSession
     * const gradingSession = await prisma.gradingSession.upsert({
     *   create: {
     *     // ... data to create a GradingSession
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the GradingSession we want to update
     *   }
     * })
     */
    upsert<T extends GradingSessionUpsertArgs>(args: SelectSubset<T, GradingSessionUpsertArgs<ExtArgs>>): Prisma__GradingSessionClient<runtime.Types.Result.GetResult<Prisma.$GradingSessionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of GradingSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingSessionCountArgs} args - Arguments to filter GradingSessions to count.
     * @example
     * // Count the number of GradingSessions
     * const count = await prisma.gradingSession.count({
     *   where: {
     *     // ... the filter for the GradingSessions we want to count
     *   }
     * })
    **/
    count<T extends GradingSessionCountArgs>(
      args?: Subset<T, GradingSessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends runtime.Types.Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GradingSessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a GradingSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingSessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends GradingSessionAggregateArgs>(args: Subset<T, GradingSessionAggregateArgs>): Prisma.PrismaPromise<GetGradingSessionAggregateType<T>>

    /**
     * Group by GradingSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingSessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends GradingSessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: GradingSessionGroupByArgs['orderBy'] }
        : { orderBy?: GradingSessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, GradingSessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGradingSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the GradingSession model
   */
  readonly fields: GradingSessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for GradingSession.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__GradingSessionClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    gradingResults<T extends GradingSession$gradingResultsArgs<ExtArgs> = {}>(args?: Subset<T, GradingSession$gradingResultsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$GradingResultPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>
  }




  /**
   * Fields of the GradingSession model
   */
  export interface GradingSessionFieldRefs {
    readonly id: FieldRef<"GradingSession", 'String'>
    readonly userId: FieldRef<"GradingSession", 'String'>
    readonly status: FieldRef<"GradingSession", 'GradingSessionStatus'>
    readonly progress: FieldRef<"GradingSession", 'Int'>
    readonly createdAt: FieldRef<"GradingSession", 'DateTime'>
    readonly updatedAt: FieldRef<"GradingSession", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * GradingSession findUnique
   */
  export type GradingSessionFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingSession
     */
    select?: GradingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingSession
     */
    omit?: GradingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingSessionInclude<ExtArgs> | null
    /**
     * Filter, which GradingSession to fetch.
     */
    where: GradingSessionWhereUniqueInput
  }

  /**
   * GradingSession findUniqueOrThrow
   */
  export type GradingSessionFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingSession
     */
    select?: GradingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingSession
     */
    omit?: GradingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingSessionInclude<ExtArgs> | null
    /**
     * Filter, which GradingSession to fetch.
     */
    where: GradingSessionWhereUniqueInput
  }

  /**
   * GradingSession findFirst
   */
  export type GradingSessionFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingSession
     */
    select?: GradingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingSession
     */
    omit?: GradingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingSessionInclude<ExtArgs> | null
    /**
     * Filter, which GradingSession to fetch.
     */
    where?: GradingSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GradingSessions to fetch.
     */
    orderBy?: GradingSessionOrderByWithRelationInput | GradingSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GradingSessions.
     */
    cursor?: GradingSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GradingSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GradingSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GradingSessions.
     */
    distinct?: GradingSessionScalarFieldEnum | GradingSessionScalarFieldEnum[]
  }

  /**
   * GradingSession findFirstOrThrow
   */
  export type GradingSessionFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingSession
     */
    select?: GradingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingSession
     */
    omit?: GradingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingSessionInclude<ExtArgs> | null
    /**
     * Filter, which GradingSession to fetch.
     */
    where?: GradingSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GradingSessions to fetch.
     */
    orderBy?: GradingSessionOrderByWithRelationInput | GradingSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GradingSessions.
     */
    cursor?: GradingSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GradingSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GradingSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GradingSessions.
     */
    distinct?: GradingSessionScalarFieldEnum | GradingSessionScalarFieldEnum[]
  }

  /**
   * GradingSession findMany
   */
  export type GradingSessionFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingSession
     */
    select?: GradingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingSession
     */
    omit?: GradingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingSessionInclude<ExtArgs> | null
    /**
     * Filter, which GradingSessions to fetch.
     */
    where?: GradingSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GradingSessions to fetch.
     */
    orderBy?: GradingSessionOrderByWithRelationInput | GradingSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing GradingSessions.
     */
    cursor?: GradingSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GradingSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GradingSessions.
     */
    skip?: number
    distinct?: GradingSessionScalarFieldEnum | GradingSessionScalarFieldEnum[]
  }

  /**
   * GradingSession create
   */
  export type GradingSessionCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingSession
     */
    select?: GradingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingSession
     */
    omit?: GradingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingSessionInclude<ExtArgs> | null
    /**
     * The data needed to create a GradingSession.
     */
    data: XOR<GradingSessionCreateInput, GradingSessionUncheckedCreateInput>
  }

  /**
   * GradingSession createMany
   */
  export type GradingSessionCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many GradingSessions.
     */
    data: GradingSessionCreateManyInput | GradingSessionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * GradingSession createManyAndReturn
   */
  export type GradingSessionCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingSession
     */
    select?: GradingSessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the GradingSession
     */
    omit?: GradingSessionOmit<ExtArgs> | null
    /**
     * The data used to create many GradingSessions.
     */
    data: GradingSessionCreateManyInput | GradingSessionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingSessionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * GradingSession update
   */
  export type GradingSessionUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingSession
     */
    select?: GradingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingSession
     */
    omit?: GradingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingSessionInclude<ExtArgs> | null
    /**
     * The data needed to update a GradingSession.
     */
    data: XOR<GradingSessionUpdateInput, GradingSessionUncheckedUpdateInput>
    /**
     * Choose, which GradingSession to update.
     */
    where: GradingSessionWhereUniqueInput
  }

  /**
   * GradingSession updateMany
   */
  export type GradingSessionUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update GradingSessions.
     */
    data: XOR<GradingSessionUpdateManyMutationInput, GradingSessionUncheckedUpdateManyInput>
    /**
     * Filter which GradingSessions to update
     */
    where?: GradingSessionWhereInput
    /**
     * Limit how many GradingSessions to update.
     */
    limit?: number
  }

  /**
   * GradingSession updateManyAndReturn
   */
  export type GradingSessionUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingSession
     */
    select?: GradingSessionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the GradingSession
     */
    omit?: GradingSessionOmit<ExtArgs> | null
    /**
     * The data used to update GradingSessions.
     */
    data: XOR<GradingSessionUpdateManyMutationInput, GradingSessionUncheckedUpdateManyInput>
    /**
     * Filter which GradingSessions to update
     */
    where?: GradingSessionWhereInput
    /**
     * Limit how many GradingSessions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingSessionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * GradingSession upsert
   */
  export type GradingSessionUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingSession
     */
    select?: GradingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingSession
     */
    omit?: GradingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingSessionInclude<ExtArgs> | null
    /**
     * The filter to search for the GradingSession to update in case it exists.
     */
    where: GradingSessionWhereUniqueInput
    /**
     * In case the GradingSession found by the `where` argument doesn't exist, create a new GradingSession with this data.
     */
    create: XOR<GradingSessionCreateInput, GradingSessionUncheckedCreateInput>
    /**
     * In case the GradingSession was found with the provided `where` argument, update it with this data.
     */
    update: XOR<GradingSessionUpdateInput, GradingSessionUncheckedUpdateInput>
  }

  /**
   * GradingSession delete
   */
  export type GradingSessionDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingSession
     */
    select?: GradingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingSession
     */
    omit?: GradingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingSessionInclude<ExtArgs> | null
    /**
     * Filter which GradingSession to delete.
     */
    where: GradingSessionWhereUniqueInput
  }

  /**
   * GradingSession deleteMany
   */
  export type GradingSessionDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which GradingSessions to delete
     */
    where?: GradingSessionWhereInput
    /**
     * Limit how many GradingSessions to delete.
     */
    limit?: number
  }

  /**
   * GradingSession.gradingResults
   */
  export type GradingSession$gradingResultsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingResult
     */
    select?: GradingResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingResult
     */
    omit?: GradingResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingResultInclude<ExtArgs> | null
    where?: GradingResultWhereInput
    orderBy?: GradingResultOrderByWithRelationInput | GradingResultOrderByWithRelationInput[]
    cursor?: GradingResultWhereUniqueInput
    take?: number
    skip?: number
    distinct?: GradingResultScalarFieldEnum | GradingResultScalarFieldEnum[]
  }

  /**
   * GradingSession without action
   */
  export type GradingSessionDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingSession
     */
    select?: GradingSessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingSession
     */
    omit?: GradingSessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingSessionInclude<ExtArgs> | null
  }


  /**
   * Model UploadedFile
   */

  export type AggregateUploadedFile = {
    _count: UploadedFileCountAggregateOutputType | null
    _avg: UploadedFileAvgAggregateOutputType | null
    _sum: UploadedFileSumAggregateOutputType | null
    _min: UploadedFileMinAggregateOutputType | null
    _max: UploadedFileMaxAggregateOutputType | null
  }

  export type UploadedFileAvgAggregateOutputType = {
    fileSize: number | null
  }

  export type UploadedFileSumAggregateOutputType = {
    fileSize: number | null
  }

  export type UploadedFileMinAggregateOutputType = {
    id: string | null
    userId: string | null
    fileName: string | null
    originalFileName: string | null
    fileKey: string | null
    fileSize: number | null
    mimeType: string | null
    parseStatus: $Enums.FileParseStatus | null
    parsedContent: string | null
    parseError: string | null
    isDeleted: boolean | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
    expiresAt: Date | null
  }

  export type UploadedFileMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    fileName: string | null
    originalFileName: string | null
    fileKey: string | null
    fileSize: number | null
    mimeType: string | null
    parseStatus: $Enums.FileParseStatus | null
    parsedContent: string | null
    parseError: string | null
    isDeleted: boolean | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
    expiresAt: Date | null
  }

  export type UploadedFileCountAggregateOutputType = {
    id: number
    userId: number
    fileName: number
    originalFileName: number
    fileKey: number
    fileSize: number
    mimeType: number
    parseStatus: number
    parsedContent: number
    parseError: number
    isDeleted: number
    deletedAt: number
    createdAt: number
    updatedAt: number
    expiresAt: number
    _all: number
  }


  export type UploadedFileAvgAggregateInputType = {
    fileSize?: true
  }

  export type UploadedFileSumAggregateInputType = {
    fileSize?: true
  }

  export type UploadedFileMinAggregateInputType = {
    id?: true
    userId?: true
    fileName?: true
    originalFileName?: true
    fileKey?: true
    fileSize?: true
    mimeType?: true
    parseStatus?: true
    parsedContent?: true
    parseError?: true
    isDeleted?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    expiresAt?: true
  }

  export type UploadedFileMaxAggregateInputType = {
    id?: true
    userId?: true
    fileName?: true
    originalFileName?: true
    fileKey?: true
    fileSize?: true
    mimeType?: true
    parseStatus?: true
    parsedContent?: true
    parseError?: true
    isDeleted?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    expiresAt?: true
  }

  export type UploadedFileCountAggregateInputType = {
    id?: true
    userId?: true
    fileName?: true
    originalFileName?: true
    fileKey?: true
    fileSize?: true
    mimeType?: true
    parseStatus?: true
    parsedContent?: true
    parseError?: true
    isDeleted?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    expiresAt?: true
    _all?: true
  }

  export type UploadedFileAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which UploadedFile to aggregate.
     */
    where?: UploadedFileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UploadedFiles to fetch.
     */
    orderBy?: UploadedFileOrderByWithRelationInput | UploadedFileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UploadedFileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UploadedFiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UploadedFiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned UploadedFiles
    **/
    _count?: true | UploadedFileCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UploadedFileAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UploadedFileSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UploadedFileMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UploadedFileMaxAggregateInputType
  }

  export type GetUploadedFileAggregateType<T extends UploadedFileAggregateArgs> = {
        [P in keyof T & keyof AggregateUploadedFile]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUploadedFile[P]>
      : GetScalarType<T[P], AggregateUploadedFile[P]>
  }




  export type UploadedFileGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: UploadedFileWhereInput
    orderBy?: UploadedFileOrderByWithAggregationInput | UploadedFileOrderByWithAggregationInput[]
    by: UploadedFileScalarFieldEnum[] | UploadedFileScalarFieldEnum
    having?: UploadedFileScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UploadedFileCountAggregateInputType | true
    _avg?: UploadedFileAvgAggregateInputType
    _sum?: UploadedFileSumAggregateInputType
    _min?: UploadedFileMinAggregateInputType
    _max?: UploadedFileMaxAggregateInputType
  }

  export type UploadedFileGroupByOutputType = {
    id: string
    userId: string
    fileName: string
    originalFileName: string
    fileKey: string
    fileSize: number
    mimeType: string
    parseStatus: $Enums.FileParseStatus
    parsedContent: string | null
    parseError: string | null
    isDeleted: boolean
    deletedAt: Date | null
    createdAt: Date
    updatedAt: Date
    expiresAt: Date | null
    _count: UploadedFileCountAggregateOutputType | null
    _avg: UploadedFileAvgAggregateOutputType | null
    _sum: UploadedFileSumAggregateOutputType | null
    _min: UploadedFileMinAggregateOutputType | null
    _max: UploadedFileMaxAggregateOutputType | null
  }

  type GetUploadedFileGroupByPayload<T extends UploadedFileGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UploadedFileGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UploadedFileGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UploadedFileGroupByOutputType[P]>
            : GetScalarType<T[P], UploadedFileGroupByOutputType[P]>
        }
      >
    >


  export type UploadedFileSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    fileName?: boolean
    originalFileName?: boolean
    fileKey?: boolean
    fileSize?: boolean
    mimeType?: boolean
    parseStatus?: boolean
    parsedContent?: boolean
    parseError?: boolean
    isDeleted?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    expiresAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    gradingResults?: boolean | UploadedFile$gradingResultsArgs<ExtArgs>
    _count?: boolean | UploadedFileCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["uploadedFile"]>

  export type UploadedFileSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    fileName?: boolean
    originalFileName?: boolean
    fileKey?: boolean
    fileSize?: boolean
    mimeType?: boolean
    parseStatus?: boolean
    parsedContent?: boolean
    parseError?: boolean
    isDeleted?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    expiresAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["uploadedFile"]>

  export type UploadedFileSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    fileName?: boolean
    originalFileName?: boolean
    fileKey?: boolean
    fileSize?: boolean
    mimeType?: boolean
    parseStatus?: boolean
    parsedContent?: boolean
    parseError?: boolean
    isDeleted?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    expiresAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["uploadedFile"]>

  export type UploadedFileSelectScalar = {
    id?: boolean
    userId?: boolean
    fileName?: boolean
    originalFileName?: boolean
    fileKey?: boolean
    fileSize?: boolean
    mimeType?: boolean
    parseStatus?: boolean
    parsedContent?: boolean
    parseError?: boolean
    isDeleted?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    expiresAt?: boolean
  }

  export type UploadedFileOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "userId" | "fileName" | "originalFileName" | "fileKey" | "fileSize" | "mimeType" | "parseStatus" | "parsedContent" | "parseError" | "isDeleted" | "deletedAt" | "createdAt" | "updatedAt" | "expiresAt", ExtArgs["result"]["uploadedFile"]>
  export type UploadedFileInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    gradingResults?: boolean | UploadedFile$gradingResultsArgs<ExtArgs>
    _count?: boolean | UploadedFileCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UploadedFileIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type UploadedFileIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $UploadedFilePayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "UploadedFile"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      gradingResults: Prisma.$GradingResultPayload<ExtArgs>[]
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      userId: string
      fileName: string
      originalFileName: string
      fileKey: string
      fileSize: number
      mimeType: string
      parseStatus: $Enums.FileParseStatus
      parsedContent: string | null
      parseError: string | null
      isDeleted: boolean
      deletedAt: Date | null
      createdAt: Date
      updatedAt: Date
      expiresAt: Date | null
    }, ExtArgs["result"]["uploadedFile"]>
    composites: {}
  }

  export type UploadedFileGetPayload<S extends boolean | null | undefined | UploadedFileDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$UploadedFilePayload, S>

  export type UploadedFileCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
    Omit<UploadedFileFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UploadedFileCountAggregateInputType | true
    }

  export interface UploadedFileDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['UploadedFile'], meta: { name: 'UploadedFile' } }
    /**
     * Find zero or one UploadedFile that matches the filter.
     * @param {UploadedFileFindUniqueArgs} args - Arguments to find a UploadedFile
     * @example
     * // Get one UploadedFile
     * const uploadedFile = await prisma.uploadedFile.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UploadedFileFindUniqueArgs>(args: SelectSubset<T, UploadedFileFindUniqueArgs<ExtArgs>>): Prisma__UploadedFileClient<runtime.Types.Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one UploadedFile that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UploadedFileFindUniqueOrThrowArgs} args - Arguments to find a UploadedFile
     * @example
     * // Get one UploadedFile
     * const uploadedFile = await prisma.uploadedFile.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UploadedFileFindUniqueOrThrowArgs>(args: SelectSubset<T, UploadedFileFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UploadedFileClient<runtime.Types.Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UploadedFile that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadedFileFindFirstArgs} args - Arguments to find a UploadedFile
     * @example
     * // Get one UploadedFile
     * const uploadedFile = await prisma.uploadedFile.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UploadedFileFindFirstArgs>(args?: SelectSubset<T, UploadedFileFindFirstArgs<ExtArgs>>): Prisma__UploadedFileClient<runtime.Types.Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UploadedFile that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadedFileFindFirstOrThrowArgs} args - Arguments to find a UploadedFile
     * @example
     * // Get one UploadedFile
     * const uploadedFile = await prisma.uploadedFile.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UploadedFileFindFirstOrThrowArgs>(args?: SelectSubset<T, UploadedFileFindFirstOrThrowArgs<ExtArgs>>): Prisma__UploadedFileClient<runtime.Types.Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more UploadedFiles that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadedFileFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all UploadedFiles
     * const uploadedFiles = await prisma.uploadedFile.findMany()
     * 
     * // Get first 10 UploadedFiles
     * const uploadedFiles = await prisma.uploadedFile.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const uploadedFileWithIdOnly = await prisma.uploadedFile.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UploadedFileFindManyArgs>(args?: SelectSubset<T, UploadedFileFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a UploadedFile.
     * @param {UploadedFileCreateArgs} args - Arguments to create a UploadedFile.
     * @example
     * // Create one UploadedFile
     * const UploadedFile = await prisma.uploadedFile.create({
     *   data: {
     *     // ... data to create a UploadedFile
     *   }
     * })
     * 
     */
    create<T extends UploadedFileCreateArgs>(args: SelectSubset<T, UploadedFileCreateArgs<ExtArgs>>): Prisma__UploadedFileClient<runtime.Types.Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many UploadedFiles.
     * @param {UploadedFileCreateManyArgs} args - Arguments to create many UploadedFiles.
     * @example
     * // Create many UploadedFiles
     * const uploadedFile = await prisma.uploadedFile.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UploadedFileCreateManyArgs>(args?: SelectSubset<T, UploadedFileCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many UploadedFiles and returns the data saved in the database.
     * @param {UploadedFileCreateManyAndReturnArgs} args - Arguments to create many UploadedFiles.
     * @example
     * // Create many UploadedFiles
     * const uploadedFile = await prisma.uploadedFile.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many UploadedFiles and only return the `id`
     * const uploadedFileWithIdOnly = await prisma.uploadedFile.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UploadedFileCreateManyAndReturnArgs>(args?: SelectSubset<T, UploadedFileCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a UploadedFile.
     * @param {UploadedFileDeleteArgs} args - Arguments to delete one UploadedFile.
     * @example
     * // Delete one UploadedFile
     * const UploadedFile = await prisma.uploadedFile.delete({
     *   where: {
     *     // ... filter to delete one UploadedFile
     *   }
     * })
     * 
     */
    delete<T extends UploadedFileDeleteArgs>(args: SelectSubset<T, UploadedFileDeleteArgs<ExtArgs>>): Prisma__UploadedFileClient<runtime.Types.Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one UploadedFile.
     * @param {UploadedFileUpdateArgs} args - Arguments to update one UploadedFile.
     * @example
     * // Update one UploadedFile
     * const uploadedFile = await prisma.uploadedFile.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UploadedFileUpdateArgs>(args: SelectSubset<T, UploadedFileUpdateArgs<ExtArgs>>): Prisma__UploadedFileClient<runtime.Types.Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more UploadedFiles.
     * @param {UploadedFileDeleteManyArgs} args - Arguments to filter UploadedFiles to delete.
     * @example
     * // Delete a few UploadedFiles
     * const { count } = await prisma.uploadedFile.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UploadedFileDeleteManyArgs>(args?: SelectSubset<T, UploadedFileDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UploadedFiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadedFileUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many UploadedFiles
     * const uploadedFile = await prisma.uploadedFile.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UploadedFileUpdateManyArgs>(args: SelectSubset<T, UploadedFileUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UploadedFiles and returns the data updated in the database.
     * @param {UploadedFileUpdateManyAndReturnArgs} args - Arguments to update many UploadedFiles.
     * @example
     * // Update many UploadedFiles
     * const uploadedFile = await prisma.uploadedFile.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more UploadedFiles and only return the `id`
     * const uploadedFileWithIdOnly = await prisma.uploadedFile.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UploadedFileUpdateManyAndReturnArgs>(args: SelectSubset<T, UploadedFileUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one UploadedFile.
     * @param {UploadedFileUpsertArgs} args - Arguments to update or create a UploadedFile.
     * @example
     * // Update or create a UploadedFile
     * const uploadedFile = await prisma.uploadedFile.upsert({
     *   create: {
     *     // ... data to create a UploadedFile
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the UploadedFile we want to update
     *   }
     * })
     */
    upsert<T extends UploadedFileUpsertArgs>(args: SelectSubset<T, UploadedFileUpsertArgs<ExtArgs>>): Prisma__UploadedFileClient<runtime.Types.Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of UploadedFiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadedFileCountArgs} args - Arguments to filter UploadedFiles to count.
     * @example
     * // Count the number of UploadedFiles
     * const count = await prisma.uploadedFile.count({
     *   where: {
     *     // ... the filter for the UploadedFiles we want to count
     *   }
     * })
    **/
    count<T extends UploadedFileCountArgs>(
      args?: Subset<T, UploadedFileCountArgs>,
    ): Prisma.PrismaPromise<
      T extends runtime.Types.Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UploadedFileCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a UploadedFile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadedFileAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UploadedFileAggregateArgs>(args: Subset<T, UploadedFileAggregateArgs>): Prisma.PrismaPromise<GetUploadedFileAggregateType<T>>

    /**
     * Group by UploadedFile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UploadedFileGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UploadedFileGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UploadedFileGroupByArgs['orderBy'] }
        : { orderBy?: UploadedFileGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UploadedFileGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUploadedFileGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the UploadedFile model
   */
  readonly fields: UploadedFileFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for UploadedFile.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UploadedFileClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    gradingResults<T extends UploadedFile$gradingResultsArgs<ExtArgs> = {}>(args?: Subset<T, UploadedFile$gradingResultsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$GradingResultPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>
  }




  /**
   * Fields of the UploadedFile model
   */
  export interface UploadedFileFieldRefs {
    readonly id: FieldRef<"UploadedFile", 'String'>
    readonly userId: FieldRef<"UploadedFile", 'String'>
    readonly fileName: FieldRef<"UploadedFile", 'String'>
    readonly originalFileName: FieldRef<"UploadedFile", 'String'>
    readonly fileKey: FieldRef<"UploadedFile", 'String'>
    readonly fileSize: FieldRef<"UploadedFile", 'Int'>
    readonly mimeType: FieldRef<"UploadedFile", 'String'>
    readonly parseStatus: FieldRef<"UploadedFile", 'FileParseStatus'>
    readonly parsedContent: FieldRef<"UploadedFile", 'String'>
    readonly parseError: FieldRef<"UploadedFile", 'String'>
    readonly isDeleted: FieldRef<"UploadedFile", 'Boolean'>
    readonly deletedAt: FieldRef<"UploadedFile", 'DateTime'>
    readonly createdAt: FieldRef<"UploadedFile", 'DateTime'>
    readonly updatedAt: FieldRef<"UploadedFile", 'DateTime'>
    readonly expiresAt: FieldRef<"UploadedFile", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * UploadedFile findUnique
   */
  export type UploadedFileFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * Filter, which UploadedFile to fetch.
     */
    where: UploadedFileWhereUniqueInput
  }

  /**
   * UploadedFile findUniqueOrThrow
   */
  export type UploadedFileFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * Filter, which UploadedFile to fetch.
     */
    where: UploadedFileWhereUniqueInput
  }

  /**
   * UploadedFile findFirst
   */
  export type UploadedFileFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * Filter, which UploadedFile to fetch.
     */
    where?: UploadedFileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UploadedFiles to fetch.
     */
    orderBy?: UploadedFileOrderByWithRelationInput | UploadedFileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UploadedFiles.
     */
    cursor?: UploadedFileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UploadedFiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UploadedFiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UploadedFiles.
     */
    distinct?: UploadedFileScalarFieldEnum | UploadedFileScalarFieldEnum[]
  }

  /**
   * UploadedFile findFirstOrThrow
   */
  export type UploadedFileFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * Filter, which UploadedFile to fetch.
     */
    where?: UploadedFileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UploadedFiles to fetch.
     */
    orderBy?: UploadedFileOrderByWithRelationInput | UploadedFileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UploadedFiles.
     */
    cursor?: UploadedFileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UploadedFiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UploadedFiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UploadedFiles.
     */
    distinct?: UploadedFileScalarFieldEnum | UploadedFileScalarFieldEnum[]
  }

  /**
   * UploadedFile findMany
   */
  export type UploadedFileFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * Filter, which UploadedFiles to fetch.
     */
    where?: UploadedFileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UploadedFiles to fetch.
     */
    orderBy?: UploadedFileOrderByWithRelationInput | UploadedFileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing UploadedFiles.
     */
    cursor?: UploadedFileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UploadedFiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UploadedFiles.
     */
    skip?: number
    distinct?: UploadedFileScalarFieldEnum | UploadedFileScalarFieldEnum[]
  }

  /**
   * UploadedFile create
   */
  export type UploadedFileCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * The data needed to create a UploadedFile.
     */
    data: XOR<UploadedFileCreateInput, UploadedFileUncheckedCreateInput>
  }

  /**
   * UploadedFile createMany
   */
  export type UploadedFileCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many UploadedFiles.
     */
    data: UploadedFileCreateManyInput | UploadedFileCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * UploadedFile createManyAndReturn
   */
  export type UploadedFileCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * The data used to create many UploadedFiles.
     */
    data: UploadedFileCreateManyInput | UploadedFileCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * UploadedFile update
   */
  export type UploadedFileUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * The data needed to update a UploadedFile.
     */
    data: XOR<UploadedFileUpdateInput, UploadedFileUncheckedUpdateInput>
    /**
     * Choose, which UploadedFile to update.
     */
    where: UploadedFileWhereUniqueInput
  }

  /**
   * UploadedFile updateMany
   */
  export type UploadedFileUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update UploadedFiles.
     */
    data: XOR<UploadedFileUpdateManyMutationInput, UploadedFileUncheckedUpdateManyInput>
    /**
     * Filter which UploadedFiles to update
     */
    where?: UploadedFileWhereInput
    /**
     * Limit how many UploadedFiles to update.
     */
    limit?: number
  }

  /**
   * UploadedFile updateManyAndReturn
   */
  export type UploadedFileUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * The data used to update UploadedFiles.
     */
    data: XOR<UploadedFileUpdateManyMutationInput, UploadedFileUncheckedUpdateManyInput>
    /**
     * Filter which UploadedFiles to update
     */
    where?: UploadedFileWhereInput
    /**
     * Limit how many UploadedFiles to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * UploadedFile upsert
   */
  export type UploadedFileUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * The filter to search for the UploadedFile to update in case it exists.
     */
    where: UploadedFileWhereUniqueInput
    /**
     * In case the UploadedFile found by the `where` argument doesn't exist, create a new UploadedFile with this data.
     */
    create: XOR<UploadedFileCreateInput, UploadedFileUncheckedCreateInput>
    /**
     * In case the UploadedFile was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UploadedFileUpdateInput, UploadedFileUncheckedUpdateInput>
  }

  /**
   * UploadedFile delete
   */
  export type UploadedFileDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
    /**
     * Filter which UploadedFile to delete.
     */
    where: UploadedFileWhereUniqueInput
  }

  /**
   * UploadedFile deleteMany
   */
  export type UploadedFileDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which UploadedFiles to delete
     */
    where?: UploadedFileWhereInput
    /**
     * Limit how many UploadedFiles to delete.
     */
    limit?: number
  }

  /**
   * UploadedFile.gradingResults
   */
  export type UploadedFile$gradingResultsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingResult
     */
    select?: GradingResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingResult
     */
    omit?: GradingResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingResultInclude<ExtArgs> | null
    where?: GradingResultWhereInput
    orderBy?: GradingResultOrderByWithRelationInput | GradingResultOrderByWithRelationInput[]
    cursor?: GradingResultWhereUniqueInput
    take?: number
    skip?: number
    distinct?: GradingResultScalarFieldEnum | GradingResultScalarFieldEnum[]
  }

  /**
   * UploadedFile without action
   */
  export type UploadedFileDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UploadedFile
     */
    select?: UploadedFileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UploadedFile
     */
    omit?: UploadedFileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UploadedFileInclude<ExtArgs> | null
  }


  /**
   * Model GradingResult
   */

  export type AggregateGradingResult = {
    _count: GradingResultCountAggregateOutputType | null
    _avg: GradingResultAvgAggregateOutputType | null
    _sum: GradingResultSumAggregateOutputType | null
    _min: GradingResultMinAggregateOutputType | null
    _max: GradingResultMaxAggregateOutputType | null
  }

  export type GradingResultAvgAggregateOutputType = {
    progress: number | null
    gradingTokens: number | null
    gradingDuration: number | null
  }

  export type GradingResultSumAggregateOutputType = {
    progress: number | null
    gradingTokens: number | null
    gradingDuration: number | null
  }

  export type GradingResultMinAggregateOutputType = {
    id: string | null
    gradingSessionId: string | null
    uploadedFileId: string | null
    rubricId: string | null
    status: $Enums.GradingStatus | null
    progress: number | null
    errorMessage: string | null
    gradingModel: string | null
    gradingTokens: number | null
    gradingDuration: number | null
    createdAt: Date | null
    updatedAt: Date | null
    completedAt: Date | null
  }

  export type GradingResultMaxAggregateOutputType = {
    id: string | null
    gradingSessionId: string | null
    uploadedFileId: string | null
    rubricId: string | null
    status: $Enums.GradingStatus | null
    progress: number | null
    errorMessage: string | null
    gradingModel: string | null
    gradingTokens: number | null
    gradingDuration: number | null
    createdAt: Date | null
    updatedAt: Date | null
    completedAt: Date | null
  }

  export type GradingResultCountAggregateOutputType = {
    id: number
    gradingSessionId: number
    uploadedFileId: number
    rubricId: number
    status: number
    progress: number
    result: number
    errorMessage: number
    gradingModel: number
    gradingTokens: number
    gradingDuration: number
    createdAt: number
    updatedAt: number
    completedAt: number
    _all: number
  }


  export type GradingResultAvgAggregateInputType = {
    progress?: true
    gradingTokens?: true
    gradingDuration?: true
  }

  export type GradingResultSumAggregateInputType = {
    progress?: true
    gradingTokens?: true
    gradingDuration?: true
  }

  export type GradingResultMinAggregateInputType = {
    id?: true
    gradingSessionId?: true
    uploadedFileId?: true
    rubricId?: true
    status?: true
    progress?: true
    errorMessage?: true
    gradingModel?: true
    gradingTokens?: true
    gradingDuration?: true
    createdAt?: true
    updatedAt?: true
    completedAt?: true
  }

  export type GradingResultMaxAggregateInputType = {
    id?: true
    gradingSessionId?: true
    uploadedFileId?: true
    rubricId?: true
    status?: true
    progress?: true
    errorMessage?: true
    gradingModel?: true
    gradingTokens?: true
    gradingDuration?: true
    createdAt?: true
    updatedAt?: true
    completedAt?: true
  }

  export type GradingResultCountAggregateInputType = {
    id?: true
    gradingSessionId?: true
    uploadedFileId?: true
    rubricId?: true
    status?: true
    progress?: true
    result?: true
    errorMessage?: true
    gradingModel?: true
    gradingTokens?: true
    gradingDuration?: true
    createdAt?: true
    updatedAt?: true
    completedAt?: true
    _all?: true
  }

  export type GradingResultAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which GradingResult to aggregate.
     */
    where?: GradingResultWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GradingResults to fetch.
     */
    orderBy?: GradingResultOrderByWithRelationInput | GradingResultOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: GradingResultWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GradingResults from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GradingResults.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned GradingResults
    **/
    _count?: true | GradingResultCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: GradingResultAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: GradingResultSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: GradingResultMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: GradingResultMaxAggregateInputType
  }

  export type GetGradingResultAggregateType<T extends GradingResultAggregateArgs> = {
        [P in keyof T & keyof AggregateGradingResult]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGradingResult[P]>
      : GetScalarType<T[P], AggregateGradingResult[P]>
  }




  export type GradingResultGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: GradingResultWhereInput
    orderBy?: GradingResultOrderByWithAggregationInput | GradingResultOrderByWithAggregationInput[]
    by: GradingResultScalarFieldEnum[] | GradingResultScalarFieldEnum
    having?: GradingResultScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: GradingResultCountAggregateInputType | true
    _avg?: GradingResultAvgAggregateInputType
    _sum?: GradingResultSumAggregateInputType
    _min?: GradingResultMinAggregateInputType
    _max?: GradingResultMaxAggregateInputType
  }

  export type GradingResultGroupByOutputType = {
    id: string
    gradingSessionId: string
    uploadedFileId: string
    rubricId: string
    status: $Enums.GradingStatus
    progress: number
    result: JsonValue | null
    errorMessage: string | null
    gradingModel: string | null
    gradingTokens: number | null
    gradingDuration: number | null
    createdAt: Date
    updatedAt: Date
    completedAt: Date | null
    _count: GradingResultCountAggregateOutputType | null
    _avg: GradingResultAvgAggregateOutputType | null
    _sum: GradingResultSumAggregateOutputType | null
    _min: GradingResultMinAggregateOutputType | null
    _max: GradingResultMaxAggregateOutputType | null
  }

  type GetGradingResultGroupByPayload<T extends GradingResultGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GradingResultGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof GradingResultGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], GradingResultGroupByOutputType[P]>
            : GetScalarType<T[P], GradingResultGroupByOutputType[P]>
        }
      >
    >


  export type GradingResultSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    gradingSessionId?: boolean
    uploadedFileId?: boolean
    rubricId?: boolean
    status?: boolean
    progress?: boolean
    result?: boolean
    errorMessage?: boolean
    gradingModel?: boolean
    gradingTokens?: boolean
    gradingDuration?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    completedAt?: boolean
    gradingSession?: boolean | GradingSessionDefaultArgs<ExtArgs>
    uploadedFile?: boolean | UploadedFileDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gradingResult"]>

  export type GradingResultSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    gradingSessionId?: boolean
    uploadedFileId?: boolean
    rubricId?: boolean
    status?: boolean
    progress?: boolean
    result?: boolean
    errorMessage?: boolean
    gradingModel?: boolean
    gradingTokens?: boolean
    gradingDuration?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    completedAt?: boolean
    gradingSession?: boolean | GradingSessionDefaultArgs<ExtArgs>
    uploadedFile?: boolean | UploadedFileDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gradingResult"]>

  export type GradingResultSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    gradingSessionId?: boolean
    uploadedFileId?: boolean
    rubricId?: boolean
    status?: boolean
    progress?: boolean
    result?: boolean
    errorMessage?: boolean
    gradingModel?: boolean
    gradingTokens?: boolean
    gradingDuration?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    completedAt?: boolean
    gradingSession?: boolean | GradingSessionDefaultArgs<ExtArgs>
    uploadedFile?: boolean | UploadedFileDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["gradingResult"]>

  export type GradingResultSelectScalar = {
    id?: boolean
    gradingSessionId?: boolean
    uploadedFileId?: boolean
    rubricId?: boolean
    status?: boolean
    progress?: boolean
    result?: boolean
    errorMessage?: boolean
    gradingModel?: boolean
    gradingTokens?: boolean
    gradingDuration?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    completedAt?: boolean
  }

  export type GradingResultOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "gradingSessionId" | "uploadedFileId" | "rubricId" | "status" | "progress" | "result" | "errorMessage" | "gradingModel" | "gradingTokens" | "gradingDuration" | "createdAt" | "updatedAt" | "completedAt", ExtArgs["result"]["gradingResult"]>
  export type GradingResultInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    gradingSession?: boolean | GradingSessionDefaultArgs<ExtArgs>
    uploadedFile?: boolean | UploadedFileDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }
  export type GradingResultIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    gradingSession?: boolean | GradingSessionDefaultArgs<ExtArgs>
    uploadedFile?: boolean | UploadedFileDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }
  export type GradingResultIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    gradingSession?: boolean | GradingSessionDefaultArgs<ExtArgs>
    uploadedFile?: boolean | UploadedFileDefaultArgs<ExtArgs>
    rubric?: boolean | RubricDefaultArgs<ExtArgs>
  }

  export type $GradingResultPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "GradingResult"
    objects: {
      gradingSession: Prisma.$GradingSessionPayload<ExtArgs>
      uploadedFile: Prisma.$UploadedFilePayload<ExtArgs>
      rubric: Prisma.$RubricPayload<ExtArgs>
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      gradingSessionId: string
      uploadedFileId: string
      rubricId: string
      status: $Enums.GradingStatus
      progress: number
      result: Prisma.JsonValue | null
      errorMessage: string | null
      gradingModel: string | null
      gradingTokens: number | null
      gradingDuration: number | null
      createdAt: Date
      updatedAt: Date
      completedAt: Date | null
    }, ExtArgs["result"]["gradingResult"]>
    composites: {}
  }

  export type GradingResultGetPayload<S extends boolean | null | undefined | GradingResultDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$GradingResultPayload, S>

  export type GradingResultCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
    Omit<GradingResultFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: GradingResultCountAggregateInputType | true
    }

  export interface GradingResultDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['GradingResult'], meta: { name: 'GradingResult' } }
    /**
     * Find zero or one GradingResult that matches the filter.
     * @param {GradingResultFindUniqueArgs} args - Arguments to find a GradingResult
     * @example
     * // Get one GradingResult
     * const gradingResult = await prisma.gradingResult.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends GradingResultFindUniqueArgs>(args: SelectSubset<T, GradingResultFindUniqueArgs<ExtArgs>>): Prisma__GradingResultClient<runtime.Types.Result.GetResult<Prisma.$GradingResultPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one GradingResult that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {GradingResultFindUniqueOrThrowArgs} args - Arguments to find a GradingResult
     * @example
     * // Get one GradingResult
     * const gradingResult = await prisma.gradingResult.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends GradingResultFindUniqueOrThrowArgs>(args: SelectSubset<T, GradingResultFindUniqueOrThrowArgs<ExtArgs>>): Prisma__GradingResultClient<runtime.Types.Result.GetResult<Prisma.$GradingResultPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first GradingResult that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingResultFindFirstArgs} args - Arguments to find a GradingResult
     * @example
     * // Get one GradingResult
     * const gradingResult = await prisma.gradingResult.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends GradingResultFindFirstArgs>(args?: SelectSubset<T, GradingResultFindFirstArgs<ExtArgs>>): Prisma__GradingResultClient<runtime.Types.Result.GetResult<Prisma.$GradingResultPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first GradingResult that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingResultFindFirstOrThrowArgs} args - Arguments to find a GradingResult
     * @example
     * // Get one GradingResult
     * const gradingResult = await prisma.gradingResult.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends GradingResultFindFirstOrThrowArgs>(args?: SelectSubset<T, GradingResultFindFirstOrThrowArgs<ExtArgs>>): Prisma__GradingResultClient<runtime.Types.Result.GetResult<Prisma.$GradingResultPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more GradingResults that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingResultFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all GradingResults
     * const gradingResults = await prisma.gradingResult.findMany()
     * 
     * // Get first 10 GradingResults
     * const gradingResults = await prisma.gradingResult.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const gradingResultWithIdOnly = await prisma.gradingResult.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends GradingResultFindManyArgs>(args?: SelectSubset<T, GradingResultFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$GradingResultPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a GradingResult.
     * @param {GradingResultCreateArgs} args - Arguments to create a GradingResult.
     * @example
     * // Create one GradingResult
     * const GradingResult = await prisma.gradingResult.create({
     *   data: {
     *     // ... data to create a GradingResult
     *   }
     * })
     * 
     */
    create<T extends GradingResultCreateArgs>(args: SelectSubset<T, GradingResultCreateArgs<ExtArgs>>): Prisma__GradingResultClient<runtime.Types.Result.GetResult<Prisma.$GradingResultPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many GradingResults.
     * @param {GradingResultCreateManyArgs} args - Arguments to create many GradingResults.
     * @example
     * // Create many GradingResults
     * const gradingResult = await prisma.gradingResult.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends GradingResultCreateManyArgs>(args?: SelectSubset<T, GradingResultCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many GradingResults and returns the data saved in the database.
     * @param {GradingResultCreateManyAndReturnArgs} args - Arguments to create many GradingResults.
     * @example
     * // Create many GradingResults
     * const gradingResult = await prisma.gradingResult.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many GradingResults and only return the `id`
     * const gradingResultWithIdOnly = await prisma.gradingResult.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends GradingResultCreateManyAndReturnArgs>(args?: SelectSubset<T, GradingResultCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$GradingResultPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a GradingResult.
     * @param {GradingResultDeleteArgs} args - Arguments to delete one GradingResult.
     * @example
     * // Delete one GradingResult
     * const GradingResult = await prisma.gradingResult.delete({
     *   where: {
     *     // ... filter to delete one GradingResult
     *   }
     * })
     * 
     */
    delete<T extends GradingResultDeleteArgs>(args: SelectSubset<T, GradingResultDeleteArgs<ExtArgs>>): Prisma__GradingResultClient<runtime.Types.Result.GetResult<Prisma.$GradingResultPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one GradingResult.
     * @param {GradingResultUpdateArgs} args - Arguments to update one GradingResult.
     * @example
     * // Update one GradingResult
     * const gradingResult = await prisma.gradingResult.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends GradingResultUpdateArgs>(args: SelectSubset<T, GradingResultUpdateArgs<ExtArgs>>): Prisma__GradingResultClient<runtime.Types.Result.GetResult<Prisma.$GradingResultPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more GradingResults.
     * @param {GradingResultDeleteManyArgs} args - Arguments to filter GradingResults to delete.
     * @example
     * // Delete a few GradingResults
     * const { count } = await prisma.gradingResult.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends GradingResultDeleteManyArgs>(args?: SelectSubset<T, GradingResultDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GradingResults.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingResultUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many GradingResults
     * const gradingResult = await prisma.gradingResult.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends GradingResultUpdateManyArgs>(args: SelectSubset<T, GradingResultUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GradingResults and returns the data updated in the database.
     * @param {GradingResultUpdateManyAndReturnArgs} args - Arguments to update many GradingResults.
     * @example
     * // Update many GradingResults
     * const gradingResult = await prisma.gradingResult.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more GradingResults and only return the `id`
     * const gradingResultWithIdOnly = await prisma.gradingResult.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends GradingResultUpdateManyAndReturnArgs>(args: SelectSubset<T, GradingResultUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$GradingResultPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one GradingResult.
     * @param {GradingResultUpsertArgs} args - Arguments to update or create a GradingResult.
     * @example
     * // Update or create a GradingResult
     * const gradingResult = await prisma.gradingResult.upsert({
     *   create: {
     *     // ... data to create a GradingResult
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the GradingResult we want to update
     *   }
     * })
     */
    upsert<T extends GradingResultUpsertArgs>(args: SelectSubset<T, GradingResultUpsertArgs<ExtArgs>>): Prisma__GradingResultClient<runtime.Types.Result.GetResult<Prisma.$GradingResultPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of GradingResults.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingResultCountArgs} args - Arguments to filter GradingResults to count.
     * @example
     * // Count the number of GradingResults
     * const count = await prisma.gradingResult.count({
     *   where: {
     *     // ... the filter for the GradingResults we want to count
     *   }
     * })
    **/
    count<T extends GradingResultCountArgs>(
      args?: Subset<T, GradingResultCountArgs>,
    ): Prisma.PrismaPromise<
      T extends runtime.Types.Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GradingResultCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a GradingResult.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingResultAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends GradingResultAggregateArgs>(args: Subset<T, GradingResultAggregateArgs>): Prisma.PrismaPromise<GetGradingResultAggregateType<T>>

    /**
     * Group by GradingResult.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GradingResultGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends GradingResultGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: GradingResultGroupByArgs['orderBy'] }
        : { orderBy?: GradingResultGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, GradingResultGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGradingResultGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the GradingResult model
   */
  readonly fields: GradingResultFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for GradingResult.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__GradingResultClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    gradingSession<T extends GradingSessionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, GradingSessionDefaultArgs<ExtArgs>>): Prisma__GradingSessionClient<runtime.Types.Result.GetResult<Prisma.$GradingSessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    uploadedFile<T extends UploadedFileDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UploadedFileDefaultArgs<ExtArgs>>): Prisma__UploadedFileClient<runtime.Types.Result.GetResult<Prisma.$UploadedFilePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    rubric<T extends RubricDefaultArgs<ExtArgs> = {}>(args?: Subset<T, RubricDefaultArgs<ExtArgs>>): Prisma__RubricClient<runtime.Types.Result.GetResult<Prisma.$RubricPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>
  }




  /**
   * Fields of the GradingResult model
   */
  export interface GradingResultFieldRefs {
    readonly id: FieldRef<"GradingResult", 'String'>
    readonly gradingSessionId: FieldRef<"GradingResult", 'String'>
    readonly uploadedFileId: FieldRef<"GradingResult", 'String'>
    readonly rubricId: FieldRef<"GradingResult", 'String'>
    readonly status: FieldRef<"GradingResult", 'GradingStatus'>
    readonly progress: FieldRef<"GradingResult", 'Int'>
    readonly result: FieldRef<"GradingResult", 'Json'>
    readonly errorMessage: FieldRef<"GradingResult", 'String'>
    readonly gradingModel: FieldRef<"GradingResult", 'String'>
    readonly gradingTokens: FieldRef<"GradingResult", 'Int'>
    readonly gradingDuration: FieldRef<"GradingResult", 'Int'>
    readonly createdAt: FieldRef<"GradingResult", 'DateTime'>
    readonly updatedAt: FieldRef<"GradingResult", 'DateTime'>
    readonly completedAt: FieldRef<"GradingResult", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * GradingResult findUnique
   */
  export type GradingResultFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingResult
     */
    select?: GradingResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingResult
     */
    omit?: GradingResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingResultInclude<ExtArgs> | null
    /**
     * Filter, which GradingResult to fetch.
     */
    where: GradingResultWhereUniqueInput
  }

  /**
   * GradingResult findUniqueOrThrow
   */
  export type GradingResultFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingResult
     */
    select?: GradingResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingResult
     */
    omit?: GradingResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingResultInclude<ExtArgs> | null
    /**
     * Filter, which GradingResult to fetch.
     */
    where: GradingResultWhereUniqueInput
  }

  /**
   * GradingResult findFirst
   */
  export type GradingResultFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingResult
     */
    select?: GradingResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingResult
     */
    omit?: GradingResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingResultInclude<ExtArgs> | null
    /**
     * Filter, which GradingResult to fetch.
     */
    where?: GradingResultWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GradingResults to fetch.
     */
    orderBy?: GradingResultOrderByWithRelationInput | GradingResultOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GradingResults.
     */
    cursor?: GradingResultWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GradingResults from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GradingResults.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GradingResults.
     */
    distinct?: GradingResultScalarFieldEnum | GradingResultScalarFieldEnum[]
  }

  /**
   * GradingResult findFirstOrThrow
   */
  export type GradingResultFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingResult
     */
    select?: GradingResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingResult
     */
    omit?: GradingResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingResultInclude<ExtArgs> | null
    /**
     * Filter, which GradingResult to fetch.
     */
    where?: GradingResultWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GradingResults to fetch.
     */
    orderBy?: GradingResultOrderByWithRelationInput | GradingResultOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GradingResults.
     */
    cursor?: GradingResultWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GradingResults from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GradingResults.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GradingResults.
     */
    distinct?: GradingResultScalarFieldEnum | GradingResultScalarFieldEnum[]
  }

  /**
   * GradingResult findMany
   */
  export type GradingResultFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingResult
     */
    select?: GradingResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingResult
     */
    omit?: GradingResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingResultInclude<ExtArgs> | null
    /**
     * Filter, which GradingResults to fetch.
     */
    where?: GradingResultWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GradingResults to fetch.
     */
    orderBy?: GradingResultOrderByWithRelationInput | GradingResultOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing GradingResults.
     */
    cursor?: GradingResultWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GradingResults from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GradingResults.
     */
    skip?: number
    distinct?: GradingResultScalarFieldEnum | GradingResultScalarFieldEnum[]
  }

  /**
   * GradingResult create
   */
  export type GradingResultCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingResult
     */
    select?: GradingResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingResult
     */
    omit?: GradingResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingResultInclude<ExtArgs> | null
    /**
     * The data needed to create a GradingResult.
     */
    data: XOR<GradingResultCreateInput, GradingResultUncheckedCreateInput>
  }

  /**
   * GradingResult createMany
   */
  export type GradingResultCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many GradingResults.
     */
    data: GradingResultCreateManyInput | GradingResultCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * GradingResult createManyAndReturn
   */
  export type GradingResultCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingResult
     */
    select?: GradingResultSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the GradingResult
     */
    omit?: GradingResultOmit<ExtArgs> | null
    /**
     * The data used to create many GradingResults.
     */
    data: GradingResultCreateManyInput | GradingResultCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingResultIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * GradingResult update
   */
  export type GradingResultUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingResult
     */
    select?: GradingResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingResult
     */
    omit?: GradingResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingResultInclude<ExtArgs> | null
    /**
     * The data needed to update a GradingResult.
     */
    data: XOR<GradingResultUpdateInput, GradingResultUncheckedUpdateInput>
    /**
     * Choose, which GradingResult to update.
     */
    where: GradingResultWhereUniqueInput
  }

  /**
   * GradingResult updateMany
   */
  export type GradingResultUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update GradingResults.
     */
    data: XOR<GradingResultUpdateManyMutationInput, GradingResultUncheckedUpdateManyInput>
    /**
     * Filter which GradingResults to update
     */
    where?: GradingResultWhereInput
    /**
     * Limit how many GradingResults to update.
     */
    limit?: number
  }

  /**
   * GradingResult updateManyAndReturn
   */
  export type GradingResultUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingResult
     */
    select?: GradingResultSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the GradingResult
     */
    omit?: GradingResultOmit<ExtArgs> | null
    /**
     * The data used to update GradingResults.
     */
    data: XOR<GradingResultUpdateManyMutationInput, GradingResultUncheckedUpdateManyInput>
    /**
     * Filter which GradingResults to update
     */
    where?: GradingResultWhereInput
    /**
     * Limit how many GradingResults to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingResultIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * GradingResult upsert
   */
  export type GradingResultUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingResult
     */
    select?: GradingResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingResult
     */
    omit?: GradingResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingResultInclude<ExtArgs> | null
    /**
     * The filter to search for the GradingResult to update in case it exists.
     */
    where: GradingResultWhereUniqueInput
    /**
     * In case the GradingResult found by the `where` argument doesn't exist, create a new GradingResult with this data.
     */
    create: XOR<GradingResultCreateInput, GradingResultUncheckedCreateInput>
    /**
     * In case the GradingResult was found with the provided `where` argument, update it with this data.
     */
    update: XOR<GradingResultUpdateInput, GradingResultUncheckedUpdateInput>
  }

  /**
   * GradingResult delete
   */
  export type GradingResultDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingResult
     */
    select?: GradingResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingResult
     */
    omit?: GradingResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingResultInclude<ExtArgs> | null
    /**
     * Filter which GradingResult to delete.
     */
    where: GradingResultWhereUniqueInput
  }

  /**
   * GradingResult deleteMany
   */
  export type GradingResultDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which GradingResults to delete
     */
    where?: GradingResultWhereInput
    /**
     * Limit how many GradingResults to delete.
     */
    limit?: number
  }

  /**
   * GradingResult without action
   */
  export type GradingResultDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GradingResult
     */
    select?: GradingResultSelect<ExtArgs> | null
    /**
     * Omit specific fields from the GradingResult
     */
    omit?: GradingResultOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GradingResultInclude<ExtArgs> | null
  }


  /**
   * Model Enrollment
   */

  export type AggregateEnrollment = {
    _count: EnrollmentCountAggregateOutputType | null
    _min: EnrollmentMinAggregateOutputType | null
    _max: EnrollmentMaxAggregateOutputType | null
  }

  export type EnrollmentMinAggregateOutputType = {
    id: string | null
    studentId: string | null
    courseId: string | null
    enrolledAt: Date | null
  }

  export type EnrollmentMaxAggregateOutputType = {
    id: string | null
    studentId: string | null
    courseId: string | null
    enrolledAt: Date | null
  }

  export type EnrollmentCountAggregateOutputType = {
    id: number
    studentId: number
    courseId: number
    enrolledAt: number
    _all: number
  }


  export type EnrollmentMinAggregateInputType = {
    id?: true
    studentId?: true
    courseId?: true
    enrolledAt?: true
  }

  export type EnrollmentMaxAggregateInputType = {
    id?: true
    studentId?: true
    courseId?: true
    enrolledAt?: true
  }

  export type EnrollmentCountAggregateInputType = {
    id?: true
    studentId?: true
    courseId?: true
    enrolledAt?: true
    _all?: true
  }

  export type EnrollmentAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Enrollment to aggregate.
     */
    where?: EnrollmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Enrollments to fetch.
     */
    orderBy?: EnrollmentOrderByWithRelationInput | EnrollmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: EnrollmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Enrollments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Enrollments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Enrollments
    **/
    _count?: true | EnrollmentCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: EnrollmentMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: EnrollmentMaxAggregateInputType
  }

  export type GetEnrollmentAggregateType<T extends EnrollmentAggregateArgs> = {
        [P in keyof T & keyof AggregateEnrollment]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateEnrollment[P]>
      : GetScalarType<T[P], AggregateEnrollment[P]>
  }




  export type EnrollmentGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: EnrollmentWhereInput
    orderBy?: EnrollmentOrderByWithAggregationInput | EnrollmentOrderByWithAggregationInput[]
    by: EnrollmentScalarFieldEnum[] | EnrollmentScalarFieldEnum
    having?: EnrollmentScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: EnrollmentCountAggregateInputType | true
    _min?: EnrollmentMinAggregateInputType
    _max?: EnrollmentMaxAggregateInputType
  }

  export type EnrollmentGroupByOutputType = {
    id: string
    studentId: string
    courseId: string
    enrolledAt: Date
    _count: EnrollmentCountAggregateOutputType | null
    _min: EnrollmentMinAggregateOutputType | null
    _max: EnrollmentMaxAggregateOutputType | null
  }

  type GetEnrollmentGroupByPayload<T extends EnrollmentGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<EnrollmentGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof EnrollmentGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], EnrollmentGroupByOutputType[P]>
            : GetScalarType<T[P], EnrollmentGroupByOutputType[P]>
        }
      >
    >


  export type EnrollmentSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    studentId?: boolean
    courseId?: boolean
    enrolledAt?: boolean
    student?: boolean | UserDefaultArgs<ExtArgs>
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["enrollment"]>

  export type EnrollmentSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    studentId?: boolean
    courseId?: boolean
    enrolledAt?: boolean
    student?: boolean | UserDefaultArgs<ExtArgs>
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["enrollment"]>

  export type EnrollmentSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    studentId?: boolean
    courseId?: boolean
    enrolledAt?: boolean
    student?: boolean | UserDefaultArgs<ExtArgs>
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["enrollment"]>

  export type EnrollmentSelectScalar = {
    id?: boolean
    studentId?: boolean
    courseId?: boolean
    enrolledAt?: boolean
  }

  export type EnrollmentOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "studentId" | "courseId" | "enrolledAt", ExtArgs["result"]["enrollment"]>
  export type EnrollmentInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    student?: boolean | UserDefaultArgs<ExtArgs>
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }
  export type EnrollmentIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    student?: boolean | UserDefaultArgs<ExtArgs>
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }
  export type EnrollmentIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    student?: boolean | UserDefaultArgs<ExtArgs>
    course?: boolean | CourseDefaultArgs<ExtArgs>
  }

  export type $EnrollmentPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Enrollment"
    objects: {
      student: Prisma.$UserPayload<ExtArgs>
      course: Prisma.$CoursePayload<ExtArgs>
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      studentId: string
      courseId: string
      enrolledAt: Date
    }, ExtArgs["result"]["enrollment"]>
    composites: {}
  }

  export type EnrollmentGetPayload<S extends boolean | null | undefined | EnrollmentDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$EnrollmentPayload, S>

  export type EnrollmentCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
    Omit<EnrollmentFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: EnrollmentCountAggregateInputType | true
    }

  export interface EnrollmentDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Enrollment'], meta: { name: 'Enrollment' } }
    /**
     * Find zero or one Enrollment that matches the filter.
     * @param {EnrollmentFindUniqueArgs} args - Arguments to find a Enrollment
     * @example
     * // Get one Enrollment
     * const enrollment = await prisma.enrollment.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends EnrollmentFindUniqueArgs>(args: SelectSubset<T, EnrollmentFindUniqueArgs<ExtArgs>>): Prisma__EnrollmentClient<runtime.Types.Result.GetResult<Prisma.$EnrollmentPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Enrollment that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {EnrollmentFindUniqueOrThrowArgs} args - Arguments to find a Enrollment
     * @example
     * // Get one Enrollment
     * const enrollment = await prisma.enrollment.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends EnrollmentFindUniqueOrThrowArgs>(args: SelectSubset<T, EnrollmentFindUniqueOrThrowArgs<ExtArgs>>): Prisma__EnrollmentClient<runtime.Types.Result.GetResult<Prisma.$EnrollmentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Enrollment that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EnrollmentFindFirstArgs} args - Arguments to find a Enrollment
     * @example
     * // Get one Enrollment
     * const enrollment = await prisma.enrollment.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends EnrollmentFindFirstArgs>(args?: SelectSubset<T, EnrollmentFindFirstArgs<ExtArgs>>): Prisma__EnrollmentClient<runtime.Types.Result.GetResult<Prisma.$EnrollmentPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Enrollment that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EnrollmentFindFirstOrThrowArgs} args - Arguments to find a Enrollment
     * @example
     * // Get one Enrollment
     * const enrollment = await prisma.enrollment.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends EnrollmentFindFirstOrThrowArgs>(args?: SelectSubset<T, EnrollmentFindFirstOrThrowArgs<ExtArgs>>): Prisma__EnrollmentClient<runtime.Types.Result.GetResult<Prisma.$EnrollmentPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Enrollments that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EnrollmentFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Enrollments
     * const enrollments = await prisma.enrollment.findMany()
     * 
     * // Get first 10 Enrollments
     * const enrollments = await prisma.enrollment.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const enrollmentWithIdOnly = await prisma.enrollment.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends EnrollmentFindManyArgs>(args?: SelectSubset<T, EnrollmentFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$EnrollmentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Enrollment.
     * @param {EnrollmentCreateArgs} args - Arguments to create a Enrollment.
     * @example
     * // Create one Enrollment
     * const Enrollment = await prisma.enrollment.create({
     *   data: {
     *     // ... data to create a Enrollment
     *   }
     * })
     * 
     */
    create<T extends EnrollmentCreateArgs>(args: SelectSubset<T, EnrollmentCreateArgs<ExtArgs>>): Prisma__EnrollmentClient<runtime.Types.Result.GetResult<Prisma.$EnrollmentPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Enrollments.
     * @param {EnrollmentCreateManyArgs} args - Arguments to create many Enrollments.
     * @example
     * // Create many Enrollments
     * const enrollment = await prisma.enrollment.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends EnrollmentCreateManyArgs>(args?: SelectSubset<T, EnrollmentCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Enrollments and returns the data saved in the database.
     * @param {EnrollmentCreateManyAndReturnArgs} args - Arguments to create many Enrollments.
     * @example
     * // Create many Enrollments
     * const enrollment = await prisma.enrollment.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Enrollments and only return the `id`
     * const enrollmentWithIdOnly = await prisma.enrollment.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends EnrollmentCreateManyAndReturnArgs>(args?: SelectSubset<T, EnrollmentCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$EnrollmentPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Enrollment.
     * @param {EnrollmentDeleteArgs} args - Arguments to delete one Enrollment.
     * @example
     * // Delete one Enrollment
     * const Enrollment = await prisma.enrollment.delete({
     *   where: {
     *     // ... filter to delete one Enrollment
     *   }
     * })
     * 
     */
    delete<T extends EnrollmentDeleteArgs>(args: SelectSubset<T, EnrollmentDeleteArgs<ExtArgs>>): Prisma__EnrollmentClient<runtime.Types.Result.GetResult<Prisma.$EnrollmentPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Enrollment.
     * @param {EnrollmentUpdateArgs} args - Arguments to update one Enrollment.
     * @example
     * // Update one Enrollment
     * const enrollment = await prisma.enrollment.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends EnrollmentUpdateArgs>(args: SelectSubset<T, EnrollmentUpdateArgs<ExtArgs>>): Prisma__EnrollmentClient<runtime.Types.Result.GetResult<Prisma.$EnrollmentPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Enrollments.
     * @param {EnrollmentDeleteManyArgs} args - Arguments to filter Enrollments to delete.
     * @example
     * // Delete a few Enrollments
     * const { count } = await prisma.enrollment.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends EnrollmentDeleteManyArgs>(args?: SelectSubset<T, EnrollmentDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Enrollments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EnrollmentUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Enrollments
     * const enrollment = await prisma.enrollment.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends EnrollmentUpdateManyArgs>(args: SelectSubset<T, EnrollmentUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Enrollments and returns the data updated in the database.
     * @param {EnrollmentUpdateManyAndReturnArgs} args - Arguments to update many Enrollments.
     * @example
     * // Update many Enrollments
     * const enrollment = await prisma.enrollment.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Enrollments and only return the `id`
     * const enrollmentWithIdOnly = await prisma.enrollment.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends EnrollmentUpdateManyAndReturnArgs>(args: SelectSubset<T, EnrollmentUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$EnrollmentPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Enrollment.
     * @param {EnrollmentUpsertArgs} args - Arguments to update or create a Enrollment.
     * @example
     * // Update or create a Enrollment
     * const enrollment = await prisma.enrollment.upsert({
     *   create: {
     *     // ... data to create a Enrollment
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Enrollment we want to update
     *   }
     * })
     */
    upsert<T extends EnrollmentUpsertArgs>(args: SelectSubset<T, EnrollmentUpsertArgs<ExtArgs>>): Prisma__EnrollmentClient<runtime.Types.Result.GetResult<Prisma.$EnrollmentPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Enrollments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EnrollmentCountArgs} args - Arguments to filter Enrollments to count.
     * @example
     * // Count the number of Enrollments
     * const count = await prisma.enrollment.count({
     *   where: {
     *     // ... the filter for the Enrollments we want to count
     *   }
     * })
    **/
    count<T extends EnrollmentCountArgs>(
      args?: Subset<T, EnrollmentCountArgs>,
    ): Prisma.PrismaPromise<
      T extends runtime.Types.Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], EnrollmentCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Enrollment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EnrollmentAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends EnrollmentAggregateArgs>(args: Subset<T, EnrollmentAggregateArgs>): Prisma.PrismaPromise<GetEnrollmentAggregateType<T>>

    /**
     * Group by Enrollment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {EnrollmentGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends EnrollmentGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: EnrollmentGroupByArgs['orderBy'] }
        : { orderBy?: EnrollmentGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, EnrollmentGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetEnrollmentGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Enrollment model
   */
  readonly fields: EnrollmentFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Enrollment.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__EnrollmentClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    student<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    course<T extends CourseDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CourseDefaultArgs<ExtArgs>>): Prisma__CourseClient<runtime.Types.Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>
  }




  /**
   * Fields of the Enrollment model
   */
  export interface EnrollmentFieldRefs {
    readonly id: FieldRef<"Enrollment", 'String'>
    readonly studentId: FieldRef<"Enrollment", 'String'>
    readonly courseId: FieldRef<"Enrollment", 'String'>
    readonly enrolledAt: FieldRef<"Enrollment", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Enrollment findUnique
   */
  export type EnrollmentFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Enrollment
     */
    select?: EnrollmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Enrollment
     */
    omit?: EnrollmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnrollmentInclude<ExtArgs> | null
    /**
     * Filter, which Enrollment to fetch.
     */
    where: EnrollmentWhereUniqueInput
  }

  /**
   * Enrollment findUniqueOrThrow
   */
  export type EnrollmentFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Enrollment
     */
    select?: EnrollmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Enrollment
     */
    omit?: EnrollmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnrollmentInclude<ExtArgs> | null
    /**
     * Filter, which Enrollment to fetch.
     */
    where: EnrollmentWhereUniqueInput
  }

  /**
   * Enrollment findFirst
   */
  export type EnrollmentFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Enrollment
     */
    select?: EnrollmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Enrollment
     */
    omit?: EnrollmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnrollmentInclude<ExtArgs> | null
    /**
     * Filter, which Enrollment to fetch.
     */
    where?: EnrollmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Enrollments to fetch.
     */
    orderBy?: EnrollmentOrderByWithRelationInput | EnrollmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Enrollments.
     */
    cursor?: EnrollmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Enrollments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Enrollments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Enrollments.
     */
    distinct?: EnrollmentScalarFieldEnum | EnrollmentScalarFieldEnum[]
  }

  /**
   * Enrollment findFirstOrThrow
   */
  export type EnrollmentFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Enrollment
     */
    select?: EnrollmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Enrollment
     */
    omit?: EnrollmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnrollmentInclude<ExtArgs> | null
    /**
     * Filter, which Enrollment to fetch.
     */
    where?: EnrollmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Enrollments to fetch.
     */
    orderBy?: EnrollmentOrderByWithRelationInput | EnrollmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Enrollments.
     */
    cursor?: EnrollmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Enrollments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Enrollments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Enrollments.
     */
    distinct?: EnrollmentScalarFieldEnum | EnrollmentScalarFieldEnum[]
  }

  /**
   * Enrollment findMany
   */
  export type EnrollmentFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Enrollment
     */
    select?: EnrollmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Enrollment
     */
    omit?: EnrollmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnrollmentInclude<ExtArgs> | null
    /**
     * Filter, which Enrollments to fetch.
     */
    where?: EnrollmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Enrollments to fetch.
     */
    orderBy?: EnrollmentOrderByWithRelationInput | EnrollmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Enrollments.
     */
    cursor?: EnrollmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Enrollments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Enrollments.
     */
    skip?: number
    distinct?: EnrollmentScalarFieldEnum | EnrollmentScalarFieldEnum[]
  }

  /**
   * Enrollment create
   */
  export type EnrollmentCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Enrollment
     */
    select?: EnrollmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Enrollment
     */
    omit?: EnrollmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnrollmentInclude<ExtArgs> | null
    /**
     * The data needed to create a Enrollment.
     */
    data: XOR<EnrollmentCreateInput, EnrollmentUncheckedCreateInput>
  }

  /**
   * Enrollment createMany
   */
  export type EnrollmentCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many Enrollments.
     */
    data: EnrollmentCreateManyInput | EnrollmentCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Enrollment createManyAndReturn
   */
  export type EnrollmentCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Enrollment
     */
    select?: EnrollmentSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Enrollment
     */
    omit?: EnrollmentOmit<ExtArgs> | null
    /**
     * The data used to create many Enrollments.
     */
    data: EnrollmentCreateManyInput | EnrollmentCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnrollmentIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Enrollment update
   */
  export type EnrollmentUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Enrollment
     */
    select?: EnrollmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Enrollment
     */
    omit?: EnrollmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnrollmentInclude<ExtArgs> | null
    /**
     * The data needed to update a Enrollment.
     */
    data: XOR<EnrollmentUpdateInput, EnrollmentUncheckedUpdateInput>
    /**
     * Choose, which Enrollment to update.
     */
    where: EnrollmentWhereUniqueInput
  }

  /**
   * Enrollment updateMany
   */
  export type EnrollmentUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update Enrollments.
     */
    data: XOR<EnrollmentUpdateManyMutationInput, EnrollmentUncheckedUpdateManyInput>
    /**
     * Filter which Enrollments to update
     */
    where?: EnrollmentWhereInput
    /**
     * Limit how many Enrollments to update.
     */
    limit?: number
  }

  /**
   * Enrollment updateManyAndReturn
   */
  export type EnrollmentUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Enrollment
     */
    select?: EnrollmentSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Enrollment
     */
    omit?: EnrollmentOmit<ExtArgs> | null
    /**
     * The data used to update Enrollments.
     */
    data: XOR<EnrollmentUpdateManyMutationInput, EnrollmentUncheckedUpdateManyInput>
    /**
     * Filter which Enrollments to update
     */
    where?: EnrollmentWhereInput
    /**
     * Limit how many Enrollments to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnrollmentIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Enrollment upsert
   */
  export type EnrollmentUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Enrollment
     */
    select?: EnrollmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Enrollment
     */
    omit?: EnrollmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnrollmentInclude<ExtArgs> | null
    /**
     * The filter to search for the Enrollment to update in case it exists.
     */
    where: EnrollmentWhereUniqueInput
    /**
     * In case the Enrollment found by the `where` argument doesn't exist, create a new Enrollment with this data.
     */
    create: XOR<EnrollmentCreateInput, EnrollmentUncheckedCreateInput>
    /**
     * In case the Enrollment was found with the provided `where` argument, update it with this data.
     */
    update: XOR<EnrollmentUpdateInput, EnrollmentUncheckedUpdateInput>
  }

  /**
   * Enrollment delete
   */
  export type EnrollmentDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Enrollment
     */
    select?: EnrollmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Enrollment
     */
    omit?: EnrollmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnrollmentInclude<ExtArgs> | null
    /**
     * Filter which Enrollment to delete.
     */
    where: EnrollmentWhereUniqueInput
  }

  /**
   * Enrollment deleteMany
   */
  export type EnrollmentDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which Enrollments to delete
     */
    where?: EnrollmentWhereInput
    /**
     * Limit how many Enrollments to delete.
     */
    limit?: number
  }

  /**
   * Enrollment without action
   */
  export type EnrollmentDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Enrollment
     */
    select?: EnrollmentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Enrollment
     */
    omit?: EnrollmentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: EnrollmentInclude<ExtArgs> | null
  }


  /**
   * Model InvitationCode
   */

  export type AggregateInvitationCode = {
    _count: InvitationCodeCountAggregateOutputType | null
    _min: InvitationCodeMinAggregateOutputType | null
    _max: InvitationCodeMaxAggregateOutputType | null
  }

  export type InvitationCodeMinAggregateOutputType = {
    id: string | null
    code: string | null
    courseId: string | null
    createdAt: Date | null
    expiresAt: Date | null
    isUsed: boolean | null
    usedAt: Date | null
    usedById: string | null
  }

  export type InvitationCodeMaxAggregateOutputType = {
    id: string | null
    code: string | null
    courseId: string | null
    createdAt: Date | null
    expiresAt: Date | null
    isUsed: boolean | null
    usedAt: Date | null
    usedById: string | null
  }

  export type InvitationCodeCountAggregateOutputType = {
    id: number
    code: number
    courseId: number
    createdAt: number
    expiresAt: number
    isUsed: number
    usedAt: number
    usedById: number
    _all: number
  }


  export type InvitationCodeMinAggregateInputType = {
    id?: true
    code?: true
    courseId?: true
    createdAt?: true
    expiresAt?: true
    isUsed?: true
    usedAt?: true
    usedById?: true
  }

  export type InvitationCodeMaxAggregateInputType = {
    id?: true
    code?: true
    courseId?: true
    createdAt?: true
    expiresAt?: true
    isUsed?: true
    usedAt?: true
    usedById?: true
  }

  export type InvitationCodeCountAggregateInputType = {
    id?: true
    code?: true
    courseId?: true
    createdAt?: true
    expiresAt?: true
    isUsed?: true
    usedAt?: true
    usedById?: true
    _all?: true
  }

  export type InvitationCodeAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which InvitationCode to aggregate.
     */
    where?: InvitationCodeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InvitationCodes to fetch.
     */
    orderBy?: InvitationCodeOrderByWithRelationInput | InvitationCodeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: InvitationCodeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InvitationCodes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InvitationCodes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned InvitationCodes
    **/
    _count?: true | InvitationCodeCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: InvitationCodeMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: InvitationCodeMaxAggregateInputType
  }

  export type GetInvitationCodeAggregateType<T extends InvitationCodeAggregateArgs> = {
        [P in keyof T & keyof AggregateInvitationCode]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateInvitationCode[P]>
      : GetScalarType<T[P], AggregateInvitationCode[P]>
  }




  export type InvitationCodeGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: InvitationCodeWhereInput
    orderBy?: InvitationCodeOrderByWithAggregationInput | InvitationCodeOrderByWithAggregationInput[]
    by: InvitationCodeScalarFieldEnum[] | InvitationCodeScalarFieldEnum
    having?: InvitationCodeScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: InvitationCodeCountAggregateInputType | true
    _min?: InvitationCodeMinAggregateInputType
    _max?: InvitationCodeMaxAggregateInputType
  }

  export type InvitationCodeGroupByOutputType = {
    id: string
    code: string
    courseId: string
    createdAt: Date
    expiresAt: Date
    isUsed: boolean
    usedAt: Date | null
    usedById: string | null
    _count: InvitationCodeCountAggregateOutputType | null
    _min: InvitationCodeMinAggregateOutputType | null
    _max: InvitationCodeMaxAggregateOutputType | null
  }

  type GetInvitationCodeGroupByPayload<T extends InvitationCodeGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<InvitationCodeGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof InvitationCodeGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], InvitationCodeGroupByOutputType[P]>
            : GetScalarType<T[P], InvitationCodeGroupByOutputType[P]>
        }
      >
    >


  export type InvitationCodeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    courseId?: boolean
    createdAt?: boolean
    expiresAt?: boolean
    isUsed?: boolean
    usedAt?: boolean
    usedById?: boolean
    course?: boolean | CourseDefaultArgs<ExtArgs>
    usedBy?: boolean | InvitationCode$usedByArgs<ExtArgs>
  }, ExtArgs["result"]["invitationCode"]>

  export type InvitationCodeSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    courseId?: boolean
    createdAt?: boolean
    expiresAt?: boolean
    isUsed?: boolean
    usedAt?: boolean
    usedById?: boolean
    course?: boolean | CourseDefaultArgs<ExtArgs>
    usedBy?: boolean | InvitationCode$usedByArgs<ExtArgs>
  }, ExtArgs["result"]["invitationCode"]>

  export type InvitationCodeSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    courseId?: boolean
    createdAt?: boolean
    expiresAt?: boolean
    isUsed?: boolean
    usedAt?: boolean
    usedById?: boolean
    course?: boolean | CourseDefaultArgs<ExtArgs>
    usedBy?: boolean | InvitationCode$usedByArgs<ExtArgs>
  }, ExtArgs["result"]["invitationCode"]>

  export type InvitationCodeSelectScalar = {
    id?: boolean
    code?: boolean
    courseId?: boolean
    createdAt?: boolean
    expiresAt?: boolean
    isUsed?: boolean
    usedAt?: boolean
    usedById?: boolean
  }

  export type InvitationCodeOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "code" | "courseId" | "createdAt" | "expiresAt" | "isUsed" | "usedAt" | "usedById", ExtArgs["result"]["invitationCode"]>
  export type InvitationCodeInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    course?: boolean | CourseDefaultArgs<ExtArgs>
    usedBy?: boolean | InvitationCode$usedByArgs<ExtArgs>
  }
  export type InvitationCodeIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    course?: boolean | CourseDefaultArgs<ExtArgs>
    usedBy?: boolean | InvitationCode$usedByArgs<ExtArgs>
  }
  export type InvitationCodeIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    course?: boolean | CourseDefaultArgs<ExtArgs>
    usedBy?: boolean | InvitationCode$usedByArgs<ExtArgs>
  }

  export type $InvitationCodePayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "InvitationCode"
    objects: {
      course: Prisma.$CoursePayload<ExtArgs>
      usedBy: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      code: string
      courseId: string
      createdAt: Date
      expiresAt: Date
      isUsed: boolean
      usedAt: Date | null
      usedById: string | null
    }, ExtArgs["result"]["invitationCode"]>
    composites: {}
  }

  export type InvitationCodeGetPayload<S extends boolean | null | undefined | InvitationCodeDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$InvitationCodePayload, S>

  export type InvitationCodeCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> =
    Omit<InvitationCodeFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: InvitationCodeCountAggregateInputType | true
    }

  export interface InvitationCodeDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['InvitationCode'], meta: { name: 'InvitationCode' } }
    /**
     * Find zero or one InvitationCode that matches the filter.
     * @param {InvitationCodeFindUniqueArgs} args - Arguments to find a InvitationCode
     * @example
     * // Get one InvitationCode
     * const invitationCode = await prisma.invitationCode.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends InvitationCodeFindUniqueArgs>(args: SelectSubset<T, InvitationCodeFindUniqueArgs<ExtArgs>>): Prisma__InvitationCodeClient<runtime.Types.Result.GetResult<Prisma.$InvitationCodePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one InvitationCode that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {InvitationCodeFindUniqueOrThrowArgs} args - Arguments to find a InvitationCode
     * @example
     * // Get one InvitationCode
     * const invitationCode = await prisma.invitationCode.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends InvitationCodeFindUniqueOrThrowArgs>(args: SelectSubset<T, InvitationCodeFindUniqueOrThrowArgs<ExtArgs>>): Prisma__InvitationCodeClient<runtime.Types.Result.GetResult<Prisma.$InvitationCodePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first InvitationCode that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvitationCodeFindFirstArgs} args - Arguments to find a InvitationCode
     * @example
     * // Get one InvitationCode
     * const invitationCode = await prisma.invitationCode.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends InvitationCodeFindFirstArgs>(args?: SelectSubset<T, InvitationCodeFindFirstArgs<ExtArgs>>): Prisma__InvitationCodeClient<runtime.Types.Result.GetResult<Prisma.$InvitationCodePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first InvitationCode that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvitationCodeFindFirstOrThrowArgs} args - Arguments to find a InvitationCode
     * @example
     * // Get one InvitationCode
     * const invitationCode = await prisma.invitationCode.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends InvitationCodeFindFirstOrThrowArgs>(args?: SelectSubset<T, InvitationCodeFindFirstOrThrowArgs<ExtArgs>>): Prisma__InvitationCodeClient<runtime.Types.Result.GetResult<Prisma.$InvitationCodePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more InvitationCodes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvitationCodeFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all InvitationCodes
     * const invitationCodes = await prisma.invitationCode.findMany()
     * 
     * // Get first 10 InvitationCodes
     * const invitationCodes = await prisma.invitationCode.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const invitationCodeWithIdOnly = await prisma.invitationCode.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends InvitationCodeFindManyArgs>(args?: SelectSubset<T, InvitationCodeFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$InvitationCodePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a InvitationCode.
     * @param {InvitationCodeCreateArgs} args - Arguments to create a InvitationCode.
     * @example
     * // Create one InvitationCode
     * const InvitationCode = await prisma.invitationCode.create({
     *   data: {
     *     // ... data to create a InvitationCode
     *   }
     * })
     * 
     */
    create<T extends InvitationCodeCreateArgs>(args: SelectSubset<T, InvitationCodeCreateArgs<ExtArgs>>): Prisma__InvitationCodeClient<runtime.Types.Result.GetResult<Prisma.$InvitationCodePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many InvitationCodes.
     * @param {InvitationCodeCreateManyArgs} args - Arguments to create many InvitationCodes.
     * @example
     * // Create many InvitationCodes
     * const invitationCode = await prisma.invitationCode.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends InvitationCodeCreateManyArgs>(args?: SelectSubset<T, InvitationCodeCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many InvitationCodes and returns the data saved in the database.
     * @param {InvitationCodeCreateManyAndReturnArgs} args - Arguments to create many InvitationCodes.
     * @example
     * // Create many InvitationCodes
     * const invitationCode = await prisma.invitationCode.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many InvitationCodes and only return the `id`
     * const invitationCodeWithIdOnly = await prisma.invitationCode.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends InvitationCodeCreateManyAndReturnArgs>(args?: SelectSubset<T, InvitationCodeCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$InvitationCodePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a InvitationCode.
     * @param {InvitationCodeDeleteArgs} args - Arguments to delete one InvitationCode.
     * @example
     * // Delete one InvitationCode
     * const InvitationCode = await prisma.invitationCode.delete({
     *   where: {
     *     // ... filter to delete one InvitationCode
     *   }
     * })
     * 
     */
    delete<T extends InvitationCodeDeleteArgs>(args: SelectSubset<T, InvitationCodeDeleteArgs<ExtArgs>>): Prisma__InvitationCodeClient<runtime.Types.Result.GetResult<Prisma.$InvitationCodePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one InvitationCode.
     * @param {InvitationCodeUpdateArgs} args - Arguments to update one InvitationCode.
     * @example
     * // Update one InvitationCode
     * const invitationCode = await prisma.invitationCode.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends InvitationCodeUpdateArgs>(args: SelectSubset<T, InvitationCodeUpdateArgs<ExtArgs>>): Prisma__InvitationCodeClient<runtime.Types.Result.GetResult<Prisma.$InvitationCodePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more InvitationCodes.
     * @param {InvitationCodeDeleteManyArgs} args - Arguments to filter InvitationCodes to delete.
     * @example
     * // Delete a few InvitationCodes
     * const { count } = await prisma.invitationCode.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends InvitationCodeDeleteManyArgs>(args?: SelectSubset<T, InvitationCodeDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more InvitationCodes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvitationCodeUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many InvitationCodes
     * const invitationCode = await prisma.invitationCode.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends InvitationCodeUpdateManyArgs>(args: SelectSubset<T, InvitationCodeUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more InvitationCodes and returns the data updated in the database.
     * @param {InvitationCodeUpdateManyAndReturnArgs} args - Arguments to update many InvitationCodes.
     * @example
     * // Update many InvitationCodes
     * const invitationCode = await prisma.invitationCode.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more InvitationCodes and only return the `id`
     * const invitationCodeWithIdOnly = await prisma.invitationCode.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends InvitationCodeUpdateManyAndReturnArgs>(args: SelectSubset<T, InvitationCodeUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$InvitationCodePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one InvitationCode.
     * @param {InvitationCodeUpsertArgs} args - Arguments to update or create a InvitationCode.
     * @example
     * // Update or create a InvitationCode
     * const invitationCode = await prisma.invitationCode.upsert({
     *   create: {
     *     // ... data to create a InvitationCode
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the InvitationCode we want to update
     *   }
     * })
     */
    upsert<T extends InvitationCodeUpsertArgs>(args: SelectSubset<T, InvitationCodeUpsertArgs<ExtArgs>>): Prisma__InvitationCodeClient<runtime.Types.Result.GetResult<Prisma.$InvitationCodePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of InvitationCodes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvitationCodeCountArgs} args - Arguments to filter InvitationCodes to count.
     * @example
     * // Count the number of InvitationCodes
     * const count = await prisma.invitationCode.count({
     *   where: {
     *     // ... the filter for the InvitationCodes we want to count
     *   }
     * })
    **/
    count<T extends InvitationCodeCountArgs>(
      args?: Subset<T, InvitationCodeCountArgs>,
    ): Prisma.PrismaPromise<
      T extends runtime.Types.Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], InvitationCodeCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a InvitationCode.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvitationCodeAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends InvitationCodeAggregateArgs>(args: Subset<T, InvitationCodeAggregateArgs>): Prisma.PrismaPromise<GetInvitationCodeAggregateType<T>>

    /**
     * Group by InvitationCode.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvitationCodeGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends InvitationCodeGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: InvitationCodeGroupByArgs['orderBy'] }
        : { orderBy?: InvitationCodeGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, InvitationCodeGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetInvitationCodeGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the InvitationCode model
   */
  readonly fields: InvitationCodeFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for InvitationCode.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__InvitationCodeClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    course<T extends CourseDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CourseDefaultArgs<ExtArgs>>): Prisma__CourseClient<runtime.Types.Result.GetResult<Prisma.$CoursePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    usedBy<T extends InvitationCode$usedByArgs<ExtArgs> = {}>(args?: Subset<T, InvitationCode$usedByArgs<ExtArgs>>): Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>
  }




  /**
   * Fields of the InvitationCode model
   */
  export interface InvitationCodeFieldRefs {
    readonly id: FieldRef<"InvitationCode", 'String'>
    readonly code: FieldRef<"InvitationCode", 'String'>
    readonly courseId: FieldRef<"InvitationCode", 'String'>
    readonly createdAt: FieldRef<"InvitationCode", 'DateTime'>
    readonly expiresAt: FieldRef<"InvitationCode", 'DateTime'>
    readonly isUsed: FieldRef<"InvitationCode", 'Boolean'>
    readonly usedAt: FieldRef<"InvitationCode", 'DateTime'>
    readonly usedById: FieldRef<"InvitationCode", 'String'>
  }
    

  // Custom InputTypes
  /**
   * InvitationCode findUnique
   */
  export type InvitationCodeFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvitationCode
     */
    select?: InvitationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvitationCode
     */
    omit?: InvitationCodeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvitationCodeInclude<ExtArgs> | null
    /**
     * Filter, which InvitationCode to fetch.
     */
    where: InvitationCodeWhereUniqueInput
  }

  /**
   * InvitationCode findUniqueOrThrow
   */
  export type InvitationCodeFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvitationCode
     */
    select?: InvitationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvitationCode
     */
    omit?: InvitationCodeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvitationCodeInclude<ExtArgs> | null
    /**
     * Filter, which InvitationCode to fetch.
     */
    where: InvitationCodeWhereUniqueInput
  }

  /**
   * InvitationCode findFirst
   */
  export type InvitationCodeFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvitationCode
     */
    select?: InvitationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvitationCode
     */
    omit?: InvitationCodeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvitationCodeInclude<ExtArgs> | null
    /**
     * Filter, which InvitationCode to fetch.
     */
    where?: InvitationCodeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InvitationCodes to fetch.
     */
    orderBy?: InvitationCodeOrderByWithRelationInput | InvitationCodeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for InvitationCodes.
     */
    cursor?: InvitationCodeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InvitationCodes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InvitationCodes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of InvitationCodes.
     */
    distinct?: InvitationCodeScalarFieldEnum | InvitationCodeScalarFieldEnum[]
  }

  /**
   * InvitationCode findFirstOrThrow
   */
  export type InvitationCodeFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvitationCode
     */
    select?: InvitationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvitationCode
     */
    omit?: InvitationCodeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvitationCodeInclude<ExtArgs> | null
    /**
     * Filter, which InvitationCode to fetch.
     */
    where?: InvitationCodeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InvitationCodes to fetch.
     */
    orderBy?: InvitationCodeOrderByWithRelationInput | InvitationCodeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for InvitationCodes.
     */
    cursor?: InvitationCodeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InvitationCodes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InvitationCodes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of InvitationCodes.
     */
    distinct?: InvitationCodeScalarFieldEnum | InvitationCodeScalarFieldEnum[]
  }

  /**
   * InvitationCode findMany
   */
  export type InvitationCodeFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvitationCode
     */
    select?: InvitationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvitationCode
     */
    omit?: InvitationCodeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvitationCodeInclude<ExtArgs> | null
    /**
     * Filter, which InvitationCodes to fetch.
     */
    where?: InvitationCodeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InvitationCodes to fetch.
     */
    orderBy?: InvitationCodeOrderByWithRelationInput | InvitationCodeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing InvitationCodes.
     */
    cursor?: InvitationCodeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InvitationCodes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InvitationCodes.
     */
    skip?: number
    distinct?: InvitationCodeScalarFieldEnum | InvitationCodeScalarFieldEnum[]
  }

  /**
   * InvitationCode create
   */
  export type InvitationCodeCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvitationCode
     */
    select?: InvitationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvitationCode
     */
    omit?: InvitationCodeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvitationCodeInclude<ExtArgs> | null
    /**
     * The data needed to create a InvitationCode.
     */
    data: XOR<InvitationCodeCreateInput, InvitationCodeUncheckedCreateInput>
  }

  /**
   * InvitationCode createMany
   */
  export type InvitationCodeCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many InvitationCodes.
     */
    data: InvitationCodeCreateManyInput | InvitationCodeCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * InvitationCode createManyAndReturn
   */
  export type InvitationCodeCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvitationCode
     */
    select?: InvitationCodeSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the InvitationCode
     */
    omit?: InvitationCodeOmit<ExtArgs> | null
    /**
     * The data used to create many InvitationCodes.
     */
    data: InvitationCodeCreateManyInput | InvitationCodeCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvitationCodeIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * InvitationCode update
   */
  export type InvitationCodeUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvitationCode
     */
    select?: InvitationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvitationCode
     */
    omit?: InvitationCodeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvitationCodeInclude<ExtArgs> | null
    /**
     * The data needed to update a InvitationCode.
     */
    data: XOR<InvitationCodeUpdateInput, InvitationCodeUncheckedUpdateInput>
    /**
     * Choose, which InvitationCode to update.
     */
    where: InvitationCodeWhereUniqueInput
  }

  /**
   * InvitationCode updateMany
   */
  export type InvitationCodeUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update InvitationCodes.
     */
    data: XOR<InvitationCodeUpdateManyMutationInput, InvitationCodeUncheckedUpdateManyInput>
    /**
     * Filter which InvitationCodes to update
     */
    where?: InvitationCodeWhereInput
    /**
     * Limit how many InvitationCodes to update.
     */
    limit?: number
  }

  /**
   * InvitationCode updateManyAndReturn
   */
  export type InvitationCodeUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvitationCode
     */
    select?: InvitationCodeSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the InvitationCode
     */
    omit?: InvitationCodeOmit<ExtArgs> | null
    /**
     * The data used to update InvitationCodes.
     */
    data: XOR<InvitationCodeUpdateManyMutationInput, InvitationCodeUncheckedUpdateManyInput>
    /**
     * Filter which InvitationCodes to update
     */
    where?: InvitationCodeWhereInput
    /**
     * Limit how many InvitationCodes to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvitationCodeIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * InvitationCode upsert
   */
  export type InvitationCodeUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvitationCode
     */
    select?: InvitationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvitationCode
     */
    omit?: InvitationCodeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvitationCodeInclude<ExtArgs> | null
    /**
     * The filter to search for the InvitationCode to update in case it exists.
     */
    where: InvitationCodeWhereUniqueInput
    /**
     * In case the InvitationCode found by the `where` argument doesn't exist, create a new InvitationCode with this data.
     */
    create: XOR<InvitationCodeCreateInput, InvitationCodeUncheckedCreateInput>
    /**
     * In case the InvitationCode was found with the provided `where` argument, update it with this data.
     */
    update: XOR<InvitationCodeUpdateInput, InvitationCodeUncheckedUpdateInput>
  }

  /**
   * InvitationCode delete
   */
  export type InvitationCodeDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvitationCode
     */
    select?: InvitationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvitationCode
     */
    omit?: InvitationCodeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvitationCodeInclude<ExtArgs> | null
    /**
     * Filter which InvitationCode to delete.
     */
    where: InvitationCodeWhereUniqueInput
  }

  /**
   * InvitationCode deleteMany
   */
  export type InvitationCodeDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which InvitationCodes to delete
     */
    where?: InvitationCodeWhereInput
    /**
     * Limit how many InvitationCodes to delete.
     */
    limit?: number
  }

  /**
   * InvitationCode.usedBy
   */
  export type InvitationCode$usedByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * InvitationCode without action
   */
  export type InvitationCodeDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvitationCode
     */
    select?: InvitationCodeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvitationCode
     */
    omit?: InvitationCodeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvitationCodeInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel = runtime.makeStrictEnum({
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  } as const)

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum = {
    id: 'id',
    email: 'email',
    role: 'role',
    name: 'name',
    picture: 'picture',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  } as const

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const CourseScalarFieldEnum = {
    id: 'id',
    name: 'name',
    description: 'description',
    teacherId: 'teacherId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  } as const

  export type CourseScalarFieldEnum = (typeof CourseScalarFieldEnum)[keyof typeof CourseScalarFieldEnum]


  export const AssignmentAreaScalarFieldEnum = {
    id: 'id',
    name: 'name',
    description: 'description',
    courseId: 'courseId',
    rubricId: 'rubricId',
    dueDate: 'dueDate',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  } as const

  export type AssignmentAreaScalarFieldEnum = (typeof AssignmentAreaScalarFieldEnum)[keyof typeof AssignmentAreaScalarFieldEnum]


  export const SubmissionScalarFieldEnum = {
    id: 'id',
    studentId: 'studentId',
    assignmentAreaId: 'assignmentAreaId',
    filePath: 'filePath',
    uploadedAt: 'uploadedAt',
    aiAnalysisResult: 'aiAnalysisResult',
    finalScore: 'finalScore',
    teacherFeedback: 'teacherFeedback',
    status: 'status',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  } as const

  export type SubmissionScalarFieldEnum = (typeof SubmissionScalarFieldEnum)[keyof typeof SubmissionScalarFieldEnum]


  export const RubricScalarFieldEnum = {
    id: 'id',
    userId: 'userId',
    teacherId: 'teacherId',
    name: 'name',
    description: 'description',
    version: 'version',
    isActive: 'isActive',
    isTemplate: 'isTemplate',
    criteria: 'criteria',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  } as const

  export type RubricScalarFieldEnum = (typeof RubricScalarFieldEnum)[keyof typeof RubricScalarFieldEnum]


  export const GradingSessionScalarFieldEnum = {
    id: 'id',
    userId: 'userId',
    status: 'status',
    progress: 'progress',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  } as const

  export type GradingSessionScalarFieldEnum = (typeof GradingSessionScalarFieldEnum)[keyof typeof GradingSessionScalarFieldEnum]


  export const UploadedFileScalarFieldEnum = {
    id: 'id',
    userId: 'userId',
    fileName: 'fileName',
    originalFileName: 'originalFileName',
    fileKey: 'fileKey',
    fileSize: 'fileSize',
    mimeType: 'mimeType',
    parseStatus: 'parseStatus',
    parsedContent: 'parsedContent',
    parseError: 'parseError',
    isDeleted: 'isDeleted',
    deletedAt: 'deletedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    expiresAt: 'expiresAt'
  } as const

  export type UploadedFileScalarFieldEnum = (typeof UploadedFileScalarFieldEnum)[keyof typeof UploadedFileScalarFieldEnum]


  export const GradingResultScalarFieldEnum = {
    id: 'id',
    gradingSessionId: 'gradingSessionId',
    uploadedFileId: 'uploadedFileId',
    rubricId: 'rubricId',
    status: 'status',
    progress: 'progress',
    result: 'result',
    errorMessage: 'errorMessage',
    gradingModel: 'gradingModel',
    gradingTokens: 'gradingTokens',
    gradingDuration: 'gradingDuration',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    completedAt: 'completedAt'
  } as const

  export type GradingResultScalarFieldEnum = (typeof GradingResultScalarFieldEnum)[keyof typeof GradingResultScalarFieldEnum]


  export const EnrollmentScalarFieldEnum = {
    id: 'id',
    studentId: 'studentId',
    courseId: 'courseId',
    enrolledAt: 'enrolledAt'
  } as const

  export type EnrollmentScalarFieldEnum = (typeof EnrollmentScalarFieldEnum)[keyof typeof EnrollmentScalarFieldEnum]


  export const InvitationCodeScalarFieldEnum = {
    id: 'id',
    code: 'code',
    courseId: 'courseId',
    createdAt: 'createdAt',
    expiresAt: 'expiresAt',
    isUsed: 'isUsed',
    usedAt: 'usedAt',
    usedById: 'usedById'
  } as const

  export type InvitationCodeScalarFieldEnum = (typeof InvitationCodeScalarFieldEnum)[keyof typeof InvitationCodeScalarFieldEnum]


  export const SortOrder = {
    asc: 'asc',
    desc: 'desc'
  } as const

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullableJsonNullValueInput = {
    DbNull: DbNull,
    JsonNull: JsonNull
  } as const

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const JsonNullValueInput = {
    JsonNull: JsonNull
  } as const

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode = {
    default: 'default',
    insensitive: 'insensitive'
  } as const

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder = {
    first: 'first',
    last: 'last'
  } as const

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter = {
    DbNull: DbNull,
    JsonNull: JsonNull,
    AnyNull: AnyNull
  } as const

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'UserRole'
   */
  export type EnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole'>
    


  /**
   * Reference to a field of type 'UserRole[]'
   */
  export type ListEnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'SubmissionStatus'
   */
  export type EnumSubmissionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubmissionStatus'>
    


  /**
   * Reference to a field of type 'SubmissionStatus[]'
   */
  export type ListEnumSubmissionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubmissionStatus[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'GradingSessionStatus'
   */
  export type EnumGradingSessionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'GradingSessionStatus'>
    


  /**
   * Reference to a field of type 'GradingSessionStatus[]'
   */
  export type ListEnumGradingSessionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'GradingSessionStatus[]'>
    


  /**
   * Reference to a field of type 'FileParseStatus'
   */
  export type EnumFileParseStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'FileParseStatus'>
    


  /**
   * Reference to a field of type 'FileParseStatus[]'
   */
  export type ListEnumFileParseStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'FileParseStatus[]'>
    


  /**
   * Reference to a field of type 'GradingStatus'
   */
  export type EnumGradingStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'GradingStatus'>
    


  /**
   * Reference to a field of type 'GradingStatus[]'
   */
  export type ListEnumGradingStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'GradingStatus[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    role?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    name?: StringFilter<"User"> | string
    picture?: StringFilter<"User"> | string
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    rubrics?: RubricListRelationFilter
    gradingSessions?: GradingSessionListRelationFilter
    uploadedFiles?: UploadedFileListRelationFilter
    courses?: CourseListRelationFilter
    teacherRubrics?: RubricListRelationFilter
    submissions?: SubmissionListRelationFilter
    enrollments?: EnrollmentListRelationFilter
    usedInvitations?: InvitationCodeListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    role?: SortOrder
    name?: SortOrder
    picture?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    rubrics?: RubricOrderByRelationAggregateInput
    gradingSessions?: GradingSessionOrderByRelationAggregateInput
    uploadedFiles?: UploadedFileOrderByRelationAggregateInput
    courses?: CourseOrderByRelationAggregateInput
    teacherRubrics?: RubricOrderByRelationAggregateInput
    submissions?: SubmissionOrderByRelationAggregateInput
    enrollments?: EnrollmentOrderByRelationAggregateInput
    usedInvitations?: InvitationCodeOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    role?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    name?: StringFilter<"User"> | string
    picture?: StringFilter<"User"> | string
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    rubrics?: RubricListRelationFilter
    gradingSessions?: GradingSessionListRelationFilter
    uploadedFiles?: UploadedFileListRelationFilter
    courses?: CourseListRelationFilter
    teacherRubrics?: RubricListRelationFilter
    submissions?: SubmissionListRelationFilter
    enrollments?: EnrollmentListRelationFilter
    usedInvitations?: InvitationCodeListRelationFilter
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
    role?: SortOrder
    name?: SortOrder
    picture?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    role?: EnumUserRoleWithAggregatesFilter<"User"> | $Enums.UserRole
    name?: StringWithAggregatesFilter<"User"> | string
    picture?: StringWithAggregatesFilter<"User"> | string
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type CourseWhereInput = {
    AND?: CourseWhereInput | CourseWhereInput[]
    OR?: CourseWhereInput[]
    NOT?: CourseWhereInput | CourseWhereInput[]
    id?: StringFilter<"Course"> | string
    name?: StringFilter<"Course"> | string
    description?: StringNullableFilter<"Course"> | string | null
    teacherId?: StringFilter<"Course"> | string
    createdAt?: DateTimeFilter<"Course"> | Date | string
    updatedAt?: DateTimeFilter<"Course"> | Date | string
    teacher?: XOR<UserScalarRelationFilter, UserWhereInput>
    assignmentAreas?: AssignmentAreaListRelationFilter
    enrollments?: EnrollmentListRelationFilter
    invitationCodes?: InvitationCodeListRelationFilter
  }

  export type CourseOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    teacherId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    teacher?: UserOrderByWithRelationInput
    assignmentAreas?: AssignmentAreaOrderByRelationAggregateInput
    enrollments?: EnrollmentOrderByRelationAggregateInput
    invitationCodes?: InvitationCodeOrderByRelationAggregateInput
  }

  export type CourseWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: CourseWhereInput | CourseWhereInput[]
    OR?: CourseWhereInput[]
    NOT?: CourseWhereInput | CourseWhereInput[]
    name?: StringFilter<"Course"> | string
    description?: StringNullableFilter<"Course"> | string | null
    teacherId?: StringFilter<"Course"> | string
    createdAt?: DateTimeFilter<"Course"> | Date | string
    updatedAt?: DateTimeFilter<"Course"> | Date | string
    teacher?: XOR<UserScalarRelationFilter, UserWhereInput>
    assignmentAreas?: AssignmentAreaListRelationFilter
    enrollments?: EnrollmentListRelationFilter
    invitationCodes?: InvitationCodeListRelationFilter
  }, "id">

  export type CourseOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    teacherId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: CourseCountOrderByAggregateInput
    _max?: CourseMaxOrderByAggregateInput
    _min?: CourseMinOrderByAggregateInput
  }

  export type CourseScalarWhereWithAggregatesInput = {
    AND?: CourseScalarWhereWithAggregatesInput | CourseScalarWhereWithAggregatesInput[]
    OR?: CourseScalarWhereWithAggregatesInput[]
    NOT?: CourseScalarWhereWithAggregatesInput | CourseScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Course"> | string
    name?: StringWithAggregatesFilter<"Course"> | string
    description?: StringNullableWithAggregatesFilter<"Course"> | string | null
    teacherId?: StringWithAggregatesFilter<"Course"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Course"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Course"> | Date | string
  }

  export type AssignmentAreaWhereInput = {
    AND?: AssignmentAreaWhereInput | AssignmentAreaWhereInput[]
    OR?: AssignmentAreaWhereInput[]
    NOT?: AssignmentAreaWhereInput | AssignmentAreaWhereInput[]
    id?: StringFilter<"AssignmentArea"> | string
    name?: StringFilter<"AssignmentArea"> | string
    description?: StringNullableFilter<"AssignmentArea"> | string | null
    courseId?: StringFilter<"AssignmentArea"> | string
    rubricId?: StringFilter<"AssignmentArea"> | string
    dueDate?: DateTimeNullableFilter<"AssignmentArea"> | Date | string | null
    createdAt?: DateTimeFilter<"AssignmentArea"> | Date | string
    updatedAt?: DateTimeFilter<"AssignmentArea"> | Date | string
    course?: XOR<CourseScalarRelationFilter, CourseWhereInput>
    rubric?: XOR<RubricScalarRelationFilter, RubricWhereInput>
    submissions?: SubmissionListRelationFilter
  }

  export type AssignmentAreaOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    courseId?: SortOrder
    rubricId?: SortOrder
    dueDate?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    course?: CourseOrderByWithRelationInput
    rubric?: RubricOrderByWithRelationInput
    submissions?: SubmissionOrderByRelationAggregateInput
  }

  export type AssignmentAreaWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AssignmentAreaWhereInput | AssignmentAreaWhereInput[]
    OR?: AssignmentAreaWhereInput[]
    NOT?: AssignmentAreaWhereInput | AssignmentAreaWhereInput[]
    name?: StringFilter<"AssignmentArea"> | string
    description?: StringNullableFilter<"AssignmentArea"> | string | null
    courseId?: StringFilter<"AssignmentArea"> | string
    rubricId?: StringFilter<"AssignmentArea"> | string
    dueDate?: DateTimeNullableFilter<"AssignmentArea"> | Date | string | null
    createdAt?: DateTimeFilter<"AssignmentArea"> | Date | string
    updatedAt?: DateTimeFilter<"AssignmentArea"> | Date | string
    course?: XOR<CourseScalarRelationFilter, CourseWhereInput>
    rubric?: XOR<RubricScalarRelationFilter, RubricWhereInput>
    submissions?: SubmissionListRelationFilter
  }, "id">

  export type AssignmentAreaOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    courseId?: SortOrder
    rubricId?: SortOrder
    dueDate?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: AssignmentAreaCountOrderByAggregateInput
    _max?: AssignmentAreaMaxOrderByAggregateInput
    _min?: AssignmentAreaMinOrderByAggregateInput
  }

  export type AssignmentAreaScalarWhereWithAggregatesInput = {
    AND?: AssignmentAreaScalarWhereWithAggregatesInput | AssignmentAreaScalarWhereWithAggregatesInput[]
    OR?: AssignmentAreaScalarWhereWithAggregatesInput[]
    NOT?: AssignmentAreaScalarWhereWithAggregatesInput | AssignmentAreaScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AssignmentArea"> | string
    name?: StringWithAggregatesFilter<"AssignmentArea"> | string
    description?: StringNullableWithAggregatesFilter<"AssignmentArea"> | string | null
    courseId?: StringWithAggregatesFilter<"AssignmentArea"> | string
    rubricId?: StringWithAggregatesFilter<"AssignmentArea"> | string
    dueDate?: DateTimeNullableWithAggregatesFilter<"AssignmentArea"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"AssignmentArea"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"AssignmentArea"> | Date | string
  }

  export type SubmissionWhereInput = {
    AND?: SubmissionWhereInput | SubmissionWhereInput[]
    OR?: SubmissionWhereInput[]
    NOT?: SubmissionWhereInput | SubmissionWhereInput[]
    id?: StringFilter<"Submission"> | string
    studentId?: StringFilter<"Submission"> | string
    assignmentAreaId?: StringFilter<"Submission"> | string
    filePath?: StringFilter<"Submission"> | string
    uploadedAt?: DateTimeFilter<"Submission"> | Date | string
    aiAnalysisResult?: JsonNullableFilter<"Submission">
    finalScore?: IntNullableFilter<"Submission"> | number | null
    teacherFeedback?: StringNullableFilter<"Submission"> | string | null
    status?: EnumSubmissionStatusFilter<"Submission"> | $Enums.SubmissionStatus
    createdAt?: DateTimeFilter<"Submission"> | Date | string
    updatedAt?: DateTimeFilter<"Submission"> | Date | string
    student?: XOR<UserScalarRelationFilter, UserWhereInput>
    assignmentArea?: XOR<AssignmentAreaScalarRelationFilter, AssignmentAreaWhereInput>
  }

  export type SubmissionOrderByWithRelationInput = {
    id?: SortOrder
    studentId?: SortOrder
    assignmentAreaId?: SortOrder
    filePath?: SortOrder
    uploadedAt?: SortOrder
    aiAnalysisResult?: SortOrderInput | SortOrder
    finalScore?: SortOrderInput | SortOrder
    teacherFeedback?: SortOrderInput | SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    student?: UserOrderByWithRelationInput
    assignmentArea?: AssignmentAreaOrderByWithRelationInput
  }

  export type SubmissionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: SubmissionWhereInput | SubmissionWhereInput[]
    OR?: SubmissionWhereInput[]
    NOT?: SubmissionWhereInput | SubmissionWhereInput[]
    studentId?: StringFilter<"Submission"> | string
    assignmentAreaId?: StringFilter<"Submission"> | string
    filePath?: StringFilter<"Submission"> | string
    uploadedAt?: DateTimeFilter<"Submission"> | Date | string
    aiAnalysisResult?: JsonNullableFilter<"Submission">
    finalScore?: IntNullableFilter<"Submission"> | number | null
    teacherFeedback?: StringNullableFilter<"Submission"> | string | null
    status?: EnumSubmissionStatusFilter<"Submission"> | $Enums.SubmissionStatus
    createdAt?: DateTimeFilter<"Submission"> | Date | string
    updatedAt?: DateTimeFilter<"Submission"> | Date | string
    student?: XOR<UserScalarRelationFilter, UserWhereInput>
    assignmentArea?: XOR<AssignmentAreaScalarRelationFilter, AssignmentAreaWhereInput>
  }, "id">

  export type SubmissionOrderByWithAggregationInput = {
    id?: SortOrder
    studentId?: SortOrder
    assignmentAreaId?: SortOrder
    filePath?: SortOrder
    uploadedAt?: SortOrder
    aiAnalysisResult?: SortOrderInput | SortOrder
    finalScore?: SortOrderInput | SortOrder
    teacherFeedback?: SortOrderInput | SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: SubmissionCountOrderByAggregateInput
    _avg?: SubmissionAvgOrderByAggregateInput
    _max?: SubmissionMaxOrderByAggregateInput
    _min?: SubmissionMinOrderByAggregateInput
    _sum?: SubmissionSumOrderByAggregateInput
  }

  export type SubmissionScalarWhereWithAggregatesInput = {
    AND?: SubmissionScalarWhereWithAggregatesInput | SubmissionScalarWhereWithAggregatesInput[]
    OR?: SubmissionScalarWhereWithAggregatesInput[]
    NOT?: SubmissionScalarWhereWithAggregatesInput | SubmissionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Submission"> | string
    studentId?: StringWithAggregatesFilter<"Submission"> | string
    assignmentAreaId?: StringWithAggregatesFilter<"Submission"> | string
    filePath?: StringWithAggregatesFilter<"Submission"> | string
    uploadedAt?: DateTimeWithAggregatesFilter<"Submission"> | Date | string
    aiAnalysisResult?: JsonNullableWithAggregatesFilter<"Submission">
    finalScore?: IntNullableWithAggregatesFilter<"Submission"> | number | null
    teacherFeedback?: StringNullableWithAggregatesFilter<"Submission"> | string | null
    status?: EnumSubmissionStatusWithAggregatesFilter<"Submission"> | $Enums.SubmissionStatus
    createdAt?: DateTimeWithAggregatesFilter<"Submission"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Submission"> | Date | string
  }

  export type RubricWhereInput = {
    AND?: RubricWhereInput | RubricWhereInput[]
    OR?: RubricWhereInput[]
    NOT?: RubricWhereInput | RubricWhereInput[]
    id?: StringFilter<"Rubric"> | string
    userId?: StringFilter<"Rubric"> | string
    teacherId?: StringNullableFilter<"Rubric"> | string | null
    name?: StringFilter<"Rubric"> | string
    description?: StringFilter<"Rubric"> | string
    version?: IntFilter<"Rubric"> | number
    isActive?: BoolFilter<"Rubric"> | boolean
    isTemplate?: BoolFilter<"Rubric"> | boolean
    criteria?: JsonFilter<"Rubric">
    createdAt?: DateTimeFilter<"Rubric"> | Date | string
    updatedAt?: DateTimeFilter<"Rubric"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    teacher?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    gradingResults?: GradingResultListRelationFilter
    assignmentAreas?: AssignmentAreaListRelationFilter
  }

  export type RubricOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    teacherId?: SortOrderInput | SortOrder
    name?: SortOrder
    description?: SortOrder
    version?: SortOrder
    isActive?: SortOrder
    isTemplate?: SortOrder
    criteria?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    teacher?: UserOrderByWithRelationInput
    gradingResults?: GradingResultOrderByRelationAggregateInput
    assignmentAreas?: AssignmentAreaOrderByRelationAggregateInput
  }

  export type RubricWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RubricWhereInput | RubricWhereInput[]
    OR?: RubricWhereInput[]
    NOT?: RubricWhereInput | RubricWhereInput[]
    userId?: StringFilter<"Rubric"> | string
    teacherId?: StringNullableFilter<"Rubric"> | string | null
    name?: StringFilter<"Rubric"> | string
    description?: StringFilter<"Rubric"> | string
    version?: IntFilter<"Rubric"> | number
    isActive?: BoolFilter<"Rubric"> | boolean
    isTemplate?: BoolFilter<"Rubric"> | boolean
    criteria?: JsonFilter<"Rubric">
    createdAt?: DateTimeFilter<"Rubric"> | Date | string
    updatedAt?: DateTimeFilter<"Rubric"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    teacher?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    gradingResults?: GradingResultListRelationFilter
    assignmentAreas?: AssignmentAreaListRelationFilter
  }, "id">

  export type RubricOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    teacherId?: SortOrderInput | SortOrder
    name?: SortOrder
    description?: SortOrder
    version?: SortOrder
    isActive?: SortOrder
    isTemplate?: SortOrder
    criteria?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: RubricCountOrderByAggregateInput
    _avg?: RubricAvgOrderByAggregateInput
    _max?: RubricMaxOrderByAggregateInput
    _min?: RubricMinOrderByAggregateInput
    _sum?: RubricSumOrderByAggregateInput
  }

  export type RubricScalarWhereWithAggregatesInput = {
    AND?: RubricScalarWhereWithAggregatesInput | RubricScalarWhereWithAggregatesInput[]
    OR?: RubricScalarWhereWithAggregatesInput[]
    NOT?: RubricScalarWhereWithAggregatesInput | RubricScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Rubric"> | string
    userId?: StringWithAggregatesFilter<"Rubric"> | string
    teacherId?: StringNullableWithAggregatesFilter<"Rubric"> | string | null
    name?: StringWithAggregatesFilter<"Rubric"> | string
    description?: StringWithAggregatesFilter<"Rubric"> | string
    version?: IntWithAggregatesFilter<"Rubric"> | number
    isActive?: BoolWithAggregatesFilter<"Rubric"> | boolean
    isTemplate?: BoolWithAggregatesFilter<"Rubric"> | boolean
    criteria?: JsonWithAggregatesFilter<"Rubric">
    createdAt?: DateTimeWithAggregatesFilter<"Rubric"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Rubric"> | Date | string
  }

  export type GradingSessionWhereInput = {
    AND?: GradingSessionWhereInput | GradingSessionWhereInput[]
    OR?: GradingSessionWhereInput[]
    NOT?: GradingSessionWhereInput | GradingSessionWhereInput[]
    id?: StringFilter<"GradingSession"> | string
    userId?: StringFilter<"GradingSession"> | string
    status?: EnumGradingSessionStatusFilter<"GradingSession"> | $Enums.GradingSessionStatus
    progress?: IntFilter<"GradingSession"> | number
    createdAt?: DateTimeFilter<"GradingSession"> | Date | string
    updatedAt?: DateTimeFilter<"GradingSession"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    gradingResults?: GradingResultListRelationFilter
  }

  export type GradingSessionOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    progress?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    gradingResults?: GradingResultOrderByRelationAggregateInput
  }

  export type GradingSessionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: GradingSessionWhereInput | GradingSessionWhereInput[]
    OR?: GradingSessionWhereInput[]
    NOT?: GradingSessionWhereInput | GradingSessionWhereInput[]
    userId?: StringFilter<"GradingSession"> | string
    status?: EnumGradingSessionStatusFilter<"GradingSession"> | $Enums.GradingSessionStatus
    progress?: IntFilter<"GradingSession"> | number
    createdAt?: DateTimeFilter<"GradingSession"> | Date | string
    updatedAt?: DateTimeFilter<"GradingSession"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    gradingResults?: GradingResultListRelationFilter
  }, "id">

  export type GradingSessionOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    progress?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: GradingSessionCountOrderByAggregateInput
    _avg?: GradingSessionAvgOrderByAggregateInput
    _max?: GradingSessionMaxOrderByAggregateInput
    _min?: GradingSessionMinOrderByAggregateInput
    _sum?: GradingSessionSumOrderByAggregateInput
  }

  export type GradingSessionScalarWhereWithAggregatesInput = {
    AND?: GradingSessionScalarWhereWithAggregatesInput | GradingSessionScalarWhereWithAggregatesInput[]
    OR?: GradingSessionScalarWhereWithAggregatesInput[]
    NOT?: GradingSessionScalarWhereWithAggregatesInput | GradingSessionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"GradingSession"> | string
    userId?: StringWithAggregatesFilter<"GradingSession"> | string
    status?: EnumGradingSessionStatusWithAggregatesFilter<"GradingSession"> | $Enums.GradingSessionStatus
    progress?: IntWithAggregatesFilter<"GradingSession"> | number
    createdAt?: DateTimeWithAggregatesFilter<"GradingSession"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"GradingSession"> | Date | string
  }

  export type UploadedFileWhereInput = {
    AND?: UploadedFileWhereInput | UploadedFileWhereInput[]
    OR?: UploadedFileWhereInput[]
    NOT?: UploadedFileWhereInput | UploadedFileWhereInput[]
    id?: StringFilter<"UploadedFile"> | string
    userId?: StringFilter<"UploadedFile"> | string
    fileName?: StringFilter<"UploadedFile"> | string
    originalFileName?: StringFilter<"UploadedFile"> | string
    fileKey?: StringFilter<"UploadedFile"> | string
    fileSize?: IntFilter<"UploadedFile"> | number
    mimeType?: StringFilter<"UploadedFile"> | string
    parseStatus?: EnumFileParseStatusFilter<"UploadedFile"> | $Enums.FileParseStatus
    parsedContent?: StringNullableFilter<"UploadedFile"> | string | null
    parseError?: StringNullableFilter<"UploadedFile"> | string | null
    isDeleted?: BoolFilter<"UploadedFile"> | boolean
    deletedAt?: DateTimeNullableFilter<"UploadedFile"> | Date | string | null
    createdAt?: DateTimeFilter<"UploadedFile"> | Date | string
    updatedAt?: DateTimeFilter<"UploadedFile"> | Date | string
    expiresAt?: DateTimeNullableFilter<"UploadedFile"> | Date | string | null
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    gradingResults?: GradingResultListRelationFilter
  }

  export type UploadedFileOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    fileName?: SortOrder
    originalFileName?: SortOrder
    fileKey?: SortOrder
    fileSize?: SortOrder
    mimeType?: SortOrder
    parseStatus?: SortOrder
    parsedContent?: SortOrderInput | SortOrder
    parseError?: SortOrderInput | SortOrder
    isDeleted?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    expiresAt?: SortOrderInput | SortOrder
    user?: UserOrderByWithRelationInput
    gradingResults?: GradingResultOrderByRelationAggregateInput
  }

  export type UploadedFileWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    fileKey?: string
    AND?: UploadedFileWhereInput | UploadedFileWhereInput[]
    OR?: UploadedFileWhereInput[]
    NOT?: UploadedFileWhereInput | UploadedFileWhereInput[]
    userId?: StringFilter<"UploadedFile"> | string
    fileName?: StringFilter<"UploadedFile"> | string
    originalFileName?: StringFilter<"UploadedFile"> | string
    fileSize?: IntFilter<"UploadedFile"> | number
    mimeType?: StringFilter<"UploadedFile"> | string
    parseStatus?: EnumFileParseStatusFilter<"UploadedFile"> | $Enums.FileParseStatus
    parsedContent?: StringNullableFilter<"UploadedFile"> | string | null
    parseError?: StringNullableFilter<"UploadedFile"> | string | null
    isDeleted?: BoolFilter<"UploadedFile"> | boolean
    deletedAt?: DateTimeNullableFilter<"UploadedFile"> | Date | string | null
    createdAt?: DateTimeFilter<"UploadedFile"> | Date | string
    updatedAt?: DateTimeFilter<"UploadedFile"> | Date | string
    expiresAt?: DateTimeNullableFilter<"UploadedFile"> | Date | string | null
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    gradingResults?: GradingResultListRelationFilter
  }, "id" | "fileKey">

  export type UploadedFileOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    fileName?: SortOrder
    originalFileName?: SortOrder
    fileKey?: SortOrder
    fileSize?: SortOrder
    mimeType?: SortOrder
    parseStatus?: SortOrder
    parsedContent?: SortOrderInput | SortOrder
    parseError?: SortOrderInput | SortOrder
    isDeleted?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    expiresAt?: SortOrderInput | SortOrder
    _count?: UploadedFileCountOrderByAggregateInput
    _avg?: UploadedFileAvgOrderByAggregateInput
    _max?: UploadedFileMaxOrderByAggregateInput
    _min?: UploadedFileMinOrderByAggregateInput
    _sum?: UploadedFileSumOrderByAggregateInput
  }

  export type UploadedFileScalarWhereWithAggregatesInput = {
    AND?: UploadedFileScalarWhereWithAggregatesInput | UploadedFileScalarWhereWithAggregatesInput[]
    OR?: UploadedFileScalarWhereWithAggregatesInput[]
    NOT?: UploadedFileScalarWhereWithAggregatesInput | UploadedFileScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"UploadedFile"> | string
    userId?: StringWithAggregatesFilter<"UploadedFile"> | string
    fileName?: StringWithAggregatesFilter<"UploadedFile"> | string
    originalFileName?: StringWithAggregatesFilter<"UploadedFile"> | string
    fileKey?: StringWithAggregatesFilter<"UploadedFile"> | string
    fileSize?: IntWithAggregatesFilter<"UploadedFile"> | number
    mimeType?: StringWithAggregatesFilter<"UploadedFile"> | string
    parseStatus?: EnumFileParseStatusWithAggregatesFilter<"UploadedFile"> | $Enums.FileParseStatus
    parsedContent?: StringNullableWithAggregatesFilter<"UploadedFile"> | string | null
    parseError?: StringNullableWithAggregatesFilter<"UploadedFile"> | string | null
    isDeleted?: BoolWithAggregatesFilter<"UploadedFile"> | boolean
    deletedAt?: DateTimeNullableWithAggregatesFilter<"UploadedFile"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"UploadedFile"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"UploadedFile"> | Date | string
    expiresAt?: DateTimeNullableWithAggregatesFilter<"UploadedFile"> | Date | string | null
  }

  export type GradingResultWhereInput = {
    AND?: GradingResultWhereInput | GradingResultWhereInput[]
    OR?: GradingResultWhereInput[]
    NOT?: GradingResultWhereInput | GradingResultWhereInput[]
    id?: StringFilter<"GradingResult"> | string
    gradingSessionId?: StringFilter<"GradingResult"> | string
    uploadedFileId?: StringFilter<"GradingResult"> | string
    rubricId?: StringFilter<"GradingResult"> | string
    status?: EnumGradingStatusFilter<"GradingResult"> | $Enums.GradingStatus
    progress?: IntFilter<"GradingResult"> | number
    result?: JsonNullableFilter<"GradingResult">
    errorMessage?: StringNullableFilter<"GradingResult"> | string | null
    gradingModel?: StringNullableFilter<"GradingResult"> | string | null
    gradingTokens?: IntNullableFilter<"GradingResult"> | number | null
    gradingDuration?: IntNullableFilter<"GradingResult"> | number | null
    createdAt?: DateTimeFilter<"GradingResult"> | Date | string
    updatedAt?: DateTimeFilter<"GradingResult"> | Date | string
    completedAt?: DateTimeNullableFilter<"GradingResult"> | Date | string | null
    gradingSession?: XOR<GradingSessionScalarRelationFilter, GradingSessionWhereInput>
    uploadedFile?: XOR<UploadedFileScalarRelationFilter, UploadedFileWhereInput>
    rubric?: XOR<RubricScalarRelationFilter, RubricWhereInput>
  }

  export type GradingResultOrderByWithRelationInput = {
    id?: SortOrder
    gradingSessionId?: SortOrder
    uploadedFileId?: SortOrder
    rubricId?: SortOrder
    status?: SortOrder
    progress?: SortOrder
    result?: SortOrderInput | SortOrder
    errorMessage?: SortOrderInput | SortOrder
    gradingModel?: SortOrderInput | SortOrder
    gradingTokens?: SortOrderInput | SortOrder
    gradingDuration?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    completedAt?: SortOrderInput | SortOrder
    gradingSession?: GradingSessionOrderByWithRelationInput
    uploadedFile?: UploadedFileOrderByWithRelationInput
    rubric?: RubricOrderByWithRelationInput
  }

  export type GradingResultWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: GradingResultWhereInput | GradingResultWhereInput[]
    OR?: GradingResultWhereInput[]
    NOT?: GradingResultWhereInput | GradingResultWhereInput[]
    gradingSessionId?: StringFilter<"GradingResult"> | string
    uploadedFileId?: StringFilter<"GradingResult"> | string
    rubricId?: StringFilter<"GradingResult"> | string
    status?: EnumGradingStatusFilter<"GradingResult"> | $Enums.GradingStatus
    progress?: IntFilter<"GradingResult"> | number
    result?: JsonNullableFilter<"GradingResult">
    errorMessage?: StringNullableFilter<"GradingResult"> | string | null
    gradingModel?: StringNullableFilter<"GradingResult"> | string | null
    gradingTokens?: IntNullableFilter<"GradingResult"> | number | null
    gradingDuration?: IntNullableFilter<"GradingResult"> | number | null
    createdAt?: DateTimeFilter<"GradingResult"> | Date | string
    updatedAt?: DateTimeFilter<"GradingResult"> | Date | string
    completedAt?: DateTimeNullableFilter<"GradingResult"> | Date | string | null
    gradingSession?: XOR<GradingSessionScalarRelationFilter, GradingSessionWhereInput>
    uploadedFile?: XOR<UploadedFileScalarRelationFilter, UploadedFileWhereInput>
    rubric?: XOR<RubricScalarRelationFilter, RubricWhereInput>
  }, "id">

  export type GradingResultOrderByWithAggregationInput = {
    id?: SortOrder
    gradingSessionId?: SortOrder
    uploadedFileId?: SortOrder
    rubricId?: SortOrder
    status?: SortOrder
    progress?: SortOrder
    result?: SortOrderInput | SortOrder
    errorMessage?: SortOrderInput | SortOrder
    gradingModel?: SortOrderInput | SortOrder
    gradingTokens?: SortOrderInput | SortOrder
    gradingDuration?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    completedAt?: SortOrderInput | SortOrder
    _count?: GradingResultCountOrderByAggregateInput
    _avg?: GradingResultAvgOrderByAggregateInput
    _max?: GradingResultMaxOrderByAggregateInput
    _min?: GradingResultMinOrderByAggregateInput
    _sum?: GradingResultSumOrderByAggregateInput
  }

  export type GradingResultScalarWhereWithAggregatesInput = {
    AND?: GradingResultScalarWhereWithAggregatesInput | GradingResultScalarWhereWithAggregatesInput[]
    OR?: GradingResultScalarWhereWithAggregatesInput[]
    NOT?: GradingResultScalarWhereWithAggregatesInput | GradingResultScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"GradingResult"> | string
    gradingSessionId?: StringWithAggregatesFilter<"GradingResult"> | string
    uploadedFileId?: StringWithAggregatesFilter<"GradingResult"> | string
    rubricId?: StringWithAggregatesFilter<"GradingResult"> | string
    status?: EnumGradingStatusWithAggregatesFilter<"GradingResult"> | $Enums.GradingStatus
    progress?: IntWithAggregatesFilter<"GradingResult"> | number
    result?: JsonNullableWithAggregatesFilter<"GradingResult">
    errorMessage?: StringNullableWithAggregatesFilter<"GradingResult"> | string | null
    gradingModel?: StringNullableWithAggregatesFilter<"GradingResult"> | string | null
    gradingTokens?: IntNullableWithAggregatesFilter<"GradingResult"> | number | null
    gradingDuration?: IntNullableWithAggregatesFilter<"GradingResult"> | number | null
    createdAt?: DateTimeWithAggregatesFilter<"GradingResult"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"GradingResult"> | Date | string
    completedAt?: DateTimeNullableWithAggregatesFilter<"GradingResult"> | Date | string | null
  }

  export type EnrollmentWhereInput = {
    AND?: EnrollmentWhereInput | EnrollmentWhereInput[]
    OR?: EnrollmentWhereInput[]
    NOT?: EnrollmentWhereInput | EnrollmentWhereInput[]
    id?: StringFilter<"Enrollment"> | string
    studentId?: StringFilter<"Enrollment"> | string
    courseId?: StringFilter<"Enrollment"> | string
    enrolledAt?: DateTimeFilter<"Enrollment"> | Date | string
    student?: XOR<UserScalarRelationFilter, UserWhereInput>
    course?: XOR<CourseScalarRelationFilter, CourseWhereInput>
  }

  export type EnrollmentOrderByWithRelationInput = {
    id?: SortOrder
    studentId?: SortOrder
    courseId?: SortOrder
    enrolledAt?: SortOrder
    student?: UserOrderByWithRelationInput
    course?: CourseOrderByWithRelationInput
  }

  export type EnrollmentWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    studentId_courseId?: EnrollmentStudentIdCourseIdCompoundUniqueInput
    AND?: EnrollmentWhereInput | EnrollmentWhereInput[]
    OR?: EnrollmentWhereInput[]
    NOT?: EnrollmentWhereInput | EnrollmentWhereInput[]
    studentId?: StringFilter<"Enrollment"> | string
    courseId?: StringFilter<"Enrollment"> | string
    enrolledAt?: DateTimeFilter<"Enrollment"> | Date | string
    student?: XOR<UserScalarRelationFilter, UserWhereInput>
    course?: XOR<CourseScalarRelationFilter, CourseWhereInput>
  }, "id" | "studentId_courseId">

  export type EnrollmentOrderByWithAggregationInput = {
    id?: SortOrder
    studentId?: SortOrder
    courseId?: SortOrder
    enrolledAt?: SortOrder
    _count?: EnrollmentCountOrderByAggregateInput
    _max?: EnrollmentMaxOrderByAggregateInput
    _min?: EnrollmentMinOrderByAggregateInput
  }

  export type EnrollmentScalarWhereWithAggregatesInput = {
    AND?: EnrollmentScalarWhereWithAggregatesInput | EnrollmentScalarWhereWithAggregatesInput[]
    OR?: EnrollmentScalarWhereWithAggregatesInput[]
    NOT?: EnrollmentScalarWhereWithAggregatesInput | EnrollmentScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Enrollment"> | string
    studentId?: StringWithAggregatesFilter<"Enrollment"> | string
    courseId?: StringWithAggregatesFilter<"Enrollment"> | string
    enrolledAt?: DateTimeWithAggregatesFilter<"Enrollment"> | Date | string
  }

  export type InvitationCodeWhereInput = {
    AND?: InvitationCodeWhereInput | InvitationCodeWhereInput[]
    OR?: InvitationCodeWhereInput[]
    NOT?: InvitationCodeWhereInput | InvitationCodeWhereInput[]
    id?: StringFilter<"InvitationCode"> | string
    code?: StringFilter<"InvitationCode"> | string
    courseId?: StringFilter<"InvitationCode"> | string
    createdAt?: DateTimeFilter<"InvitationCode"> | Date | string
    expiresAt?: DateTimeFilter<"InvitationCode"> | Date | string
    isUsed?: BoolFilter<"InvitationCode"> | boolean
    usedAt?: DateTimeNullableFilter<"InvitationCode"> | Date | string | null
    usedById?: StringNullableFilter<"InvitationCode"> | string | null
    course?: XOR<CourseScalarRelationFilter, CourseWhereInput>
    usedBy?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type InvitationCodeOrderByWithRelationInput = {
    id?: SortOrder
    code?: SortOrder
    courseId?: SortOrder
    createdAt?: SortOrder
    expiresAt?: SortOrder
    isUsed?: SortOrder
    usedAt?: SortOrderInput | SortOrder
    usedById?: SortOrderInput | SortOrder
    course?: CourseOrderByWithRelationInput
    usedBy?: UserOrderByWithRelationInput
  }

  export type InvitationCodeWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    code?: string
    AND?: InvitationCodeWhereInput | InvitationCodeWhereInput[]
    OR?: InvitationCodeWhereInput[]
    NOT?: InvitationCodeWhereInput | InvitationCodeWhereInput[]
    courseId?: StringFilter<"InvitationCode"> | string
    createdAt?: DateTimeFilter<"InvitationCode"> | Date | string
    expiresAt?: DateTimeFilter<"InvitationCode"> | Date | string
    isUsed?: BoolFilter<"InvitationCode"> | boolean
    usedAt?: DateTimeNullableFilter<"InvitationCode"> | Date | string | null
    usedById?: StringNullableFilter<"InvitationCode"> | string | null
    course?: XOR<CourseScalarRelationFilter, CourseWhereInput>
    usedBy?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "id" | "code">

  export type InvitationCodeOrderByWithAggregationInput = {
    id?: SortOrder
    code?: SortOrder
    courseId?: SortOrder
    createdAt?: SortOrder
    expiresAt?: SortOrder
    isUsed?: SortOrder
    usedAt?: SortOrderInput | SortOrder
    usedById?: SortOrderInput | SortOrder
    _count?: InvitationCodeCountOrderByAggregateInput
    _max?: InvitationCodeMaxOrderByAggregateInput
    _min?: InvitationCodeMinOrderByAggregateInput
  }

  export type InvitationCodeScalarWhereWithAggregatesInput = {
    AND?: InvitationCodeScalarWhereWithAggregatesInput | InvitationCodeScalarWhereWithAggregatesInput[]
    OR?: InvitationCodeScalarWhereWithAggregatesInput[]
    NOT?: InvitationCodeScalarWhereWithAggregatesInput | InvitationCodeScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"InvitationCode"> | string
    code?: StringWithAggregatesFilter<"InvitationCode"> | string
    courseId?: StringWithAggregatesFilter<"InvitationCode"> | string
    createdAt?: DateTimeWithAggregatesFilter<"InvitationCode"> | Date | string
    expiresAt?: DateTimeWithAggregatesFilter<"InvitationCode"> | Date | string
    isUsed?: BoolWithAggregatesFilter<"InvitationCode"> | boolean
    usedAt?: DateTimeNullableWithAggregatesFilter<"InvitationCode"> | Date | string | null
    usedById?: StringNullableWithAggregatesFilter<"InvitationCode"> | string | null
  }

  export type UserCreateInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
    courses?: CourseCreateNestedManyWithoutTeacherInput
    teacherRubrics?: RubricCreateNestedManyWithoutTeacherInput
    submissions?: SubmissionCreateNestedManyWithoutStudentInput
    enrollments?: EnrollmentCreateNestedManyWithoutStudentInput
    usedInvitations?: InvitationCodeCreateNestedManyWithoutUsedByInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricUncheckedCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
    courses?: CourseUncheckedCreateNestedManyWithoutTeacherInput
    teacherRubrics?: RubricUncheckedCreateNestedManyWithoutTeacherInput
    submissions?: SubmissionUncheckedCreateNestedManyWithoutStudentInput
    enrollments?: EnrollmentUncheckedCreateNestedManyWithoutStudentInput
    usedInvitations?: InvitationCodeUncheckedCreateNestedManyWithoutUsedByInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
    courses?: CourseUpdateManyWithoutTeacherNestedInput
    teacherRubrics?: RubricUpdateManyWithoutTeacherNestedInput
    submissions?: SubmissionUpdateManyWithoutStudentNestedInput
    enrollments?: EnrollmentUpdateManyWithoutStudentNestedInput
    usedInvitations?: InvitationCodeUpdateManyWithoutUsedByNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUncheckedUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
    courses?: CourseUncheckedUpdateManyWithoutTeacherNestedInput
    teacherRubrics?: RubricUncheckedUpdateManyWithoutTeacherNestedInput
    submissions?: SubmissionUncheckedUpdateManyWithoutStudentNestedInput
    enrollments?: EnrollmentUncheckedUpdateManyWithoutStudentNestedInput
    usedInvitations?: InvitationCodeUncheckedUpdateManyWithoutUsedByNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourseCreateInput = {
    id?: string
    name: string
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    teacher: UserCreateNestedOneWithoutCoursesInput
    assignmentAreas?: AssignmentAreaCreateNestedManyWithoutCourseInput
    enrollments?: EnrollmentCreateNestedManyWithoutCourseInput
    invitationCodes?: InvitationCodeCreateNestedManyWithoutCourseInput
  }

  export type CourseUncheckedCreateInput = {
    id?: string
    name: string
    description?: string | null
    teacherId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    assignmentAreas?: AssignmentAreaUncheckedCreateNestedManyWithoutCourseInput
    enrollments?: EnrollmentUncheckedCreateNestedManyWithoutCourseInput
    invitationCodes?: InvitationCodeUncheckedCreateNestedManyWithoutCourseInput
  }

  export type CourseUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    teacher?: UserUpdateOneRequiredWithoutCoursesNestedInput
    assignmentAreas?: AssignmentAreaUpdateManyWithoutCourseNestedInput
    enrollments?: EnrollmentUpdateManyWithoutCourseNestedInput
    invitationCodes?: InvitationCodeUpdateManyWithoutCourseNestedInput
  }

  export type CourseUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    teacherId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    assignmentAreas?: AssignmentAreaUncheckedUpdateManyWithoutCourseNestedInput
    enrollments?: EnrollmentUncheckedUpdateManyWithoutCourseNestedInput
    invitationCodes?: InvitationCodeUncheckedUpdateManyWithoutCourseNestedInput
  }

  export type CourseCreateManyInput = {
    id?: string
    name: string
    description?: string | null
    teacherId: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CourseUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CourseUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    teacherId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AssignmentAreaCreateInput = {
    id?: string
    name: string
    description?: string | null
    dueDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    course: CourseCreateNestedOneWithoutAssignmentAreasInput
    rubric: RubricCreateNestedOneWithoutAssignmentAreasInput
    submissions?: SubmissionCreateNestedManyWithoutAssignmentAreaInput
  }

  export type AssignmentAreaUncheckedCreateInput = {
    id?: string
    name: string
    description?: string | null
    courseId: string
    rubricId: string
    dueDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    submissions?: SubmissionUncheckedCreateNestedManyWithoutAssignmentAreaInput
  }

  export type AssignmentAreaUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    dueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    course?: CourseUpdateOneRequiredWithoutAssignmentAreasNestedInput
    rubric?: RubricUpdateOneRequiredWithoutAssignmentAreasNestedInput
    submissions?: SubmissionUpdateManyWithoutAssignmentAreaNestedInput
  }

  export type AssignmentAreaUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    courseId?: StringFieldUpdateOperationsInput | string
    rubricId?: StringFieldUpdateOperationsInput | string
    dueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    submissions?: SubmissionUncheckedUpdateManyWithoutAssignmentAreaNestedInput
  }

  export type AssignmentAreaCreateManyInput = {
    id?: string
    name: string
    description?: string | null
    courseId: string
    rubricId: string
    dueDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AssignmentAreaUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    dueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AssignmentAreaUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    courseId?: StringFieldUpdateOperationsInput | string
    rubricId?: StringFieldUpdateOperationsInput | string
    dueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubmissionCreateInput = {
    id?: string
    filePath: string
    uploadedAt?: Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: number | null
    teacherFeedback?: string | null
    status?: $Enums.SubmissionStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    student: UserCreateNestedOneWithoutSubmissionsInput
    assignmentArea: AssignmentAreaCreateNestedOneWithoutSubmissionsInput
  }

  export type SubmissionUncheckedCreateInput = {
    id?: string
    studentId: string
    assignmentAreaId: string
    filePath: string
    uploadedAt?: Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: number | null
    teacherFeedback?: string | null
    status?: $Enums.SubmissionStatus
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubmissionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    filePath?: StringFieldUpdateOperationsInput | string
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: NullableIntFieldUpdateOperationsInput | number | null
    teacherFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    student?: UserUpdateOneRequiredWithoutSubmissionsNestedInput
    assignmentArea?: AssignmentAreaUpdateOneRequiredWithoutSubmissionsNestedInput
  }

  export type SubmissionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentId?: StringFieldUpdateOperationsInput | string
    assignmentAreaId?: StringFieldUpdateOperationsInput | string
    filePath?: StringFieldUpdateOperationsInput | string
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: NullableIntFieldUpdateOperationsInput | number | null
    teacherFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubmissionCreateManyInput = {
    id?: string
    studentId: string
    assignmentAreaId: string
    filePath: string
    uploadedAt?: Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: number | null
    teacherFeedback?: string | null
    status?: $Enums.SubmissionStatus
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubmissionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    filePath?: StringFieldUpdateOperationsInput | string
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: NullableIntFieldUpdateOperationsInput | number | null
    teacherFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubmissionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentId?: StringFieldUpdateOperationsInput | string
    assignmentAreaId?: StringFieldUpdateOperationsInput | string
    filePath?: StringFieldUpdateOperationsInput | string
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: NullableIntFieldUpdateOperationsInput | number | null
    teacherFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RubricCreateInput = {
    id?: string
    name: string
    description: string
    version?: number
    isActive?: boolean
    isTemplate?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutRubricsInput
    teacher?: UserCreateNestedOneWithoutTeacherRubricsInput
    gradingResults?: GradingResultCreateNestedManyWithoutRubricInput
    assignmentAreas?: AssignmentAreaCreateNestedManyWithoutRubricInput
  }

  export type RubricUncheckedCreateInput = {
    id?: string
    userId: string
    teacherId?: string | null
    name: string
    description: string
    version?: number
    isActive?: boolean
    isTemplate?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    gradingResults?: GradingResultUncheckedCreateNestedManyWithoutRubricInput
    assignmentAreas?: AssignmentAreaUncheckedCreateNestedManyWithoutRubricInput
  }

  export type RubricUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isTemplate?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutRubricsNestedInput
    teacher?: UserUpdateOneWithoutTeacherRubricsNestedInput
    gradingResults?: GradingResultUpdateManyWithoutRubricNestedInput
    assignmentAreas?: AssignmentAreaUpdateManyWithoutRubricNestedInput
  }

  export type RubricUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    teacherId?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isTemplate?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gradingResults?: GradingResultUncheckedUpdateManyWithoutRubricNestedInput
    assignmentAreas?: AssignmentAreaUncheckedUpdateManyWithoutRubricNestedInput
  }

  export type RubricCreateManyInput = {
    id?: string
    userId: string
    teacherId?: string | null
    name: string
    description: string
    version?: number
    isActive?: boolean
    isTemplate?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RubricUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isTemplate?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RubricUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    teacherId?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isTemplate?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GradingSessionCreateInput = {
    id?: string
    status?: $Enums.GradingSessionStatus
    progress?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutGradingSessionsInput
    gradingResults?: GradingResultCreateNestedManyWithoutGradingSessionInput
  }

  export type GradingSessionUncheckedCreateInput = {
    id?: string
    userId: string
    status?: $Enums.GradingSessionStatus
    progress?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    gradingResults?: GradingResultUncheckedCreateNestedManyWithoutGradingSessionInput
  }

  export type GradingSessionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingSessionStatusFieldUpdateOperationsInput | $Enums.GradingSessionStatus
    progress?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutGradingSessionsNestedInput
    gradingResults?: GradingResultUpdateManyWithoutGradingSessionNestedInput
  }

  export type GradingSessionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingSessionStatusFieldUpdateOperationsInput | $Enums.GradingSessionStatus
    progress?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gradingResults?: GradingResultUncheckedUpdateManyWithoutGradingSessionNestedInput
  }

  export type GradingSessionCreateManyInput = {
    id?: string
    userId: string
    status?: $Enums.GradingSessionStatus
    progress?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GradingSessionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingSessionStatusFieldUpdateOperationsInput | $Enums.GradingSessionStatus
    progress?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GradingSessionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingSessionStatusFieldUpdateOperationsInput | $Enums.GradingSessionStatus
    progress?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UploadedFileCreateInput = {
    id?: string
    fileName: string
    originalFileName: string
    fileKey: string
    fileSize: number
    mimeType: string
    parseStatus?: $Enums.FileParseStatus
    parsedContent?: string | null
    parseError?: string | null
    isDeleted?: boolean
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    expiresAt?: Date | string | null
    user: UserCreateNestedOneWithoutUploadedFilesInput
    gradingResults?: GradingResultCreateNestedManyWithoutUploadedFileInput
  }

  export type UploadedFileUncheckedCreateInput = {
    id?: string
    userId: string
    fileName: string
    originalFileName: string
    fileKey: string
    fileSize: number
    mimeType: string
    parseStatus?: $Enums.FileParseStatus
    parsedContent?: string | null
    parseError?: string | null
    isDeleted?: boolean
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    expiresAt?: Date | string | null
    gradingResults?: GradingResultUncheckedCreateNestedManyWithoutUploadedFileInput
  }

  export type UploadedFileUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileName?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    fileKey?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    parseStatus?: EnumFileParseStatusFieldUpdateOperationsInput | $Enums.FileParseStatus
    parsedContent?: NullableStringFieldUpdateOperationsInput | string | null
    parseError?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: BoolFieldUpdateOperationsInput | boolean
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    user?: UserUpdateOneRequiredWithoutUploadedFilesNestedInput
    gradingResults?: GradingResultUpdateManyWithoutUploadedFileNestedInput
  }

  export type UploadedFileUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    fileName?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    fileKey?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    parseStatus?: EnumFileParseStatusFieldUpdateOperationsInput | $Enums.FileParseStatus
    parsedContent?: NullableStringFieldUpdateOperationsInput | string | null
    parseError?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: BoolFieldUpdateOperationsInput | boolean
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    gradingResults?: GradingResultUncheckedUpdateManyWithoutUploadedFileNestedInput
  }

  export type UploadedFileCreateManyInput = {
    id?: string
    userId: string
    fileName: string
    originalFileName: string
    fileKey: string
    fileSize: number
    mimeType: string
    parseStatus?: $Enums.FileParseStatus
    parsedContent?: string | null
    parseError?: string | null
    isDeleted?: boolean
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    expiresAt?: Date | string | null
  }

  export type UploadedFileUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileName?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    fileKey?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    parseStatus?: EnumFileParseStatusFieldUpdateOperationsInput | $Enums.FileParseStatus
    parsedContent?: NullableStringFieldUpdateOperationsInput | string | null
    parseError?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: BoolFieldUpdateOperationsInput | boolean
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type UploadedFileUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    fileName?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    fileKey?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    parseStatus?: EnumFileParseStatusFieldUpdateOperationsInput | $Enums.FileParseStatus
    parsedContent?: NullableStringFieldUpdateOperationsInput | string | null
    parseError?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: BoolFieldUpdateOperationsInput | boolean
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type GradingResultCreateInput = {
    id?: string
    status?: $Enums.GradingStatus
    progress?: number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: string | null
    gradingModel?: string | null
    gradingTokens?: number | null
    gradingDuration?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
    gradingSession: GradingSessionCreateNestedOneWithoutGradingResultsInput
    uploadedFile: UploadedFileCreateNestedOneWithoutGradingResultsInput
    rubric: RubricCreateNestedOneWithoutGradingResultsInput
  }

  export type GradingResultUncheckedCreateInput = {
    id?: string
    gradingSessionId: string
    uploadedFileId: string
    rubricId: string
    status?: $Enums.GradingStatus
    progress?: number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: string | null
    gradingModel?: string | null
    gradingTokens?: number | null
    gradingDuration?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
  }

  export type GradingResultUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingStatusFieldUpdateOperationsInput | $Enums.GradingStatus
    progress?: IntFieldUpdateOperationsInput | number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    gradingModel?: NullableStringFieldUpdateOperationsInput | string | null
    gradingTokens?: NullableIntFieldUpdateOperationsInput | number | null
    gradingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    gradingSession?: GradingSessionUpdateOneRequiredWithoutGradingResultsNestedInput
    uploadedFile?: UploadedFileUpdateOneRequiredWithoutGradingResultsNestedInput
    rubric?: RubricUpdateOneRequiredWithoutGradingResultsNestedInput
  }

  export type GradingResultUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    gradingSessionId?: StringFieldUpdateOperationsInput | string
    uploadedFileId?: StringFieldUpdateOperationsInput | string
    rubricId?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingStatusFieldUpdateOperationsInput | $Enums.GradingStatus
    progress?: IntFieldUpdateOperationsInput | number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    gradingModel?: NullableStringFieldUpdateOperationsInput | string | null
    gradingTokens?: NullableIntFieldUpdateOperationsInput | number | null
    gradingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type GradingResultCreateManyInput = {
    id?: string
    gradingSessionId: string
    uploadedFileId: string
    rubricId: string
    status?: $Enums.GradingStatus
    progress?: number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: string | null
    gradingModel?: string | null
    gradingTokens?: number | null
    gradingDuration?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
  }

  export type GradingResultUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingStatusFieldUpdateOperationsInput | $Enums.GradingStatus
    progress?: IntFieldUpdateOperationsInput | number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    gradingModel?: NullableStringFieldUpdateOperationsInput | string | null
    gradingTokens?: NullableIntFieldUpdateOperationsInput | number | null
    gradingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type GradingResultUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    gradingSessionId?: StringFieldUpdateOperationsInput | string
    uploadedFileId?: StringFieldUpdateOperationsInput | string
    rubricId?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingStatusFieldUpdateOperationsInput | $Enums.GradingStatus
    progress?: IntFieldUpdateOperationsInput | number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    gradingModel?: NullableStringFieldUpdateOperationsInput | string | null
    gradingTokens?: NullableIntFieldUpdateOperationsInput | number | null
    gradingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type EnrollmentCreateInput = {
    id?: string
    enrolledAt?: Date | string
    student: UserCreateNestedOneWithoutEnrollmentsInput
    course: CourseCreateNestedOneWithoutEnrollmentsInput
  }

  export type EnrollmentUncheckedCreateInput = {
    id?: string
    studentId: string
    courseId: string
    enrolledAt?: Date | string
  }

  export type EnrollmentUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    enrolledAt?: DateTimeFieldUpdateOperationsInput | Date | string
    student?: UserUpdateOneRequiredWithoutEnrollmentsNestedInput
    course?: CourseUpdateOneRequiredWithoutEnrollmentsNestedInput
  }

  export type EnrollmentUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentId?: StringFieldUpdateOperationsInput | string
    courseId?: StringFieldUpdateOperationsInput | string
    enrolledAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EnrollmentCreateManyInput = {
    id?: string
    studentId: string
    courseId: string
    enrolledAt?: Date | string
  }

  export type EnrollmentUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    enrolledAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EnrollmentUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentId?: StringFieldUpdateOperationsInput | string
    courseId?: StringFieldUpdateOperationsInput | string
    enrolledAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InvitationCodeCreateInput = {
    id?: string
    code: string
    createdAt?: Date | string
    expiresAt: Date | string
    isUsed?: boolean
    usedAt?: Date | string | null
    course: CourseCreateNestedOneWithoutInvitationCodesInput
    usedBy?: UserCreateNestedOneWithoutUsedInvitationsInput
  }

  export type InvitationCodeUncheckedCreateInput = {
    id?: string
    code: string
    courseId: string
    createdAt?: Date | string
    expiresAt: Date | string
    isUsed?: boolean
    usedAt?: Date | string | null
    usedById?: string | null
  }

  export type InvitationCodeUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isUsed?: BoolFieldUpdateOperationsInput | boolean
    usedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    course?: CourseUpdateOneRequiredWithoutInvitationCodesNestedInput
    usedBy?: UserUpdateOneWithoutUsedInvitationsNestedInput
  }

  export type InvitationCodeUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    courseId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isUsed?: BoolFieldUpdateOperationsInput | boolean
    usedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    usedById?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type InvitationCodeCreateManyInput = {
    id?: string
    code: string
    courseId: string
    createdAt?: Date | string
    expiresAt: Date | string
    isUsed?: boolean
    usedAt?: Date | string | null
    usedById?: string | null
  }

  export type InvitationCodeUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isUsed?: BoolFieldUpdateOperationsInput | boolean
    usedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type InvitationCodeUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    courseId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isUsed?: BoolFieldUpdateOperationsInput | boolean
    usedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    usedById?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type EnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type RubricListRelationFilter = {
    every?: RubricWhereInput
    some?: RubricWhereInput
    none?: RubricWhereInput
  }

  export type GradingSessionListRelationFilter = {
    every?: GradingSessionWhereInput
    some?: GradingSessionWhereInput
    none?: GradingSessionWhereInput
  }

  export type UploadedFileListRelationFilter = {
    every?: UploadedFileWhereInput
    some?: UploadedFileWhereInput
    none?: UploadedFileWhereInput
  }

  export type CourseListRelationFilter = {
    every?: CourseWhereInput
    some?: CourseWhereInput
    none?: CourseWhereInput
  }

  export type SubmissionListRelationFilter = {
    every?: SubmissionWhereInput
    some?: SubmissionWhereInput
    none?: SubmissionWhereInput
  }

  export type EnrollmentListRelationFilter = {
    every?: EnrollmentWhereInput
    some?: EnrollmentWhereInput
    none?: EnrollmentWhereInput
  }

  export type InvitationCodeListRelationFilter = {
    every?: InvitationCodeWhereInput
    some?: InvitationCodeWhereInput
    none?: InvitationCodeWhereInput
  }

  export type RubricOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type GradingSessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UploadedFileOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CourseOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type SubmissionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type EnrollmentOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type InvitationCodeOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    role?: SortOrder
    name?: SortOrder
    picture?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    role?: SortOrder
    name?: SortOrder
    picture?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    role?: SortOrder
    name?: SortOrder
    picture?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type EnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type AssignmentAreaListRelationFilter = {
    every?: AssignmentAreaWhereInput
    some?: AssignmentAreaWhereInput
    none?: AssignmentAreaWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type AssignmentAreaOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CourseCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    teacherId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CourseMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    teacherId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CourseMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    teacherId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type CourseScalarRelationFilter = {
    is?: CourseWhereInput
    isNot?: CourseWhereInput
  }

  export type RubricScalarRelationFilter = {
    is?: RubricWhereInput
    isNot?: RubricWhereInput
  }

  export type AssignmentAreaCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    courseId?: SortOrder
    rubricId?: SortOrder
    dueDate?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AssignmentAreaMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    courseId?: SortOrder
    rubricId?: SortOrder
    dueDate?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AssignmentAreaMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    courseId?: SortOrder
    rubricId?: SortOrder
    dueDate?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type EnumSubmissionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SubmissionStatus | EnumSubmissionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubmissionStatusFilter<$PrismaModel> | $Enums.SubmissionStatus
  }

  export type AssignmentAreaScalarRelationFilter = {
    is?: AssignmentAreaWhereInput
    isNot?: AssignmentAreaWhereInput
  }

  export type SubmissionCountOrderByAggregateInput = {
    id?: SortOrder
    studentId?: SortOrder
    assignmentAreaId?: SortOrder
    filePath?: SortOrder
    uploadedAt?: SortOrder
    aiAnalysisResult?: SortOrder
    finalScore?: SortOrder
    teacherFeedback?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubmissionAvgOrderByAggregateInput = {
    finalScore?: SortOrder
  }

  export type SubmissionMaxOrderByAggregateInput = {
    id?: SortOrder
    studentId?: SortOrder
    assignmentAreaId?: SortOrder
    filePath?: SortOrder
    uploadedAt?: SortOrder
    finalScore?: SortOrder
    teacherFeedback?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubmissionMinOrderByAggregateInput = {
    id?: SortOrder
    studentId?: SortOrder
    assignmentAreaId?: SortOrder
    filePath?: SortOrder
    uploadedAt?: SortOrder
    finalScore?: SortOrder
    teacherFeedback?: SortOrder
    status?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SubmissionSumOrderByAggregateInput = {
    finalScore?: SortOrder
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type EnumSubmissionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubmissionStatus | EnumSubmissionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubmissionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SubmissionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubmissionStatusFilter<$PrismaModel>
    _max?: NestedEnumSubmissionStatusFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type UserNullableScalarRelationFilter = {
    is?: UserWhereInput | null
    isNot?: UserWhereInput | null
  }

  export type GradingResultListRelationFilter = {
    every?: GradingResultWhereInput
    some?: GradingResultWhereInput
    none?: GradingResultWhereInput
  }

  export type GradingResultOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type RubricCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    teacherId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    version?: SortOrder
    isActive?: SortOrder
    isTemplate?: SortOrder
    criteria?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RubricAvgOrderByAggregateInput = {
    version?: SortOrder
  }

  export type RubricMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    teacherId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    version?: SortOrder
    isActive?: SortOrder
    isTemplate?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RubricMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    teacherId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    version?: SortOrder
    isActive?: SortOrder
    isTemplate?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RubricSumOrderByAggregateInput = {
    version?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type EnumGradingSessionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.GradingSessionStatus | EnumGradingSessionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.GradingSessionStatus[] | ListEnumGradingSessionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.GradingSessionStatus[] | ListEnumGradingSessionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumGradingSessionStatusFilter<$PrismaModel> | $Enums.GradingSessionStatus
  }

  export type GradingSessionCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    progress?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type GradingSessionAvgOrderByAggregateInput = {
    progress?: SortOrder
  }

  export type GradingSessionMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    progress?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type GradingSessionMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    status?: SortOrder
    progress?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type GradingSessionSumOrderByAggregateInput = {
    progress?: SortOrder
  }

  export type EnumGradingSessionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.GradingSessionStatus | EnumGradingSessionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.GradingSessionStatus[] | ListEnumGradingSessionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.GradingSessionStatus[] | ListEnumGradingSessionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumGradingSessionStatusWithAggregatesFilter<$PrismaModel> | $Enums.GradingSessionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumGradingSessionStatusFilter<$PrismaModel>
    _max?: NestedEnumGradingSessionStatusFilter<$PrismaModel>
  }

  export type EnumFileParseStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.FileParseStatus | EnumFileParseStatusFieldRefInput<$PrismaModel>
    in?: $Enums.FileParseStatus[] | ListEnumFileParseStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.FileParseStatus[] | ListEnumFileParseStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumFileParseStatusFilter<$PrismaModel> | $Enums.FileParseStatus
  }

  export type UploadedFileCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    fileName?: SortOrder
    originalFileName?: SortOrder
    fileKey?: SortOrder
    fileSize?: SortOrder
    mimeType?: SortOrder
    parseStatus?: SortOrder
    parsedContent?: SortOrder
    parseError?: SortOrder
    isDeleted?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    expiresAt?: SortOrder
  }

  export type UploadedFileAvgOrderByAggregateInput = {
    fileSize?: SortOrder
  }

  export type UploadedFileMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    fileName?: SortOrder
    originalFileName?: SortOrder
    fileKey?: SortOrder
    fileSize?: SortOrder
    mimeType?: SortOrder
    parseStatus?: SortOrder
    parsedContent?: SortOrder
    parseError?: SortOrder
    isDeleted?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    expiresAt?: SortOrder
  }

  export type UploadedFileMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    fileName?: SortOrder
    originalFileName?: SortOrder
    fileKey?: SortOrder
    fileSize?: SortOrder
    mimeType?: SortOrder
    parseStatus?: SortOrder
    parsedContent?: SortOrder
    parseError?: SortOrder
    isDeleted?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    expiresAt?: SortOrder
  }

  export type UploadedFileSumOrderByAggregateInput = {
    fileSize?: SortOrder
  }

  export type EnumFileParseStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.FileParseStatus | EnumFileParseStatusFieldRefInput<$PrismaModel>
    in?: $Enums.FileParseStatus[] | ListEnumFileParseStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.FileParseStatus[] | ListEnumFileParseStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumFileParseStatusWithAggregatesFilter<$PrismaModel> | $Enums.FileParseStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumFileParseStatusFilter<$PrismaModel>
    _max?: NestedEnumFileParseStatusFilter<$PrismaModel>
  }

  export type EnumGradingStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.GradingStatus | EnumGradingStatusFieldRefInput<$PrismaModel>
    in?: $Enums.GradingStatus[] | ListEnumGradingStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.GradingStatus[] | ListEnumGradingStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumGradingStatusFilter<$PrismaModel> | $Enums.GradingStatus
  }

  export type GradingSessionScalarRelationFilter = {
    is?: GradingSessionWhereInput
    isNot?: GradingSessionWhereInput
  }

  export type UploadedFileScalarRelationFilter = {
    is?: UploadedFileWhereInput
    isNot?: UploadedFileWhereInput
  }

  export type GradingResultCountOrderByAggregateInput = {
    id?: SortOrder
    gradingSessionId?: SortOrder
    uploadedFileId?: SortOrder
    rubricId?: SortOrder
    status?: SortOrder
    progress?: SortOrder
    result?: SortOrder
    errorMessage?: SortOrder
    gradingModel?: SortOrder
    gradingTokens?: SortOrder
    gradingDuration?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    completedAt?: SortOrder
  }

  export type GradingResultAvgOrderByAggregateInput = {
    progress?: SortOrder
    gradingTokens?: SortOrder
    gradingDuration?: SortOrder
  }

  export type GradingResultMaxOrderByAggregateInput = {
    id?: SortOrder
    gradingSessionId?: SortOrder
    uploadedFileId?: SortOrder
    rubricId?: SortOrder
    status?: SortOrder
    progress?: SortOrder
    errorMessage?: SortOrder
    gradingModel?: SortOrder
    gradingTokens?: SortOrder
    gradingDuration?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    completedAt?: SortOrder
  }

  export type GradingResultMinOrderByAggregateInput = {
    id?: SortOrder
    gradingSessionId?: SortOrder
    uploadedFileId?: SortOrder
    rubricId?: SortOrder
    status?: SortOrder
    progress?: SortOrder
    errorMessage?: SortOrder
    gradingModel?: SortOrder
    gradingTokens?: SortOrder
    gradingDuration?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    completedAt?: SortOrder
  }

  export type GradingResultSumOrderByAggregateInput = {
    progress?: SortOrder
    gradingTokens?: SortOrder
    gradingDuration?: SortOrder
  }

  export type EnumGradingStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.GradingStatus | EnumGradingStatusFieldRefInput<$PrismaModel>
    in?: $Enums.GradingStatus[] | ListEnumGradingStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.GradingStatus[] | ListEnumGradingStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumGradingStatusWithAggregatesFilter<$PrismaModel> | $Enums.GradingStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumGradingStatusFilter<$PrismaModel>
    _max?: NestedEnumGradingStatusFilter<$PrismaModel>
  }

  export type EnrollmentStudentIdCourseIdCompoundUniqueInput = {
    studentId: string
    courseId: string
  }

  export type EnrollmentCountOrderByAggregateInput = {
    id?: SortOrder
    studentId?: SortOrder
    courseId?: SortOrder
    enrolledAt?: SortOrder
  }

  export type EnrollmentMaxOrderByAggregateInput = {
    id?: SortOrder
    studentId?: SortOrder
    courseId?: SortOrder
    enrolledAt?: SortOrder
  }

  export type EnrollmentMinOrderByAggregateInput = {
    id?: SortOrder
    studentId?: SortOrder
    courseId?: SortOrder
    enrolledAt?: SortOrder
  }

  export type InvitationCodeCountOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    courseId?: SortOrder
    createdAt?: SortOrder
    expiresAt?: SortOrder
    isUsed?: SortOrder
    usedAt?: SortOrder
    usedById?: SortOrder
  }

  export type InvitationCodeMaxOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    courseId?: SortOrder
    createdAt?: SortOrder
    expiresAt?: SortOrder
    isUsed?: SortOrder
    usedAt?: SortOrder
    usedById?: SortOrder
  }

  export type InvitationCodeMinOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    courseId?: SortOrder
    createdAt?: SortOrder
    expiresAt?: SortOrder
    isUsed?: SortOrder
    usedAt?: SortOrder
    usedById?: SortOrder
  }

  export type RubricCreateNestedManyWithoutUserInput = {
    create?: XOR<RubricCreateWithoutUserInput, RubricUncheckedCreateWithoutUserInput> | RubricCreateWithoutUserInput[] | RubricUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RubricCreateOrConnectWithoutUserInput | RubricCreateOrConnectWithoutUserInput[]
    createMany?: RubricCreateManyUserInputEnvelope
    connect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
  }

  export type GradingSessionCreateNestedManyWithoutUserInput = {
    create?: XOR<GradingSessionCreateWithoutUserInput, GradingSessionUncheckedCreateWithoutUserInput> | GradingSessionCreateWithoutUserInput[] | GradingSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: GradingSessionCreateOrConnectWithoutUserInput | GradingSessionCreateOrConnectWithoutUserInput[]
    createMany?: GradingSessionCreateManyUserInputEnvelope
    connect?: GradingSessionWhereUniqueInput | GradingSessionWhereUniqueInput[]
  }

  export type UploadedFileCreateNestedManyWithoutUserInput = {
    create?: XOR<UploadedFileCreateWithoutUserInput, UploadedFileUncheckedCreateWithoutUserInput> | UploadedFileCreateWithoutUserInput[] | UploadedFileUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UploadedFileCreateOrConnectWithoutUserInput | UploadedFileCreateOrConnectWithoutUserInput[]
    createMany?: UploadedFileCreateManyUserInputEnvelope
    connect?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
  }

  export type CourseCreateNestedManyWithoutTeacherInput = {
    create?: XOR<CourseCreateWithoutTeacherInput, CourseUncheckedCreateWithoutTeacherInput> | CourseCreateWithoutTeacherInput[] | CourseUncheckedCreateWithoutTeacherInput[]
    connectOrCreate?: CourseCreateOrConnectWithoutTeacherInput | CourseCreateOrConnectWithoutTeacherInput[]
    createMany?: CourseCreateManyTeacherInputEnvelope
    connect?: CourseWhereUniqueInput | CourseWhereUniqueInput[]
  }

  export type RubricCreateNestedManyWithoutTeacherInput = {
    create?: XOR<RubricCreateWithoutTeacherInput, RubricUncheckedCreateWithoutTeacherInput> | RubricCreateWithoutTeacherInput[] | RubricUncheckedCreateWithoutTeacherInput[]
    connectOrCreate?: RubricCreateOrConnectWithoutTeacherInput | RubricCreateOrConnectWithoutTeacherInput[]
    createMany?: RubricCreateManyTeacherInputEnvelope
    connect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
  }

  export type SubmissionCreateNestedManyWithoutStudentInput = {
    create?: XOR<SubmissionCreateWithoutStudentInput, SubmissionUncheckedCreateWithoutStudentInput> | SubmissionCreateWithoutStudentInput[] | SubmissionUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: SubmissionCreateOrConnectWithoutStudentInput | SubmissionCreateOrConnectWithoutStudentInput[]
    createMany?: SubmissionCreateManyStudentInputEnvelope
    connect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
  }

  export type EnrollmentCreateNestedManyWithoutStudentInput = {
    create?: XOR<EnrollmentCreateWithoutStudentInput, EnrollmentUncheckedCreateWithoutStudentInput> | EnrollmentCreateWithoutStudentInput[] | EnrollmentUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: EnrollmentCreateOrConnectWithoutStudentInput | EnrollmentCreateOrConnectWithoutStudentInput[]
    createMany?: EnrollmentCreateManyStudentInputEnvelope
    connect?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
  }

  export type InvitationCodeCreateNestedManyWithoutUsedByInput = {
    create?: XOR<InvitationCodeCreateWithoutUsedByInput, InvitationCodeUncheckedCreateWithoutUsedByInput> | InvitationCodeCreateWithoutUsedByInput[] | InvitationCodeUncheckedCreateWithoutUsedByInput[]
    connectOrCreate?: InvitationCodeCreateOrConnectWithoutUsedByInput | InvitationCodeCreateOrConnectWithoutUsedByInput[]
    createMany?: InvitationCodeCreateManyUsedByInputEnvelope
    connect?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
  }

  export type RubricUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<RubricCreateWithoutUserInput, RubricUncheckedCreateWithoutUserInput> | RubricCreateWithoutUserInput[] | RubricUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RubricCreateOrConnectWithoutUserInput | RubricCreateOrConnectWithoutUserInput[]
    createMany?: RubricCreateManyUserInputEnvelope
    connect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
  }

  export type GradingSessionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<GradingSessionCreateWithoutUserInput, GradingSessionUncheckedCreateWithoutUserInput> | GradingSessionCreateWithoutUserInput[] | GradingSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: GradingSessionCreateOrConnectWithoutUserInput | GradingSessionCreateOrConnectWithoutUserInput[]
    createMany?: GradingSessionCreateManyUserInputEnvelope
    connect?: GradingSessionWhereUniqueInput | GradingSessionWhereUniqueInput[]
  }

  export type UploadedFileUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<UploadedFileCreateWithoutUserInput, UploadedFileUncheckedCreateWithoutUserInput> | UploadedFileCreateWithoutUserInput[] | UploadedFileUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UploadedFileCreateOrConnectWithoutUserInput | UploadedFileCreateOrConnectWithoutUserInput[]
    createMany?: UploadedFileCreateManyUserInputEnvelope
    connect?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
  }

  export type CourseUncheckedCreateNestedManyWithoutTeacherInput = {
    create?: XOR<CourseCreateWithoutTeacherInput, CourseUncheckedCreateWithoutTeacherInput> | CourseCreateWithoutTeacherInput[] | CourseUncheckedCreateWithoutTeacherInput[]
    connectOrCreate?: CourseCreateOrConnectWithoutTeacherInput | CourseCreateOrConnectWithoutTeacherInput[]
    createMany?: CourseCreateManyTeacherInputEnvelope
    connect?: CourseWhereUniqueInput | CourseWhereUniqueInput[]
  }

  export type RubricUncheckedCreateNestedManyWithoutTeacherInput = {
    create?: XOR<RubricCreateWithoutTeacherInput, RubricUncheckedCreateWithoutTeacherInput> | RubricCreateWithoutTeacherInput[] | RubricUncheckedCreateWithoutTeacherInput[]
    connectOrCreate?: RubricCreateOrConnectWithoutTeacherInput | RubricCreateOrConnectWithoutTeacherInput[]
    createMany?: RubricCreateManyTeacherInputEnvelope
    connect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
  }

  export type SubmissionUncheckedCreateNestedManyWithoutStudentInput = {
    create?: XOR<SubmissionCreateWithoutStudentInput, SubmissionUncheckedCreateWithoutStudentInput> | SubmissionCreateWithoutStudentInput[] | SubmissionUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: SubmissionCreateOrConnectWithoutStudentInput | SubmissionCreateOrConnectWithoutStudentInput[]
    createMany?: SubmissionCreateManyStudentInputEnvelope
    connect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
  }

  export type EnrollmentUncheckedCreateNestedManyWithoutStudentInput = {
    create?: XOR<EnrollmentCreateWithoutStudentInput, EnrollmentUncheckedCreateWithoutStudentInput> | EnrollmentCreateWithoutStudentInput[] | EnrollmentUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: EnrollmentCreateOrConnectWithoutStudentInput | EnrollmentCreateOrConnectWithoutStudentInput[]
    createMany?: EnrollmentCreateManyStudentInputEnvelope
    connect?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
  }

  export type InvitationCodeUncheckedCreateNestedManyWithoutUsedByInput = {
    create?: XOR<InvitationCodeCreateWithoutUsedByInput, InvitationCodeUncheckedCreateWithoutUsedByInput> | InvitationCodeCreateWithoutUsedByInput[] | InvitationCodeUncheckedCreateWithoutUsedByInput[]
    connectOrCreate?: InvitationCodeCreateOrConnectWithoutUsedByInput | InvitationCodeCreateOrConnectWithoutUsedByInput[]
    createMany?: InvitationCodeCreateManyUsedByInputEnvelope
    connect?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type EnumUserRoleFieldUpdateOperationsInput = {
    set?: $Enums.UserRole
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type RubricUpdateManyWithoutUserNestedInput = {
    create?: XOR<RubricCreateWithoutUserInput, RubricUncheckedCreateWithoutUserInput> | RubricCreateWithoutUserInput[] | RubricUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RubricCreateOrConnectWithoutUserInput | RubricCreateOrConnectWithoutUserInput[]
    upsert?: RubricUpsertWithWhereUniqueWithoutUserInput | RubricUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: RubricCreateManyUserInputEnvelope
    set?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    disconnect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    delete?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    connect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    update?: RubricUpdateWithWhereUniqueWithoutUserInput | RubricUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: RubricUpdateManyWithWhereWithoutUserInput | RubricUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: RubricScalarWhereInput | RubricScalarWhereInput[]
  }

  export type GradingSessionUpdateManyWithoutUserNestedInput = {
    create?: XOR<GradingSessionCreateWithoutUserInput, GradingSessionUncheckedCreateWithoutUserInput> | GradingSessionCreateWithoutUserInput[] | GradingSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: GradingSessionCreateOrConnectWithoutUserInput | GradingSessionCreateOrConnectWithoutUserInput[]
    upsert?: GradingSessionUpsertWithWhereUniqueWithoutUserInput | GradingSessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: GradingSessionCreateManyUserInputEnvelope
    set?: GradingSessionWhereUniqueInput | GradingSessionWhereUniqueInput[]
    disconnect?: GradingSessionWhereUniqueInput | GradingSessionWhereUniqueInput[]
    delete?: GradingSessionWhereUniqueInput | GradingSessionWhereUniqueInput[]
    connect?: GradingSessionWhereUniqueInput | GradingSessionWhereUniqueInput[]
    update?: GradingSessionUpdateWithWhereUniqueWithoutUserInput | GradingSessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: GradingSessionUpdateManyWithWhereWithoutUserInput | GradingSessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: GradingSessionScalarWhereInput | GradingSessionScalarWhereInput[]
  }

  export type UploadedFileUpdateManyWithoutUserNestedInput = {
    create?: XOR<UploadedFileCreateWithoutUserInput, UploadedFileUncheckedCreateWithoutUserInput> | UploadedFileCreateWithoutUserInput[] | UploadedFileUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UploadedFileCreateOrConnectWithoutUserInput | UploadedFileCreateOrConnectWithoutUserInput[]
    upsert?: UploadedFileUpsertWithWhereUniqueWithoutUserInput | UploadedFileUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UploadedFileCreateManyUserInputEnvelope
    set?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
    disconnect?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
    delete?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
    connect?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
    update?: UploadedFileUpdateWithWhereUniqueWithoutUserInput | UploadedFileUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UploadedFileUpdateManyWithWhereWithoutUserInput | UploadedFileUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UploadedFileScalarWhereInput | UploadedFileScalarWhereInput[]
  }

  export type CourseUpdateManyWithoutTeacherNestedInput = {
    create?: XOR<CourseCreateWithoutTeacherInput, CourseUncheckedCreateWithoutTeacherInput> | CourseCreateWithoutTeacherInput[] | CourseUncheckedCreateWithoutTeacherInput[]
    connectOrCreate?: CourseCreateOrConnectWithoutTeacherInput | CourseCreateOrConnectWithoutTeacherInput[]
    upsert?: CourseUpsertWithWhereUniqueWithoutTeacherInput | CourseUpsertWithWhereUniqueWithoutTeacherInput[]
    createMany?: CourseCreateManyTeacherInputEnvelope
    set?: CourseWhereUniqueInput | CourseWhereUniqueInput[]
    disconnect?: CourseWhereUniqueInput | CourseWhereUniqueInput[]
    delete?: CourseWhereUniqueInput | CourseWhereUniqueInput[]
    connect?: CourseWhereUniqueInput | CourseWhereUniqueInput[]
    update?: CourseUpdateWithWhereUniqueWithoutTeacherInput | CourseUpdateWithWhereUniqueWithoutTeacherInput[]
    updateMany?: CourseUpdateManyWithWhereWithoutTeacherInput | CourseUpdateManyWithWhereWithoutTeacherInput[]
    deleteMany?: CourseScalarWhereInput | CourseScalarWhereInput[]
  }

  export type RubricUpdateManyWithoutTeacherNestedInput = {
    create?: XOR<RubricCreateWithoutTeacherInput, RubricUncheckedCreateWithoutTeacherInput> | RubricCreateWithoutTeacherInput[] | RubricUncheckedCreateWithoutTeacherInput[]
    connectOrCreate?: RubricCreateOrConnectWithoutTeacherInput | RubricCreateOrConnectWithoutTeacherInput[]
    upsert?: RubricUpsertWithWhereUniqueWithoutTeacherInput | RubricUpsertWithWhereUniqueWithoutTeacherInput[]
    createMany?: RubricCreateManyTeacherInputEnvelope
    set?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    disconnect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    delete?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    connect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    update?: RubricUpdateWithWhereUniqueWithoutTeacherInput | RubricUpdateWithWhereUniqueWithoutTeacherInput[]
    updateMany?: RubricUpdateManyWithWhereWithoutTeacherInput | RubricUpdateManyWithWhereWithoutTeacherInput[]
    deleteMany?: RubricScalarWhereInput | RubricScalarWhereInput[]
  }

  export type SubmissionUpdateManyWithoutStudentNestedInput = {
    create?: XOR<SubmissionCreateWithoutStudentInput, SubmissionUncheckedCreateWithoutStudentInput> | SubmissionCreateWithoutStudentInput[] | SubmissionUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: SubmissionCreateOrConnectWithoutStudentInput | SubmissionCreateOrConnectWithoutStudentInput[]
    upsert?: SubmissionUpsertWithWhereUniqueWithoutStudentInput | SubmissionUpsertWithWhereUniqueWithoutStudentInput[]
    createMany?: SubmissionCreateManyStudentInputEnvelope
    set?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    disconnect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    delete?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    connect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    update?: SubmissionUpdateWithWhereUniqueWithoutStudentInput | SubmissionUpdateWithWhereUniqueWithoutStudentInput[]
    updateMany?: SubmissionUpdateManyWithWhereWithoutStudentInput | SubmissionUpdateManyWithWhereWithoutStudentInput[]
    deleteMany?: SubmissionScalarWhereInput | SubmissionScalarWhereInput[]
  }

  export type EnrollmentUpdateManyWithoutStudentNestedInput = {
    create?: XOR<EnrollmentCreateWithoutStudentInput, EnrollmentUncheckedCreateWithoutStudentInput> | EnrollmentCreateWithoutStudentInput[] | EnrollmentUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: EnrollmentCreateOrConnectWithoutStudentInput | EnrollmentCreateOrConnectWithoutStudentInput[]
    upsert?: EnrollmentUpsertWithWhereUniqueWithoutStudentInput | EnrollmentUpsertWithWhereUniqueWithoutStudentInput[]
    createMany?: EnrollmentCreateManyStudentInputEnvelope
    set?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
    disconnect?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
    delete?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
    connect?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
    update?: EnrollmentUpdateWithWhereUniqueWithoutStudentInput | EnrollmentUpdateWithWhereUniqueWithoutStudentInput[]
    updateMany?: EnrollmentUpdateManyWithWhereWithoutStudentInput | EnrollmentUpdateManyWithWhereWithoutStudentInput[]
    deleteMany?: EnrollmentScalarWhereInput | EnrollmentScalarWhereInput[]
  }

  export type InvitationCodeUpdateManyWithoutUsedByNestedInput = {
    create?: XOR<InvitationCodeCreateWithoutUsedByInput, InvitationCodeUncheckedCreateWithoutUsedByInput> | InvitationCodeCreateWithoutUsedByInput[] | InvitationCodeUncheckedCreateWithoutUsedByInput[]
    connectOrCreate?: InvitationCodeCreateOrConnectWithoutUsedByInput | InvitationCodeCreateOrConnectWithoutUsedByInput[]
    upsert?: InvitationCodeUpsertWithWhereUniqueWithoutUsedByInput | InvitationCodeUpsertWithWhereUniqueWithoutUsedByInput[]
    createMany?: InvitationCodeCreateManyUsedByInputEnvelope
    set?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
    disconnect?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
    delete?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
    connect?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
    update?: InvitationCodeUpdateWithWhereUniqueWithoutUsedByInput | InvitationCodeUpdateWithWhereUniqueWithoutUsedByInput[]
    updateMany?: InvitationCodeUpdateManyWithWhereWithoutUsedByInput | InvitationCodeUpdateManyWithWhereWithoutUsedByInput[]
    deleteMany?: InvitationCodeScalarWhereInput | InvitationCodeScalarWhereInput[]
  }

  export type RubricUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<RubricCreateWithoutUserInput, RubricUncheckedCreateWithoutUserInput> | RubricCreateWithoutUserInput[] | RubricUncheckedCreateWithoutUserInput[]
    connectOrCreate?: RubricCreateOrConnectWithoutUserInput | RubricCreateOrConnectWithoutUserInput[]
    upsert?: RubricUpsertWithWhereUniqueWithoutUserInput | RubricUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: RubricCreateManyUserInputEnvelope
    set?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    disconnect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    delete?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    connect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    update?: RubricUpdateWithWhereUniqueWithoutUserInput | RubricUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: RubricUpdateManyWithWhereWithoutUserInput | RubricUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: RubricScalarWhereInput | RubricScalarWhereInput[]
  }

  export type GradingSessionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<GradingSessionCreateWithoutUserInput, GradingSessionUncheckedCreateWithoutUserInput> | GradingSessionCreateWithoutUserInput[] | GradingSessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: GradingSessionCreateOrConnectWithoutUserInput | GradingSessionCreateOrConnectWithoutUserInput[]
    upsert?: GradingSessionUpsertWithWhereUniqueWithoutUserInput | GradingSessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: GradingSessionCreateManyUserInputEnvelope
    set?: GradingSessionWhereUniqueInput | GradingSessionWhereUniqueInput[]
    disconnect?: GradingSessionWhereUniqueInput | GradingSessionWhereUniqueInput[]
    delete?: GradingSessionWhereUniqueInput | GradingSessionWhereUniqueInput[]
    connect?: GradingSessionWhereUniqueInput | GradingSessionWhereUniqueInput[]
    update?: GradingSessionUpdateWithWhereUniqueWithoutUserInput | GradingSessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: GradingSessionUpdateManyWithWhereWithoutUserInput | GradingSessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: GradingSessionScalarWhereInput | GradingSessionScalarWhereInput[]
  }

  export type UploadedFileUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<UploadedFileCreateWithoutUserInput, UploadedFileUncheckedCreateWithoutUserInput> | UploadedFileCreateWithoutUserInput[] | UploadedFileUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UploadedFileCreateOrConnectWithoutUserInput | UploadedFileCreateOrConnectWithoutUserInput[]
    upsert?: UploadedFileUpsertWithWhereUniqueWithoutUserInput | UploadedFileUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UploadedFileCreateManyUserInputEnvelope
    set?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
    disconnect?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
    delete?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
    connect?: UploadedFileWhereUniqueInput | UploadedFileWhereUniqueInput[]
    update?: UploadedFileUpdateWithWhereUniqueWithoutUserInput | UploadedFileUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UploadedFileUpdateManyWithWhereWithoutUserInput | UploadedFileUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UploadedFileScalarWhereInput | UploadedFileScalarWhereInput[]
  }

  export type CourseUncheckedUpdateManyWithoutTeacherNestedInput = {
    create?: XOR<CourseCreateWithoutTeacherInput, CourseUncheckedCreateWithoutTeacherInput> | CourseCreateWithoutTeacherInput[] | CourseUncheckedCreateWithoutTeacherInput[]
    connectOrCreate?: CourseCreateOrConnectWithoutTeacherInput | CourseCreateOrConnectWithoutTeacherInput[]
    upsert?: CourseUpsertWithWhereUniqueWithoutTeacherInput | CourseUpsertWithWhereUniqueWithoutTeacherInput[]
    createMany?: CourseCreateManyTeacherInputEnvelope
    set?: CourseWhereUniqueInput | CourseWhereUniqueInput[]
    disconnect?: CourseWhereUniqueInput | CourseWhereUniqueInput[]
    delete?: CourseWhereUniqueInput | CourseWhereUniqueInput[]
    connect?: CourseWhereUniqueInput | CourseWhereUniqueInput[]
    update?: CourseUpdateWithWhereUniqueWithoutTeacherInput | CourseUpdateWithWhereUniqueWithoutTeacherInput[]
    updateMany?: CourseUpdateManyWithWhereWithoutTeacherInput | CourseUpdateManyWithWhereWithoutTeacherInput[]
    deleteMany?: CourseScalarWhereInput | CourseScalarWhereInput[]
  }

  export type RubricUncheckedUpdateManyWithoutTeacherNestedInput = {
    create?: XOR<RubricCreateWithoutTeacherInput, RubricUncheckedCreateWithoutTeacherInput> | RubricCreateWithoutTeacherInput[] | RubricUncheckedCreateWithoutTeacherInput[]
    connectOrCreate?: RubricCreateOrConnectWithoutTeacherInput | RubricCreateOrConnectWithoutTeacherInput[]
    upsert?: RubricUpsertWithWhereUniqueWithoutTeacherInput | RubricUpsertWithWhereUniqueWithoutTeacherInput[]
    createMany?: RubricCreateManyTeacherInputEnvelope
    set?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    disconnect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    delete?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    connect?: RubricWhereUniqueInput | RubricWhereUniqueInput[]
    update?: RubricUpdateWithWhereUniqueWithoutTeacherInput | RubricUpdateWithWhereUniqueWithoutTeacherInput[]
    updateMany?: RubricUpdateManyWithWhereWithoutTeacherInput | RubricUpdateManyWithWhereWithoutTeacherInput[]
    deleteMany?: RubricScalarWhereInput | RubricScalarWhereInput[]
  }

  export type SubmissionUncheckedUpdateManyWithoutStudentNestedInput = {
    create?: XOR<SubmissionCreateWithoutStudentInput, SubmissionUncheckedCreateWithoutStudentInput> | SubmissionCreateWithoutStudentInput[] | SubmissionUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: SubmissionCreateOrConnectWithoutStudentInput | SubmissionCreateOrConnectWithoutStudentInput[]
    upsert?: SubmissionUpsertWithWhereUniqueWithoutStudentInput | SubmissionUpsertWithWhereUniqueWithoutStudentInput[]
    createMany?: SubmissionCreateManyStudentInputEnvelope
    set?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    disconnect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    delete?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    connect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    update?: SubmissionUpdateWithWhereUniqueWithoutStudentInput | SubmissionUpdateWithWhereUniqueWithoutStudentInput[]
    updateMany?: SubmissionUpdateManyWithWhereWithoutStudentInput | SubmissionUpdateManyWithWhereWithoutStudentInput[]
    deleteMany?: SubmissionScalarWhereInput | SubmissionScalarWhereInput[]
  }

  export type EnrollmentUncheckedUpdateManyWithoutStudentNestedInput = {
    create?: XOR<EnrollmentCreateWithoutStudentInput, EnrollmentUncheckedCreateWithoutStudentInput> | EnrollmentCreateWithoutStudentInput[] | EnrollmentUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: EnrollmentCreateOrConnectWithoutStudentInput | EnrollmentCreateOrConnectWithoutStudentInput[]
    upsert?: EnrollmentUpsertWithWhereUniqueWithoutStudentInput | EnrollmentUpsertWithWhereUniqueWithoutStudentInput[]
    createMany?: EnrollmentCreateManyStudentInputEnvelope
    set?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
    disconnect?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
    delete?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
    connect?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
    update?: EnrollmentUpdateWithWhereUniqueWithoutStudentInput | EnrollmentUpdateWithWhereUniqueWithoutStudentInput[]
    updateMany?: EnrollmentUpdateManyWithWhereWithoutStudentInput | EnrollmentUpdateManyWithWhereWithoutStudentInput[]
    deleteMany?: EnrollmentScalarWhereInput | EnrollmentScalarWhereInput[]
  }

  export type InvitationCodeUncheckedUpdateManyWithoutUsedByNestedInput = {
    create?: XOR<InvitationCodeCreateWithoutUsedByInput, InvitationCodeUncheckedCreateWithoutUsedByInput> | InvitationCodeCreateWithoutUsedByInput[] | InvitationCodeUncheckedCreateWithoutUsedByInput[]
    connectOrCreate?: InvitationCodeCreateOrConnectWithoutUsedByInput | InvitationCodeCreateOrConnectWithoutUsedByInput[]
    upsert?: InvitationCodeUpsertWithWhereUniqueWithoutUsedByInput | InvitationCodeUpsertWithWhereUniqueWithoutUsedByInput[]
    createMany?: InvitationCodeCreateManyUsedByInputEnvelope
    set?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
    disconnect?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
    delete?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
    connect?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
    update?: InvitationCodeUpdateWithWhereUniqueWithoutUsedByInput | InvitationCodeUpdateWithWhereUniqueWithoutUsedByInput[]
    updateMany?: InvitationCodeUpdateManyWithWhereWithoutUsedByInput | InvitationCodeUpdateManyWithWhereWithoutUsedByInput[]
    deleteMany?: InvitationCodeScalarWhereInput | InvitationCodeScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutCoursesInput = {
    create?: XOR<UserCreateWithoutCoursesInput, UserUncheckedCreateWithoutCoursesInput>
    connectOrCreate?: UserCreateOrConnectWithoutCoursesInput
    connect?: UserWhereUniqueInput
  }

  export type AssignmentAreaCreateNestedManyWithoutCourseInput = {
    create?: XOR<AssignmentAreaCreateWithoutCourseInput, AssignmentAreaUncheckedCreateWithoutCourseInput> | AssignmentAreaCreateWithoutCourseInput[] | AssignmentAreaUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: AssignmentAreaCreateOrConnectWithoutCourseInput | AssignmentAreaCreateOrConnectWithoutCourseInput[]
    createMany?: AssignmentAreaCreateManyCourseInputEnvelope
    connect?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
  }

  export type EnrollmentCreateNestedManyWithoutCourseInput = {
    create?: XOR<EnrollmentCreateWithoutCourseInput, EnrollmentUncheckedCreateWithoutCourseInput> | EnrollmentCreateWithoutCourseInput[] | EnrollmentUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: EnrollmentCreateOrConnectWithoutCourseInput | EnrollmentCreateOrConnectWithoutCourseInput[]
    createMany?: EnrollmentCreateManyCourseInputEnvelope
    connect?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
  }

  export type InvitationCodeCreateNestedManyWithoutCourseInput = {
    create?: XOR<InvitationCodeCreateWithoutCourseInput, InvitationCodeUncheckedCreateWithoutCourseInput> | InvitationCodeCreateWithoutCourseInput[] | InvitationCodeUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: InvitationCodeCreateOrConnectWithoutCourseInput | InvitationCodeCreateOrConnectWithoutCourseInput[]
    createMany?: InvitationCodeCreateManyCourseInputEnvelope
    connect?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
  }

  export type AssignmentAreaUncheckedCreateNestedManyWithoutCourseInput = {
    create?: XOR<AssignmentAreaCreateWithoutCourseInput, AssignmentAreaUncheckedCreateWithoutCourseInput> | AssignmentAreaCreateWithoutCourseInput[] | AssignmentAreaUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: AssignmentAreaCreateOrConnectWithoutCourseInput | AssignmentAreaCreateOrConnectWithoutCourseInput[]
    createMany?: AssignmentAreaCreateManyCourseInputEnvelope
    connect?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
  }

  export type EnrollmentUncheckedCreateNestedManyWithoutCourseInput = {
    create?: XOR<EnrollmentCreateWithoutCourseInput, EnrollmentUncheckedCreateWithoutCourseInput> | EnrollmentCreateWithoutCourseInput[] | EnrollmentUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: EnrollmentCreateOrConnectWithoutCourseInput | EnrollmentCreateOrConnectWithoutCourseInput[]
    createMany?: EnrollmentCreateManyCourseInputEnvelope
    connect?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
  }

  export type InvitationCodeUncheckedCreateNestedManyWithoutCourseInput = {
    create?: XOR<InvitationCodeCreateWithoutCourseInput, InvitationCodeUncheckedCreateWithoutCourseInput> | InvitationCodeCreateWithoutCourseInput[] | InvitationCodeUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: InvitationCodeCreateOrConnectWithoutCourseInput | InvitationCodeCreateOrConnectWithoutCourseInput[]
    createMany?: InvitationCodeCreateManyCourseInputEnvelope
    connect?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type UserUpdateOneRequiredWithoutCoursesNestedInput = {
    create?: XOR<UserCreateWithoutCoursesInput, UserUncheckedCreateWithoutCoursesInput>
    connectOrCreate?: UserCreateOrConnectWithoutCoursesInput
    upsert?: UserUpsertWithoutCoursesInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutCoursesInput, UserUpdateWithoutCoursesInput>, UserUncheckedUpdateWithoutCoursesInput>
  }

  export type AssignmentAreaUpdateManyWithoutCourseNestedInput = {
    create?: XOR<AssignmentAreaCreateWithoutCourseInput, AssignmentAreaUncheckedCreateWithoutCourseInput> | AssignmentAreaCreateWithoutCourseInput[] | AssignmentAreaUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: AssignmentAreaCreateOrConnectWithoutCourseInput | AssignmentAreaCreateOrConnectWithoutCourseInput[]
    upsert?: AssignmentAreaUpsertWithWhereUniqueWithoutCourseInput | AssignmentAreaUpsertWithWhereUniqueWithoutCourseInput[]
    createMany?: AssignmentAreaCreateManyCourseInputEnvelope
    set?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
    disconnect?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
    delete?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
    connect?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
    update?: AssignmentAreaUpdateWithWhereUniqueWithoutCourseInput | AssignmentAreaUpdateWithWhereUniqueWithoutCourseInput[]
    updateMany?: AssignmentAreaUpdateManyWithWhereWithoutCourseInput | AssignmentAreaUpdateManyWithWhereWithoutCourseInput[]
    deleteMany?: AssignmentAreaScalarWhereInput | AssignmentAreaScalarWhereInput[]
  }

  export type EnrollmentUpdateManyWithoutCourseNestedInput = {
    create?: XOR<EnrollmentCreateWithoutCourseInput, EnrollmentUncheckedCreateWithoutCourseInput> | EnrollmentCreateWithoutCourseInput[] | EnrollmentUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: EnrollmentCreateOrConnectWithoutCourseInput | EnrollmentCreateOrConnectWithoutCourseInput[]
    upsert?: EnrollmentUpsertWithWhereUniqueWithoutCourseInput | EnrollmentUpsertWithWhereUniqueWithoutCourseInput[]
    createMany?: EnrollmentCreateManyCourseInputEnvelope
    set?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
    disconnect?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
    delete?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
    connect?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
    update?: EnrollmentUpdateWithWhereUniqueWithoutCourseInput | EnrollmentUpdateWithWhereUniqueWithoutCourseInput[]
    updateMany?: EnrollmentUpdateManyWithWhereWithoutCourseInput | EnrollmentUpdateManyWithWhereWithoutCourseInput[]
    deleteMany?: EnrollmentScalarWhereInput | EnrollmentScalarWhereInput[]
  }

  export type InvitationCodeUpdateManyWithoutCourseNestedInput = {
    create?: XOR<InvitationCodeCreateWithoutCourseInput, InvitationCodeUncheckedCreateWithoutCourseInput> | InvitationCodeCreateWithoutCourseInput[] | InvitationCodeUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: InvitationCodeCreateOrConnectWithoutCourseInput | InvitationCodeCreateOrConnectWithoutCourseInput[]
    upsert?: InvitationCodeUpsertWithWhereUniqueWithoutCourseInput | InvitationCodeUpsertWithWhereUniqueWithoutCourseInput[]
    createMany?: InvitationCodeCreateManyCourseInputEnvelope
    set?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
    disconnect?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
    delete?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
    connect?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
    update?: InvitationCodeUpdateWithWhereUniqueWithoutCourseInput | InvitationCodeUpdateWithWhereUniqueWithoutCourseInput[]
    updateMany?: InvitationCodeUpdateManyWithWhereWithoutCourseInput | InvitationCodeUpdateManyWithWhereWithoutCourseInput[]
    deleteMany?: InvitationCodeScalarWhereInput | InvitationCodeScalarWhereInput[]
  }

  export type AssignmentAreaUncheckedUpdateManyWithoutCourseNestedInput = {
    create?: XOR<AssignmentAreaCreateWithoutCourseInput, AssignmentAreaUncheckedCreateWithoutCourseInput> | AssignmentAreaCreateWithoutCourseInput[] | AssignmentAreaUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: AssignmentAreaCreateOrConnectWithoutCourseInput | AssignmentAreaCreateOrConnectWithoutCourseInput[]
    upsert?: AssignmentAreaUpsertWithWhereUniqueWithoutCourseInput | AssignmentAreaUpsertWithWhereUniqueWithoutCourseInput[]
    createMany?: AssignmentAreaCreateManyCourseInputEnvelope
    set?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
    disconnect?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
    delete?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
    connect?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
    update?: AssignmentAreaUpdateWithWhereUniqueWithoutCourseInput | AssignmentAreaUpdateWithWhereUniqueWithoutCourseInput[]
    updateMany?: AssignmentAreaUpdateManyWithWhereWithoutCourseInput | AssignmentAreaUpdateManyWithWhereWithoutCourseInput[]
    deleteMany?: AssignmentAreaScalarWhereInput | AssignmentAreaScalarWhereInput[]
  }

  export type EnrollmentUncheckedUpdateManyWithoutCourseNestedInput = {
    create?: XOR<EnrollmentCreateWithoutCourseInput, EnrollmentUncheckedCreateWithoutCourseInput> | EnrollmentCreateWithoutCourseInput[] | EnrollmentUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: EnrollmentCreateOrConnectWithoutCourseInput | EnrollmentCreateOrConnectWithoutCourseInput[]
    upsert?: EnrollmentUpsertWithWhereUniqueWithoutCourseInput | EnrollmentUpsertWithWhereUniqueWithoutCourseInput[]
    createMany?: EnrollmentCreateManyCourseInputEnvelope
    set?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
    disconnect?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
    delete?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
    connect?: EnrollmentWhereUniqueInput | EnrollmentWhereUniqueInput[]
    update?: EnrollmentUpdateWithWhereUniqueWithoutCourseInput | EnrollmentUpdateWithWhereUniqueWithoutCourseInput[]
    updateMany?: EnrollmentUpdateManyWithWhereWithoutCourseInput | EnrollmentUpdateManyWithWhereWithoutCourseInput[]
    deleteMany?: EnrollmentScalarWhereInput | EnrollmentScalarWhereInput[]
  }

  export type InvitationCodeUncheckedUpdateManyWithoutCourseNestedInput = {
    create?: XOR<InvitationCodeCreateWithoutCourseInput, InvitationCodeUncheckedCreateWithoutCourseInput> | InvitationCodeCreateWithoutCourseInput[] | InvitationCodeUncheckedCreateWithoutCourseInput[]
    connectOrCreate?: InvitationCodeCreateOrConnectWithoutCourseInput | InvitationCodeCreateOrConnectWithoutCourseInput[]
    upsert?: InvitationCodeUpsertWithWhereUniqueWithoutCourseInput | InvitationCodeUpsertWithWhereUniqueWithoutCourseInput[]
    createMany?: InvitationCodeCreateManyCourseInputEnvelope
    set?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
    disconnect?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
    delete?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
    connect?: InvitationCodeWhereUniqueInput | InvitationCodeWhereUniqueInput[]
    update?: InvitationCodeUpdateWithWhereUniqueWithoutCourseInput | InvitationCodeUpdateWithWhereUniqueWithoutCourseInput[]
    updateMany?: InvitationCodeUpdateManyWithWhereWithoutCourseInput | InvitationCodeUpdateManyWithWhereWithoutCourseInput[]
    deleteMany?: InvitationCodeScalarWhereInput | InvitationCodeScalarWhereInput[]
  }

  export type CourseCreateNestedOneWithoutAssignmentAreasInput = {
    create?: XOR<CourseCreateWithoutAssignmentAreasInput, CourseUncheckedCreateWithoutAssignmentAreasInput>
    connectOrCreate?: CourseCreateOrConnectWithoutAssignmentAreasInput
    connect?: CourseWhereUniqueInput
  }

  export type RubricCreateNestedOneWithoutAssignmentAreasInput = {
    create?: XOR<RubricCreateWithoutAssignmentAreasInput, RubricUncheckedCreateWithoutAssignmentAreasInput>
    connectOrCreate?: RubricCreateOrConnectWithoutAssignmentAreasInput
    connect?: RubricWhereUniqueInput
  }

  export type SubmissionCreateNestedManyWithoutAssignmentAreaInput = {
    create?: XOR<SubmissionCreateWithoutAssignmentAreaInput, SubmissionUncheckedCreateWithoutAssignmentAreaInput> | SubmissionCreateWithoutAssignmentAreaInput[] | SubmissionUncheckedCreateWithoutAssignmentAreaInput[]
    connectOrCreate?: SubmissionCreateOrConnectWithoutAssignmentAreaInput | SubmissionCreateOrConnectWithoutAssignmentAreaInput[]
    createMany?: SubmissionCreateManyAssignmentAreaInputEnvelope
    connect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
  }

  export type SubmissionUncheckedCreateNestedManyWithoutAssignmentAreaInput = {
    create?: XOR<SubmissionCreateWithoutAssignmentAreaInput, SubmissionUncheckedCreateWithoutAssignmentAreaInput> | SubmissionCreateWithoutAssignmentAreaInput[] | SubmissionUncheckedCreateWithoutAssignmentAreaInput[]
    connectOrCreate?: SubmissionCreateOrConnectWithoutAssignmentAreaInput | SubmissionCreateOrConnectWithoutAssignmentAreaInput[]
    createMany?: SubmissionCreateManyAssignmentAreaInputEnvelope
    connect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type CourseUpdateOneRequiredWithoutAssignmentAreasNestedInput = {
    create?: XOR<CourseCreateWithoutAssignmentAreasInput, CourseUncheckedCreateWithoutAssignmentAreasInput>
    connectOrCreate?: CourseCreateOrConnectWithoutAssignmentAreasInput
    upsert?: CourseUpsertWithoutAssignmentAreasInput
    connect?: CourseWhereUniqueInput
    update?: XOR<XOR<CourseUpdateToOneWithWhereWithoutAssignmentAreasInput, CourseUpdateWithoutAssignmentAreasInput>, CourseUncheckedUpdateWithoutAssignmentAreasInput>
  }

  export type RubricUpdateOneRequiredWithoutAssignmentAreasNestedInput = {
    create?: XOR<RubricCreateWithoutAssignmentAreasInput, RubricUncheckedCreateWithoutAssignmentAreasInput>
    connectOrCreate?: RubricCreateOrConnectWithoutAssignmentAreasInput
    upsert?: RubricUpsertWithoutAssignmentAreasInput
    connect?: RubricWhereUniqueInput
    update?: XOR<XOR<RubricUpdateToOneWithWhereWithoutAssignmentAreasInput, RubricUpdateWithoutAssignmentAreasInput>, RubricUncheckedUpdateWithoutAssignmentAreasInput>
  }

  export type SubmissionUpdateManyWithoutAssignmentAreaNestedInput = {
    create?: XOR<SubmissionCreateWithoutAssignmentAreaInput, SubmissionUncheckedCreateWithoutAssignmentAreaInput> | SubmissionCreateWithoutAssignmentAreaInput[] | SubmissionUncheckedCreateWithoutAssignmentAreaInput[]
    connectOrCreate?: SubmissionCreateOrConnectWithoutAssignmentAreaInput | SubmissionCreateOrConnectWithoutAssignmentAreaInput[]
    upsert?: SubmissionUpsertWithWhereUniqueWithoutAssignmentAreaInput | SubmissionUpsertWithWhereUniqueWithoutAssignmentAreaInput[]
    createMany?: SubmissionCreateManyAssignmentAreaInputEnvelope
    set?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    disconnect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    delete?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    connect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    update?: SubmissionUpdateWithWhereUniqueWithoutAssignmentAreaInput | SubmissionUpdateWithWhereUniqueWithoutAssignmentAreaInput[]
    updateMany?: SubmissionUpdateManyWithWhereWithoutAssignmentAreaInput | SubmissionUpdateManyWithWhereWithoutAssignmentAreaInput[]
    deleteMany?: SubmissionScalarWhereInput | SubmissionScalarWhereInput[]
  }

  export type SubmissionUncheckedUpdateManyWithoutAssignmentAreaNestedInput = {
    create?: XOR<SubmissionCreateWithoutAssignmentAreaInput, SubmissionUncheckedCreateWithoutAssignmentAreaInput> | SubmissionCreateWithoutAssignmentAreaInput[] | SubmissionUncheckedCreateWithoutAssignmentAreaInput[]
    connectOrCreate?: SubmissionCreateOrConnectWithoutAssignmentAreaInput | SubmissionCreateOrConnectWithoutAssignmentAreaInput[]
    upsert?: SubmissionUpsertWithWhereUniqueWithoutAssignmentAreaInput | SubmissionUpsertWithWhereUniqueWithoutAssignmentAreaInput[]
    createMany?: SubmissionCreateManyAssignmentAreaInputEnvelope
    set?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    disconnect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    delete?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    connect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    update?: SubmissionUpdateWithWhereUniqueWithoutAssignmentAreaInput | SubmissionUpdateWithWhereUniqueWithoutAssignmentAreaInput[]
    updateMany?: SubmissionUpdateManyWithWhereWithoutAssignmentAreaInput | SubmissionUpdateManyWithWhereWithoutAssignmentAreaInput[]
    deleteMany?: SubmissionScalarWhereInput | SubmissionScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutSubmissionsInput = {
    create?: XOR<UserCreateWithoutSubmissionsInput, UserUncheckedCreateWithoutSubmissionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSubmissionsInput
    connect?: UserWhereUniqueInput
  }

  export type AssignmentAreaCreateNestedOneWithoutSubmissionsInput = {
    create?: XOR<AssignmentAreaCreateWithoutSubmissionsInput, AssignmentAreaUncheckedCreateWithoutSubmissionsInput>
    connectOrCreate?: AssignmentAreaCreateOrConnectWithoutSubmissionsInput
    connect?: AssignmentAreaWhereUniqueInput
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EnumSubmissionStatusFieldUpdateOperationsInput = {
    set?: $Enums.SubmissionStatus
  }

  export type UserUpdateOneRequiredWithoutSubmissionsNestedInput = {
    create?: XOR<UserCreateWithoutSubmissionsInput, UserUncheckedCreateWithoutSubmissionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSubmissionsInput
    upsert?: UserUpsertWithoutSubmissionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSubmissionsInput, UserUpdateWithoutSubmissionsInput>, UserUncheckedUpdateWithoutSubmissionsInput>
  }

  export type AssignmentAreaUpdateOneRequiredWithoutSubmissionsNestedInput = {
    create?: XOR<AssignmentAreaCreateWithoutSubmissionsInput, AssignmentAreaUncheckedCreateWithoutSubmissionsInput>
    connectOrCreate?: AssignmentAreaCreateOrConnectWithoutSubmissionsInput
    upsert?: AssignmentAreaUpsertWithoutSubmissionsInput
    connect?: AssignmentAreaWhereUniqueInput
    update?: XOR<XOR<AssignmentAreaUpdateToOneWithWhereWithoutSubmissionsInput, AssignmentAreaUpdateWithoutSubmissionsInput>, AssignmentAreaUncheckedUpdateWithoutSubmissionsInput>
  }

  export type UserCreateNestedOneWithoutRubricsInput = {
    create?: XOR<UserCreateWithoutRubricsInput, UserUncheckedCreateWithoutRubricsInput>
    connectOrCreate?: UserCreateOrConnectWithoutRubricsInput
    connect?: UserWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutTeacherRubricsInput = {
    create?: XOR<UserCreateWithoutTeacherRubricsInput, UserUncheckedCreateWithoutTeacherRubricsInput>
    connectOrCreate?: UserCreateOrConnectWithoutTeacherRubricsInput
    connect?: UserWhereUniqueInput
  }

  export type GradingResultCreateNestedManyWithoutRubricInput = {
    create?: XOR<GradingResultCreateWithoutRubricInput, GradingResultUncheckedCreateWithoutRubricInput> | GradingResultCreateWithoutRubricInput[] | GradingResultUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: GradingResultCreateOrConnectWithoutRubricInput | GradingResultCreateOrConnectWithoutRubricInput[]
    createMany?: GradingResultCreateManyRubricInputEnvelope
    connect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
  }

  export type AssignmentAreaCreateNestedManyWithoutRubricInput = {
    create?: XOR<AssignmentAreaCreateWithoutRubricInput, AssignmentAreaUncheckedCreateWithoutRubricInput> | AssignmentAreaCreateWithoutRubricInput[] | AssignmentAreaUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: AssignmentAreaCreateOrConnectWithoutRubricInput | AssignmentAreaCreateOrConnectWithoutRubricInput[]
    createMany?: AssignmentAreaCreateManyRubricInputEnvelope
    connect?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
  }

  export type GradingResultUncheckedCreateNestedManyWithoutRubricInput = {
    create?: XOR<GradingResultCreateWithoutRubricInput, GradingResultUncheckedCreateWithoutRubricInput> | GradingResultCreateWithoutRubricInput[] | GradingResultUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: GradingResultCreateOrConnectWithoutRubricInput | GradingResultCreateOrConnectWithoutRubricInput[]
    createMany?: GradingResultCreateManyRubricInputEnvelope
    connect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
  }

  export type AssignmentAreaUncheckedCreateNestedManyWithoutRubricInput = {
    create?: XOR<AssignmentAreaCreateWithoutRubricInput, AssignmentAreaUncheckedCreateWithoutRubricInput> | AssignmentAreaCreateWithoutRubricInput[] | AssignmentAreaUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: AssignmentAreaCreateOrConnectWithoutRubricInput | AssignmentAreaCreateOrConnectWithoutRubricInput[]
    createMany?: AssignmentAreaCreateManyRubricInputEnvelope
    connect?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type UserUpdateOneRequiredWithoutRubricsNestedInput = {
    create?: XOR<UserCreateWithoutRubricsInput, UserUncheckedCreateWithoutRubricsInput>
    connectOrCreate?: UserCreateOrConnectWithoutRubricsInput
    upsert?: UserUpsertWithoutRubricsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutRubricsInput, UserUpdateWithoutRubricsInput>, UserUncheckedUpdateWithoutRubricsInput>
  }

  export type UserUpdateOneWithoutTeacherRubricsNestedInput = {
    create?: XOR<UserCreateWithoutTeacherRubricsInput, UserUncheckedCreateWithoutTeacherRubricsInput>
    connectOrCreate?: UserCreateOrConnectWithoutTeacherRubricsInput
    upsert?: UserUpsertWithoutTeacherRubricsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutTeacherRubricsInput, UserUpdateWithoutTeacherRubricsInput>, UserUncheckedUpdateWithoutTeacherRubricsInput>
  }

  export type GradingResultUpdateManyWithoutRubricNestedInput = {
    create?: XOR<GradingResultCreateWithoutRubricInput, GradingResultUncheckedCreateWithoutRubricInput> | GradingResultCreateWithoutRubricInput[] | GradingResultUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: GradingResultCreateOrConnectWithoutRubricInput | GradingResultCreateOrConnectWithoutRubricInput[]
    upsert?: GradingResultUpsertWithWhereUniqueWithoutRubricInput | GradingResultUpsertWithWhereUniqueWithoutRubricInput[]
    createMany?: GradingResultCreateManyRubricInputEnvelope
    set?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    disconnect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    delete?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    connect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    update?: GradingResultUpdateWithWhereUniqueWithoutRubricInput | GradingResultUpdateWithWhereUniqueWithoutRubricInput[]
    updateMany?: GradingResultUpdateManyWithWhereWithoutRubricInput | GradingResultUpdateManyWithWhereWithoutRubricInput[]
    deleteMany?: GradingResultScalarWhereInput | GradingResultScalarWhereInput[]
  }

  export type AssignmentAreaUpdateManyWithoutRubricNestedInput = {
    create?: XOR<AssignmentAreaCreateWithoutRubricInput, AssignmentAreaUncheckedCreateWithoutRubricInput> | AssignmentAreaCreateWithoutRubricInput[] | AssignmentAreaUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: AssignmentAreaCreateOrConnectWithoutRubricInput | AssignmentAreaCreateOrConnectWithoutRubricInput[]
    upsert?: AssignmentAreaUpsertWithWhereUniqueWithoutRubricInput | AssignmentAreaUpsertWithWhereUniqueWithoutRubricInput[]
    createMany?: AssignmentAreaCreateManyRubricInputEnvelope
    set?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
    disconnect?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
    delete?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
    connect?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
    update?: AssignmentAreaUpdateWithWhereUniqueWithoutRubricInput | AssignmentAreaUpdateWithWhereUniqueWithoutRubricInput[]
    updateMany?: AssignmentAreaUpdateManyWithWhereWithoutRubricInput | AssignmentAreaUpdateManyWithWhereWithoutRubricInput[]
    deleteMany?: AssignmentAreaScalarWhereInput | AssignmentAreaScalarWhereInput[]
  }

  export type GradingResultUncheckedUpdateManyWithoutRubricNestedInput = {
    create?: XOR<GradingResultCreateWithoutRubricInput, GradingResultUncheckedCreateWithoutRubricInput> | GradingResultCreateWithoutRubricInput[] | GradingResultUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: GradingResultCreateOrConnectWithoutRubricInput | GradingResultCreateOrConnectWithoutRubricInput[]
    upsert?: GradingResultUpsertWithWhereUniqueWithoutRubricInput | GradingResultUpsertWithWhereUniqueWithoutRubricInput[]
    createMany?: GradingResultCreateManyRubricInputEnvelope
    set?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    disconnect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    delete?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    connect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    update?: GradingResultUpdateWithWhereUniqueWithoutRubricInput | GradingResultUpdateWithWhereUniqueWithoutRubricInput[]
    updateMany?: GradingResultUpdateManyWithWhereWithoutRubricInput | GradingResultUpdateManyWithWhereWithoutRubricInput[]
    deleteMany?: GradingResultScalarWhereInput | GradingResultScalarWhereInput[]
  }

  export type AssignmentAreaUncheckedUpdateManyWithoutRubricNestedInput = {
    create?: XOR<AssignmentAreaCreateWithoutRubricInput, AssignmentAreaUncheckedCreateWithoutRubricInput> | AssignmentAreaCreateWithoutRubricInput[] | AssignmentAreaUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: AssignmentAreaCreateOrConnectWithoutRubricInput | AssignmentAreaCreateOrConnectWithoutRubricInput[]
    upsert?: AssignmentAreaUpsertWithWhereUniqueWithoutRubricInput | AssignmentAreaUpsertWithWhereUniqueWithoutRubricInput[]
    createMany?: AssignmentAreaCreateManyRubricInputEnvelope
    set?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
    disconnect?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
    delete?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
    connect?: AssignmentAreaWhereUniqueInput | AssignmentAreaWhereUniqueInput[]
    update?: AssignmentAreaUpdateWithWhereUniqueWithoutRubricInput | AssignmentAreaUpdateWithWhereUniqueWithoutRubricInput[]
    updateMany?: AssignmentAreaUpdateManyWithWhereWithoutRubricInput | AssignmentAreaUpdateManyWithWhereWithoutRubricInput[]
    deleteMany?: AssignmentAreaScalarWhereInput | AssignmentAreaScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutGradingSessionsInput = {
    create?: XOR<UserCreateWithoutGradingSessionsInput, UserUncheckedCreateWithoutGradingSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutGradingSessionsInput
    connect?: UserWhereUniqueInput
  }

  export type GradingResultCreateNestedManyWithoutGradingSessionInput = {
    create?: XOR<GradingResultCreateWithoutGradingSessionInput, GradingResultUncheckedCreateWithoutGradingSessionInput> | GradingResultCreateWithoutGradingSessionInput[] | GradingResultUncheckedCreateWithoutGradingSessionInput[]
    connectOrCreate?: GradingResultCreateOrConnectWithoutGradingSessionInput | GradingResultCreateOrConnectWithoutGradingSessionInput[]
    createMany?: GradingResultCreateManyGradingSessionInputEnvelope
    connect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
  }

  export type GradingResultUncheckedCreateNestedManyWithoutGradingSessionInput = {
    create?: XOR<GradingResultCreateWithoutGradingSessionInput, GradingResultUncheckedCreateWithoutGradingSessionInput> | GradingResultCreateWithoutGradingSessionInput[] | GradingResultUncheckedCreateWithoutGradingSessionInput[]
    connectOrCreate?: GradingResultCreateOrConnectWithoutGradingSessionInput | GradingResultCreateOrConnectWithoutGradingSessionInput[]
    createMany?: GradingResultCreateManyGradingSessionInputEnvelope
    connect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
  }

  export type EnumGradingSessionStatusFieldUpdateOperationsInput = {
    set?: $Enums.GradingSessionStatus
  }

  export type UserUpdateOneRequiredWithoutGradingSessionsNestedInput = {
    create?: XOR<UserCreateWithoutGradingSessionsInput, UserUncheckedCreateWithoutGradingSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutGradingSessionsInput
    upsert?: UserUpsertWithoutGradingSessionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutGradingSessionsInput, UserUpdateWithoutGradingSessionsInput>, UserUncheckedUpdateWithoutGradingSessionsInput>
  }

  export type GradingResultUpdateManyWithoutGradingSessionNestedInput = {
    create?: XOR<GradingResultCreateWithoutGradingSessionInput, GradingResultUncheckedCreateWithoutGradingSessionInput> | GradingResultCreateWithoutGradingSessionInput[] | GradingResultUncheckedCreateWithoutGradingSessionInput[]
    connectOrCreate?: GradingResultCreateOrConnectWithoutGradingSessionInput | GradingResultCreateOrConnectWithoutGradingSessionInput[]
    upsert?: GradingResultUpsertWithWhereUniqueWithoutGradingSessionInput | GradingResultUpsertWithWhereUniqueWithoutGradingSessionInput[]
    createMany?: GradingResultCreateManyGradingSessionInputEnvelope
    set?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    disconnect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    delete?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    connect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    update?: GradingResultUpdateWithWhereUniqueWithoutGradingSessionInput | GradingResultUpdateWithWhereUniqueWithoutGradingSessionInput[]
    updateMany?: GradingResultUpdateManyWithWhereWithoutGradingSessionInput | GradingResultUpdateManyWithWhereWithoutGradingSessionInput[]
    deleteMany?: GradingResultScalarWhereInput | GradingResultScalarWhereInput[]
  }

  export type GradingResultUncheckedUpdateManyWithoutGradingSessionNestedInput = {
    create?: XOR<GradingResultCreateWithoutGradingSessionInput, GradingResultUncheckedCreateWithoutGradingSessionInput> | GradingResultCreateWithoutGradingSessionInput[] | GradingResultUncheckedCreateWithoutGradingSessionInput[]
    connectOrCreate?: GradingResultCreateOrConnectWithoutGradingSessionInput | GradingResultCreateOrConnectWithoutGradingSessionInput[]
    upsert?: GradingResultUpsertWithWhereUniqueWithoutGradingSessionInput | GradingResultUpsertWithWhereUniqueWithoutGradingSessionInput[]
    createMany?: GradingResultCreateManyGradingSessionInputEnvelope
    set?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    disconnect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    delete?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    connect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    update?: GradingResultUpdateWithWhereUniqueWithoutGradingSessionInput | GradingResultUpdateWithWhereUniqueWithoutGradingSessionInput[]
    updateMany?: GradingResultUpdateManyWithWhereWithoutGradingSessionInput | GradingResultUpdateManyWithWhereWithoutGradingSessionInput[]
    deleteMany?: GradingResultScalarWhereInput | GradingResultScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutUploadedFilesInput = {
    create?: XOR<UserCreateWithoutUploadedFilesInput, UserUncheckedCreateWithoutUploadedFilesInput>
    connectOrCreate?: UserCreateOrConnectWithoutUploadedFilesInput
    connect?: UserWhereUniqueInput
  }

  export type GradingResultCreateNestedManyWithoutUploadedFileInput = {
    create?: XOR<GradingResultCreateWithoutUploadedFileInput, GradingResultUncheckedCreateWithoutUploadedFileInput> | GradingResultCreateWithoutUploadedFileInput[] | GradingResultUncheckedCreateWithoutUploadedFileInput[]
    connectOrCreate?: GradingResultCreateOrConnectWithoutUploadedFileInput | GradingResultCreateOrConnectWithoutUploadedFileInput[]
    createMany?: GradingResultCreateManyUploadedFileInputEnvelope
    connect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
  }

  export type GradingResultUncheckedCreateNestedManyWithoutUploadedFileInput = {
    create?: XOR<GradingResultCreateWithoutUploadedFileInput, GradingResultUncheckedCreateWithoutUploadedFileInput> | GradingResultCreateWithoutUploadedFileInput[] | GradingResultUncheckedCreateWithoutUploadedFileInput[]
    connectOrCreate?: GradingResultCreateOrConnectWithoutUploadedFileInput | GradingResultCreateOrConnectWithoutUploadedFileInput[]
    createMany?: GradingResultCreateManyUploadedFileInputEnvelope
    connect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
  }

  export type EnumFileParseStatusFieldUpdateOperationsInput = {
    set?: $Enums.FileParseStatus
  }

  export type UserUpdateOneRequiredWithoutUploadedFilesNestedInput = {
    create?: XOR<UserCreateWithoutUploadedFilesInput, UserUncheckedCreateWithoutUploadedFilesInput>
    connectOrCreate?: UserCreateOrConnectWithoutUploadedFilesInput
    upsert?: UserUpsertWithoutUploadedFilesInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutUploadedFilesInput, UserUpdateWithoutUploadedFilesInput>, UserUncheckedUpdateWithoutUploadedFilesInput>
  }

  export type GradingResultUpdateManyWithoutUploadedFileNestedInput = {
    create?: XOR<GradingResultCreateWithoutUploadedFileInput, GradingResultUncheckedCreateWithoutUploadedFileInput> | GradingResultCreateWithoutUploadedFileInput[] | GradingResultUncheckedCreateWithoutUploadedFileInput[]
    connectOrCreate?: GradingResultCreateOrConnectWithoutUploadedFileInput | GradingResultCreateOrConnectWithoutUploadedFileInput[]
    upsert?: GradingResultUpsertWithWhereUniqueWithoutUploadedFileInput | GradingResultUpsertWithWhereUniqueWithoutUploadedFileInput[]
    createMany?: GradingResultCreateManyUploadedFileInputEnvelope
    set?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    disconnect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    delete?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    connect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    update?: GradingResultUpdateWithWhereUniqueWithoutUploadedFileInput | GradingResultUpdateWithWhereUniqueWithoutUploadedFileInput[]
    updateMany?: GradingResultUpdateManyWithWhereWithoutUploadedFileInput | GradingResultUpdateManyWithWhereWithoutUploadedFileInput[]
    deleteMany?: GradingResultScalarWhereInput | GradingResultScalarWhereInput[]
  }

  export type GradingResultUncheckedUpdateManyWithoutUploadedFileNestedInput = {
    create?: XOR<GradingResultCreateWithoutUploadedFileInput, GradingResultUncheckedCreateWithoutUploadedFileInput> | GradingResultCreateWithoutUploadedFileInput[] | GradingResultUncheckedCreateWithoutUploadedFileInput[]
    connectOrCreate?: GradingResultCreateOrConnectWithoutUploadedFileInput | GradingResultCreateOrConnectWithoutUploadedFileInput[]
    upsert?: GradingResultUpsertWithWhereUniqueWithoutUploadedFileInput | GradingResultUpsertWithWhereUniqueWithoutUploadedFileInput[]
    createMany?: GradingResultCreateManyUploadedFileInputEnvelope
    set?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    disconnect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    delete?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    connect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
    update?: GradingResultUpdateWithWhereUniqueWithoutUploadedFileInput | GradingResultUpdateWithWhereUniqueWithoutUploadedFileInput[]
    updateMany?: GradingResultUpdateManyWithWhereWithoutUploadedFileInput | GradingResultUpdateManyWithWhereWithoutUploadedFileInput[]
    deleteMany?: GradingResultScalarWhereInput | GradingResultScalarWhereInput[]
  }

  export type GradingSessionCreateNestedOneWithoutGradingResultsInput = {
    create?: XOR<GradingSessionCreateWithoutGradingResultsInput, GradingSessionUncheckedCreateWithoutGradingResultsInput>
    connectOrCreate?: GradingSessionCreateOrConnectWithoutGradingResultsInput
    connect?: GradingSessionWhereUniqueInput
  }

  export type UploadedFileCreateNestedOneWithoutGradingResultsInput = {
    create?: XOR<UploadedFileCreateWithoutGradingResultsInput, UploadedFileUncheckedCreateWithoutGradingResultsInput>
    connectOrCreate?: UploadedFileCreateOrConnectWithoutGradingResultsInput
    connect?: UploadedFileWhereUniqueInput
  }

  export type RubricCreateNestedOneWithoutGradingResultsInput = {
    create?: XOR<RubricCreateWithoutGradingResultsInput, RubricUncheckedCreateWithoutGradingResultsInput>
    connectOrCreate?: RubricCreateOrConnectWithoutGradingResultsInput
    connect?: RubricWhereUniqueInput
  }

  export type EnumGradingStatusFieldUpdateOperationsInput = {
    set?: $Enums.GradingStatus
  }

  export type GradingSessionUpdateOneRequiredWithoutGradingResultsNestedInput = {
    create?: XOR<GradingSessionCreateWithoutGradingResultsInput, GradingSessionUncheckedCreateWithoutGradingResultsInput>
    connectOrCreate?: GradingSessionCreateOrConnectWithoutGradingResultsInput
    upsert?: GradingSessionUpsertWithoutGradingResultsInput
    connect?: GradingSessionWhereUniqueInput
    update?: XOR<XOR<GradingSessionUpdateToOneWithWhereWithoutGradingResultsInput, GradingSessionUpdateWithoutGradingResultsInput>, GradingSessionUncheckedUpdateWithoutGradingResultsInput>
  }

  export type UploadedFileUpdateOneRequiredWithoutGradingResultsNestedInput = {
    create?: XOR<UploadedFileCreateWithoutGradingResultsInput, UploadedFileUncheckedCreateWithoutGradingResultsInput>
    connectOrCreate?: UploadedFileCreateOrConnectWithoutGradingResultsInput
    upsert?: UploadedFileUpsertWithoutGradingResultsInput
    connect?: UploadedFileWhereUniqueInput
    update?: XOR<XOR<UploadedFileUpdateToOneWithWhereWithoutGradingResultsInput, UploadedFileUpdateWithoutGradingResultsInput>, UploadedFileUncheckedUpdateWithoutGradingResultsInput>
  }

  export type RubricUpdateOneRequiredWithoutGradingResultsNestedInput = {
    create?: XOR<RubricCreateWithoutGradingResultsInput, RubricUncheckedCreateWithoutGradingResultsInput>
    connectOrCreate?: RubricCreateOrConnectWithoutGradingResultsInput
    upsert?: RubricUpsertWithoutGradingResultsInput
    connect?: RubricWhereUniqueInput
    update?: XOR<XOR<RubricUpdateToOneWithWhereWithoutGradingResultsInput, RubricUpdateWithoutGradingResultsInput>, RubricUncheckedUpdateWithoutGradingResultsInput>
  }

  export type UserCreateNestedOneWithoutEnrollmentsInput = {
    create?: XOR<UserCreateWithoutEnrollmentsInput, UserUncheckedCreateWithoutEnrollmentsInput>
    connectOrCreate?: UserCreateOrConnectWithoutEnrollmentsInput
    connect?: UserWhereUniqueInput
  }

  export type CourseCreateNestedOneWithoutEnrollmentsInput = {
    create?: XOR<CourseCreateWithoutEnrollmentsInput, CourseUncheckedCreateWithoutEnrollmentsInput>
    connectOrCreate?: CourseCreateOrConnectWithoutEnrollmentsInput
    connect?: CourseWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutEnrollmentsNestedInput = {
    create?: XOR<UserCreateWithoutEnrollmentsInput, UserUncheckedCreateWithoutEnrollmentsInput>
    connectOrCreate?: UserCreateOrConnectWithoutEnrollmentsInput
    upsert?: UserUpsertWithoutEnrollmentsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutEnrollmentsInput, UserUpdateWithoutEnrollmentsInput>, UserUncheckedUpdateWithoutEnrollmentsInput>
  }

  export type CourseUpdateOneRequiredWithoutEnrollmentsNestedInput = {
    create?: XOR<CourseCreateWithoutEnrollmentsInput, CourseUncheckedCreateWithoutEnrollmentsInput>
    connectOrCreate?: CourseCreateOrConnectWithoutEnrollmentsInput
    upsert?: CourseUpsertWithoutEnrollmentsInput
    connect?: CourseWhereUniqueInput
    update?: XOR<XOR<CourseUpdateToOneWithWhereWithoutEnrollmentsInput, CourseUpdateWithoutEnrollmentsInput>, CourseUncheckedUpdateWithoutEnrollmentsInput>
  }

  export type CourseCreateNestedOneWithoutInvitationCodesInput = {
    create?: XOR<CourseCreateWithoutInvitationCodesInput, CourseUncheckedCreateWithoutInvitationCodesInput>
    connectOrCreate?: CourseCreateOrConnectWithoutInvitationCodesInput
    connect?: CourseWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutUsedInvitationsInput = {
    create?: XOR<UserCreateWithoutUsedInvitationsInput, UserUncheckedCreateWithoutUsedInvitationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutUsedInvitationsInput
    connect?: UserWhereUniqueInput
  }

  export type CourseUpdateOneRequiredWithoutInvitationCodesNestedInput = {
    create?: XOR<CourseCreateWithoutInvitationCodesInput, CourseUncheckedCreateWithoutInvitationCodesInput>
    connectOrCreate?: CourseCreateOrConnectWithoutInvitationCodesInput
    upsert?: CourseUpsertWithoutInvitationCodesInput
    connect?: CourseWhereUniqueInput
    update?: XOR<XOR<CourseUpdateToOneWithWhereWithoutInvitationCodesInput, CourseUpdateWithoutInvitationCodesInput>, CourseUncheckedUpdateWithoutInvitationCodesInput>
  }

  export type UserUpdateOneWithoutUsedInvitationsNestedInput = {
    create?: XOR<UserCreateWithoutUsedInvitationsInput, UserUncheckedCreateWithoutUsedInvitationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutUsedInvitationsInput
    upsert?: UserUpsertWithoutUsedInvitationsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutUsedInvitationsInput, UserUpdateWithoutUsedInvitationsInput>, UserUncheckedUpdateWithoutUsedInvitationsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedEnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedEnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedEnumSubmissionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SubmissionStatus | EnumSubmissionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubmissionStatusFilter<$PrismaModel> | $Enums.SubmissionStatus
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumSubmissionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubmissionStatus | EnumSubmissionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubmissionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SubmissionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubmissionStatusFilter<$PrismaModel>
    _max?: NestedEnumSubmissionStatusFilter<$PrismaModel>
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedEnumGradingSessionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.GradingSessionStatus | EnumGradingSessionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.GradingSessionStatus[] | ListEnumGradingSessionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.GradingSessionStatus[] | ListEnumGradingSessionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumGradingSessionStatusFilter<$PrismaModel> | $Enums.GradingSessionStatus
  }

  export type NestedEnumGradingSessionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.GradingSessionStatus | EnumGradingSessionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.GradingSessionStatus[] | ListEnumGradingSessionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.GradingSessionStatus[] | ListEnumGradingSessionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumGradingSessionStatusWithAggregatesFilter<$PrismaModel> | $Enums.GradingSessionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumGradingSessionStatusFilter<$PrismaModel>
    _max?: NestedEnumGradingSessionStatusFilter<$PrismaModel>
  }

  export type NestedEnumFileParseStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.FileParseStatus | EnumFileParseStatusFieldRefInput<$PrismaModel>
    in?: $Enums.FileParseStatus[] | ListEnumFileParseStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.FileParseStatus[] | ListEnumFileParseStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumFileParseStatusFilter<$PrismaModel> | $Enums.FileParseStatus
  }

  export type NestedEnumFileParseStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.FileParseStatus | EnumFileParseStatusFieldRefInput<$PrismaModel>
    in?: $Enums.FileParseStatus[] | ListEnumFileParseStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.FileParseStatus[] | ListEnumFileParseStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumFileParseStatusWithAggregatesFilter<$PrismaModel> | $Enums.FileParseStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumFileParseStatusFilter<$PrismaModel>
    _max?: NestedEnumFileParseStatusFilter<$PrismaModel>
  }

  export type NestedEnumGradingStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.GradingStatus | EnumGradingStatusFieldRefInput<$PrismaModel>
    in?: $Enums.GradingStatus[] | ListEnumGradingStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.GradingStatus[] | ListEnumGradingStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumGradingStatusFilter<$PrismaModel> | $Enums.GradingStatus
  }

  export type NestedEnumGradingStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.GradingStatus | EnumGradingStatusFieldRefInput<$PrismaModel>
    in?: $Enums.GradingStatus[] | ListEnumGradingStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.GradingStatus[] | ListEnumGradingStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumGradingStatusWithAggregatesFilter<$PrismaModel> | $Enums.GradingStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumGradingStatusFilter<$PrismaModel>
    _max?: NestedEnumGradingStatusFilter<$PrismaModel>
  }

  export type RubricCreateWithoutUserInput = {
    id?: string
    name: string
    description: string
    version?: number
    isActive?: boolean
    isTemplate?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    teacher?: UserCreateNestedOneWithoutTeacherRubricsInput
    gradingResults?: GradingResultCreateNestedManyWithoutRubricInput
    assignmentAreas?: AssignmentAreaCreateNestedManyWithoutRubricInput
  }

  export type RubricUncheckedCreateWithoutUserInput = {
    id?: string
    teacherId?: string | null
    name: string
    description: string
    version?: number
    isActive?: boolean
    isTemplate?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    gradingResults?: GradingResultUncheckedCreateNestedManyWithoutRubricInput
    assignmentAreas?: AssignmentAreaUncheckedCreateNestedManyWithoutRubricInput
  }

  export type RubricCreateOrConnectWithoutUserInput = {
    where: RubricWhereUniqueInput
    create: XOR<RubricCreateWithoutUserInput, RubricUncheckedCreateWithoutUserInput>
  }

  export type RubricCreateManyUserInputEnvelope = {
    data: RubricCreateManyUserInput | RubricCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type GradingSessionCreateWithoutUserInput = {
    id?: string
    status?: $Enums.GradingSessionStatus
    progress?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    gradingResults?: GradingResultCreateNestedManyWithoutGradingSessionInput
  }

  export type GradingSessionUncheckedCreateWithoutUserInput = {
    id?: string
    status?: $Enums.GradingSessionStatus
    progress?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    gradingResults?: GradingResultUncheckedCreateNestedManyWithoutGradingSessionInput
  }

  export type GradingSessionCreateOrConnectWithoutUserInput = {
    where: GradingSessionWhereUniqueInput
    create: XOR<GradingSessionCreateWithoutUserInput, GradingSessionUncheckedCreateWithoutUserInput>
  }

  export type GradingSessionCreateManyUserInputEnvelope = {
    data: GradingSessionCreateManyUserInput | GradingSessionCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type UploadedFileCreateWithoutUserInput = {
    id?: string
    fileName: string
    originalFileName: string
    fileKey: string
    fileSize: number
    mimeType: string
    parseStatus?: $Enums.FileParseStatus
    parsedContent?: string | null
    parseError?: string | null
    isDeleted?: boolean
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    expiresAt?: Date | string | null
    gradingResults?: GradingResultCreateNestedManyWithoutUploadedFileInput
  }

  export type UploadedFileUncheckedCreateWithoutUserInput = {
    id?: string
    fileName: string
    originalFileName: string
    fileKey: string
    fileSize: number
    mimeType: string
    parseStatus?: $Enums.FileParseStatus
    parsedContent?: string | null
    parseError?: string | null
    isDeleted?: boolean
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    expiresAt?: Date | string | null
    gradingResults?: GradingResultUncheckedCreateNestedManyWithoutUploadedFileInput
  }

  export type UploadedFileCreateOrConnectWithoutUserInput = {
    where: UploadedFileWhereUniqueInput
    create: XOR<UploadedFileCreateWithoutUserInput, UploadedFileUncheckedCreateWithoutUserInput>
  }

  export type UploadedFileCreateManyUserInputEnvelope = {
    data: UploadedFileCreateManyUserInput | UploadedFileCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type CourseCreateWithoutTeacherInput = {
    id?: string
    name: string
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    assignmentAreas?: AssignmentAreaCreateNestedManyWithoutCourseInput
    enrollments?: EnrollmentCreateNestedManyWithoutCourseInput
    invitationCodes?: InvitationCodeCreateNestedManyWithoutCourseInput
  }

  export type CourseUncheckedCreateWithoutTeacherInput = {
    id?: string
    name: string
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    assignmentAreas?: AssignmentAreaUncheckedCreateNestedManyWithoutCourseInput
    enrollments?: EnrollmentUncheckedCreateNestedManyWithoutCourseInput
    invitationCodes?: InvitationCodeUncheckedCreateNestedManyWithoutCourseInput
  }

  export type CourseCreateOrConnectWithoutTeacherInput = {
    where: CourseWhereUniqueInput
    create: XOR<CourseCreateWithoutTeacherInput, CourseUncheckedCreateWithoutTeacherInput>
  }

  export type CourseCreateManyTeacherInputEnvelope = {
    data: CourseCreateManyTeacherInput | CourseCreateManyTeacherInput[]
    skipDuplicates?: boolean
  }

  export type RubricCreateWithoutTeacherInput = {
    id?: string
    name: string
    description: string
    version?: number
    isActive?: boolean
    isTemplate?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutRubricsInput
    gradingResults?: GradingResultCreateNestedManyWithoutRubricInput
    assignmentAreas?: AssignmentAreaCreateNestedManyWithoutRubricInput
  }

  export type RubricUncheckedCreateWithoutTeacherInput = {
    id?: string
    userId: string
    name: string
    description: string
    version?: number
    isActive?: boolean
    isTemplate?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    gradingResults?: GradingResultUncheckedCreateNestedManyWithoutRubricInput
    assignmentAreas?: AssignmentAreaUncheckedCreateNestedManyWithoutRubricInput
  }

  export type RubricCreateOrConnectWithoutTeacherInput = {
    where: RubricWhereUniqueInput
    create: XOR<RubricCreateWithoutTeacherInput, RubricUncheckedCreateWithoutTeacherInput>
  }

  export type RubricCreateManyTeacherInputEnvelope = {
    data: RubricCreateManyTeacherInput | RubricCreateManyTeacherInput[]
    skipDuplicates?: boolean
  }

  export type SubmissionCreateWithoutStudentInput = {
    id?: string
    filePath: string
    uploadedAt?: Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: number | null
    teacherFeedback?: string | null
    status?: $Enums.SubmissionStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    assignmentArea: AssignmentAreaCreateNestedOneWithoutSubmissionsInput
  }

  export type SubmissionUncheckedCreateWithoutStudentInput = {
    id?: string
    assignmentAreaId: string
    filePath: string
    uploadedAt?: Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: number | null
    teacherFeedback?: string | null
    status?: $Enums.SubmissionStatus
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubmissionCreateOrConnectWithoutStudentInput = {
    where: SubmissionWhereUniqueInput
    create: XOR<SubmissionCreateWithoutStudentInput, SubmissionUncheckedCreateWithoutStudentInput>
  }

  export type SubmissionCreateManyStudentInputEnvelope = {
    data: SubmissionCreateManyStudentInput | SubmissionCreateManyStudentInput[]
    skipDuplicates?: boolean
  }

  export type EnrollmentCreateWithoutStudentInput = {
    id?: string
    enrolledAt?: Date | string
    course: CourseCreateNestedOneWithoutEnrollmentsInput
  }

  export type EnrollmentUncheckedCreateWithoutStudentInput = {
    id?: string
    courseId: string
    enrolledAt?: Date | string
  }

  export type EnrollmentCreateOrConnectWithoutStudentInput = {
    where: EnrollmentWhereUniqueInput
    create: XOR<EnrollmentCreateWithoutStudentInput, EnrollmentUncheckedCreateWithoutStudentInput>
  }

  export type EnrollmentCreateManyStudentInputEnvelope = {
    data: EnrollmentCreateManyStudentInput | EnrollmentCreateManyStudentInput[]
    skipDuplicates?: boolean
  }

  export type InvitationCodeCreateWithoutUsedByInput = {
    id?: string
    code: string
    createdAt?: Date | string
    expiresAt: Date | string
    isUsed?: boolean
    usedAt?: Date | string | null
    course: CourseCreateNestedOneWithoutInvitationCodesInput
  }

  export type InvitationCodeUncheckedCreateWithoutUsedByInput = {
    id?: string
    code: string
    courseId: string
    createdAt?: Date | string
    expiresAt: Date | string
    isUsed?: boolean
    usedAt?: Date | string | null
  }

  export type InvitationCodeCreateOrConnectWithoutUsedByInput = {
    where: InvitationCodeWhereUniqueInput
    create: XOR<InvitationCodeCreateWithoutUsedByInput, InvitationCodeUncheckedCreateWithoutUsedByInput>
  }

  export type InvitationCodeCreateManyUsedByInputEnvelope = {
    data: InvitationCodeCreateManyUsedByInput | InvitationCodeCreateManyUsedByInput[]
    skipDuplicates?: boolean
  }

  export type RubricUpsertWithWhereUniqueWithoutUserInput = {
    where: RubricWhereUniqueInput
    update: XOR<RubricUpdateWithoutUserInput, RubricUncheckedUpdateWithoutUserInput>
    create: XOR<RubricCreateWithoutUserInput, RubricUncheckedCreateWithoutUserInput>
  }

  export type RubricUpdateWithWhereUniqueWithoutUserInput = {
    where: RubricWhereUniqueInput
    data: XOR<RubricUpdateWithoutUserInput, RubricUncheckedUpdateWithoutUserInput>
  }

  export type RubricUpdateManyWithWhereWithoutUserInput = {
    where: RubricScalarWhereInput
    data: XOR<RubricUpdateManyMutationInput, RubricUncheckedUpdateManyWithoutUserInput>
  }

  export type RubricScalarWhereInput = {
    AND?: RubricScalarWhereInput | RubricScalarWhereInput[]
    OR?: RubricScalarWhereInput[]
    NOT?: RubricScalarWhereInput | RubricScalarWhereInput[]
    id?: StringFilter<"Rubric"> | string
    userId?: StringFilter<"Rubric"> | string
    teacherId?: StringNullableFilter<"Rubric"> | string | null
    name?: StringFilter<"Rubric"> | string
    description?: StringFilter<"Rubric"> | string
    version?: IntFilter<"Rubric"> | number
    isActive?: BoolFilter<"Rubric"> | boolean
    isTemplate?: BoolFilter<"Rubric"> | boolean
    criteria?: JsonFilter<"Rubric">
    createdAt?: DateTimeFilter<"Rubric"> | Date | string
    updatedAt?: DateTimeFilter<"Rubric"> | Date | string
  }

  export type GradingSessionUpsertWithWhereUniqueWithoutUserInput = {
    where: GradingSessionWhereUniqueInput
    update: XOR<GradingSessionUpdateWithoutUserInput, GradingSessionUncheckedUpdateWithoutUserInput>
    create: XOR<GradingSessionCreateWithoutUserInput, GradingSessionUncheckedCreateWithoutUserInput>
  }

  export type GradingSessionUpdateWithWhereUniqueWithoutUserInput = {
    where: GradingSessionWhereUniqueInput
    data: XOR<GradingSessionUpdateWithoutUserInput, GradingSessionUncheckedUpdateWithoutUserInput>
  }

  export type GradingSessionUpdateManyWithWhereWithoutUserInput = {
    where: GradingSessionScalarWhereInput
    data: XOR<GradingSessionUpdateManyMutationInput, GradingSessionUncheckedUpdateManyWithoutUserInput>
  }

  export type GradingSessionScalarWhereInput = {
    AND?: GradingSessionScalarWhereInput | GradingSessionScalarWhereInput[]
    OR?: GradingSessionScalarWhereInput[]
    NOT?: GradingSessionScalarWhereInput | GradingSessionScalarWhereInput[]
    id?: StringFilter<"GradingSession"> | string
    userId?: StringFilter<"GradingSession"> | string
    status?: EnumGradingSessionStatusFilter<"GradingSession"> | $Enums.GradingSessionStatus
    progress?: IntFilter<"GradingSession"> | number
    createdAt?: DateTimeFilter<"GradingSession"> | Date | string
    updatedAt?: DateTimeFilter<"GradingSession"> | Date | string
  }

  export type UploadedFileUpsertWithWhereUniqueWithoutUserInput = {
    where: UploadedFileWhereUniqueInput
    update: XOR<UploadedFileUpdateWithoutUserInput, UploadedFileUncheckedUpdateWithoutUserInput>
    create: XOR<UploadedFileCreateWithoutUserInput, UploadedFileUncheckedCreateWithoutUserInput>
  }

  export type UploadedFileUpdateWithWhereUniqueWithoutUserInput = {
    where: UploadedFileWhereUniqueInput
    data: XOR<UploadedFileUpdateWithoutUserInput, UploadedFileUncheckedUpdateWithoutUserInput>
  }

  export type UploadedFileUpdateManyWithWhereWithoutUserInput = {
    where: UploadedFileScalarWhereInput
    data: XOR<UploadedFileUpdateManyMutationInput, UploadedFileUncheckedUpdateManyWithoutUserInput>
  }

  export type UploadedFileScalarWhereInput = {
    AND?: UploadedFileScalarWhereInput | UploadedFileScalarWhereInput[]
    OR?: UploadedFileScalarWhereInput[]
    NOT?: UploadedFileScalarWhereInput | UploadedFileScalarWhereInput[]
    id?: StringFilter<"UploadedFile"> | string
    userId?: StringFilter<"UploadedFile"> | string
    fileName?: StringFilter<"UploadedFile"> | string
    originalFileName?: StringFilter<"UploadedFile"> | string
    fileKey?: StringFilter<"UploadedFile"> | string
    fileSize?: IntFilter<"UploadedFile"> | number
    mimeType?: StringFilter<"UploadedFile"> | string
    parseStatus?: EnumFileParseStatusFilter<"UploadedFile"> | $Enums.FileParseStatus
    parsedContent?: StringNullableFilter<"UploadedFile"> | string | null
    parseError?: StringNullableFilter<"UploadedFile"> | string | null
    isDeleted?: BoolFilter<"UploadedFile"> | boolean
    deletedAt?: DateTimeNullableFilter<"UploadedFile"> | Date | string | null
    createdAt?: DateTimeFilter<"UploadedFile"> | Date | string
    updatedAt?: DateTimeFilter<"UploadedFile"> | Date | string
    expiresAt?: DateTimeNullableFilter<"UploadedFile"> | Date | string | null
  }

  export type CourseUpsertWithWhereUniqueWithoutTeacherInput = {
    where: CourseWhereUniqueInput
    update: XOR<CourseUpdateWithoutTeacherInput, CourseUncheckedUpdateWithoutTeacherInput>
    create: XOR<CourseCreateWithoutTeacherInput, CourseUncheckedCreateWithoutTeacherInput>
  }

  export type CourseUpdateWithWhereUniqueWithoutTeacherInput = {
    where: CourseWhereUniqueInput
    data: XOR<CourseUpdateWithoutTeacherInput, CourseUncheckedUpdateWithoutTeacherInput>
  }

  export type CourseUpdateManyWithWhereWithoutTeacherInput = {
    where: CourseScalarWhereInput
    data: XOR<CourseUpdateManyMutationInput, CourseUncheckedUpdateManyWithoutTeacherInput>
  }

  export type CourseScalarWhereInput = {
    AND?: CourseScalarWhereInput | CourseScalarWhereInput[]
    OR?: CourseScalarWhereInput[]
    NOT?: CourseScalarWhereInput | CourseScalarWhereInput[]
    id?: StringFilter<"Course"> | string
    name?: StringFilter<"Course"> | string
    description?: StringNullableFilter<"Course"> | string | null
    teacherId?: StringFilter<"Course"> | string
    createdAt?: DateTimeFilter<"Course"> | Date | string
    updatedAt?: DateTimeFilter<"Course"> | Date | string
  }

  export type RubricUpsertWithWhereUniqueWithoutTeacherInput = {
    where: RubricWhereUniqueInput
    update: XOR<RubricUpdateWithoutTeacherInput, RubricUncheckedUpdateWithoutTeacherInput>
    create: XOR<RubricCreateWithoutTeacherInput, RubricUncheckedCreateWithoutTeacherInput>
  }

  export type RubricUpdateWithWhereUniqueWithoutTeacherInput = {
    where: RubricWhereUniqueInput
    data: XOR<RubricUpdateWithoutTeacherInput, RubricUncheckedUpdateWithoutTeacherInput>
  }

  export type RubricUpdateManyWithWhereWithoutTeacherInput = {
    where: RubricScalarWhereInput
    data: XOR<RubricUpdateManyMutationInput, RubricUncheckedUpdateManyWithoutTeacherInput>
  }

  export type SubmissionUpsertWithWhereUniqueWithoutStudentInput = {
    where: SubmissionWhereUniqueInput
    update: XOR<SubmissionUpdateWithoutStudentInput, SubmissionUncheckedUpdateWithoutStudentInput>
    create: XOR<SubmissionCreateWithoutStudentInput, SubmissionUncheckedCreateWithoutStudentInput>
  }

  export type SubmissionUpdateWithWhereUniqueWithoutStudentInput = {
    where: SubmissionWhereUniqueInput
    data: XOR<SubmissionUpdateWithoutStudentInput, SubmissionUncheckedUpdateWithoutStudentInput>
  }

  export type SubmissionUpdateManyWithWhereWithoutStudentInput = {
    where: SubmissionScalarWhereInput
    data: XOR<SubmissionUpdateManyMutationInput, SubmissionUncheckedUpdateManyWithoutStudentInput>
  }

  export type SubmissionScalarWhereInput = {
    AND?: SubmissionScalarWhereInput | SubmissionScalarWhereInput[]
    OR?: SubmissionScalarWhereInput[]
    NOT?: SubmissionScalarWhereInput | SubmissionScalarWhereInput[]
    id?: StringFilter<"Submission"> | string
    studentId?: StringFilter<"Submission"> | string
    assignmentAreaId?: StringFilter<"Submission"> | string
    filePath?: StringFilter<"Submission"> | string
    uploadedAt?: DateTimeFilter<"Submission"> | Date | string
    aiAnalysisResult?: JsonNullableFilter<"Submission">
    finalScore?: IntNullableFilter<"Submission"> | number | null
    teacherFeedback?: StringNullableFilter<"Submission"> | string | null
    status?: EnumSubmissionStatusFilter<"Submission"> | $Enums.SubmissionStatus
    createdAt?: DateTimeFilter<"Submission"> | Date | string
    updatedAt?: DateTimeFilter<"Submission"> | Date | string
  }

  export type EnrollmentUpsertWithWhereUniqueWithoutStudentInput = {
    where: EnrollmentWhereUniqueInput
    update: XOR<EnrollmentUpdateWithoutStudentInput, EnrollmentUncheckedUpdateWithoutStudentInput>
    create: XOR<EnrollmentCreateWithoutStudentInput, EnrollmentUncheckedCreateWithoutStudentInput>
  }

  export type EnrollmentUpdateWithWhereUniqueWithoutStudentInput = {
    where: EnrollmentWhereUniqueInput
    data: XOR<EnrollmentUpdateWithoutStudentInput, EnrollmentUncheckedUpdateWithoutStudentInput>
  }

  export type EnrollmentUpdateManyWithWhereWithoutStudentInput = {
    where: EnrollmentScalarWhereInput
    data: XOR<EnrollmentUpdateManyMutationInput, EnrollmentUncheckedUpdateManyWithoutStudentInput>
  }

  export type EnrollmentScalarWhereInput = {
    AND?: EnrollmentScalarWhereInput | EnrollmentScalarWhereInput[]
    OR?: EnrollmentScalarWhereInput[]
    NOT?: EnrollmentScalarWhereInput | EnrollmentScalarWhereInput[]
    id?: StringFilter<"Enrollment"> | string
    studentId?: StringFilter<"Enrollment"> | string
    courseId?: StringFilter<"Enrollment"> | string
    enrolledAt?: DateTimeFilter<"Enrollment"> | Date | string
  }

  export type InvitationCodeUpsertWithWhereUniqueWithoutUsedByInput = {
    where: InvitationCodeWhereUniqueInput
    update: XOR<InvitationCodeUpdateWithoutUsedByInput, InvitationCodeUncheckedUpdateWithoutUsedByInput>
    create: XOR<InvitationCodeCreateWithoutUsedByInput, InvitationCodeUncheckedCreateWithoutUsedByInput>
  }

  export type InvitationCodeUpdateWithWhereUniqueWithoutUsedByInput = {
    where: InvitationCodeWhereUniqueInput
    data: XOR<InvitationCodeUpdateWithoutUsedByInput, InvitationCodeUncheckedUpdateWithoutUsedByInput>
  }

  export type InvitationCodeUpdateManyWithWhereWithoutUsedByInput = {
    where: InvitationCodeScalarWhereInput
    data: XOR<InvitationCodeUpdateManyMutationInput, InvitationCodeUncheckedUpdateManyWithoutUsedByInput>
  }

  export type InvitationCodeScalarWhereInput = {
    AND?: InvitationCodeScalarWhereInput | InvitationCodeScalarWhereInput[]
    OR?: InvitationCodeScalarWhereInput[]
    NOT?: InvitationCodeScalarWhereInput | InvitationCodeScalarWhereInput[]
    id?: StringFilter<"InvitationCode"> | string
    code?: StringFilter<"InvitationCode"> | string
    courseId?: StringFilter<"InvitationCode"> | string
    createdAt?: DateTimeFilter<"InvitationCode"> | Date | string
    expiresAt?: DateTimeFilter<"InvitationCode"> | Date | string
    isUsed?: BoolFilter<"InvitationCode"> | boolean
    usedAt?: DateTimeNullableFilter<"InvitationCode"> | Date | string | null
    usedById?: StringNullableFilter<"InvitationCode"> | string | null
  }

  export type UserCreateWithoutCoursesInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
    teacherRubrics?: RubricCreateNestedManyWithoutTeacherInput
    submissions?: SubmissionCreateNestedManyWithoutStudentInput
    enrollments?: EnrollmentCreateNestedManyWithoutStudentInput
    usedInvitations?: InvitationCodeCreateNestedManyWithoutUsedByInput
  }

  export type UserUncheckedCreateWithoutCoursesInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricUncheckedCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
    teacherRubrics?: RubricUncheckedCreateNestedManyWithoutTeacherInput
    submissions?: SubmissionUncheckedCreateNestedManyWithoutStudentInput
    enrollments?: EnrollmentUncheckedCreateNestedManyWithoutStudentInput
    usedInvitations?: InvitationCodeUncheckedCreateNestedManyWithoutUsedByInput
  }

  export type UserCreateOrConnectWithoutCoursesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutCoursesInput, UserUncheckedCreateWithoutCoursesInput>
  }

  export type AssignmentAreaCreateWithoutCourseInput = {
    id?: string
    name: string
    description?: string | null
    dueDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    rubric: RubricCreateNestedOneWithoutAssignmentAreasInput
    submissions?: SubmissionCreateNestedManyWithoutAssignmentAreaInput
  }

  export type AssignmentAreaUncheckedCreateWithoutCourseInput = {
    id?: string
    name: string
    description?: string | null
    rubricId: string
    dueDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    submissions?: SubmissionUncheckedCreateNestedManyWithoutAssignmentAreaInput
  }

  export type AssignmentAreaCreateOrConnectWithoutCourseInput = {
    where: AssignmentAreaWhereUniqueInput
    create: XOR<AssignmentAreaCreateWithoutCourseInput, AssignmentAreaUncheckedCreateWithoutCourseInput>
  }

  export type AssignmentAreaCreateManyCourseInputEnvelope = {
    data: AssignmentAreaCreateManyCourseInput | AssignmentAreaCreateManyCourseInput[]
    skipDuplicates?: boolean
  }

  export type EnrollmentCreateWithoutCourseInput = {
    id?: string
    enrolledAt?: Date | string
    student: UserCreateNestedOneWithoutEnrollmentsInput
  }

  export type EnrollmentUncheckedCreateWithoutCourseInput = {
    id?: string
    studentId: string
    enrolledAt?: Date | string
  }

  export type EnrollmentCreateOrConnectWithoutCourseInput = {
    where: EnrollmentWhereUniqueInput
    create: XOR<EnrollmentCreateWithoutCourseInput, EnrollmentUncheckedCreateWithoutCourseInput>
  }

  export type EnrollmentCreateManyCourseInputEnvelope = {
    data: EnrollmentCreateManyCourseInput | EnrollmentCreateManyCourseInput[]
    skipDuplicates?: boolean
  }

  export type InvitationCodeCreateWithoutCourseInput = {
    id?: string
    code: string
    createdAt?: Date | string
    expiresAt: Date | string
    isUsed?: boolean
    usedAt?: Date | string | null
    usedBy?: UserCreateNestedOneWithoutUsedInvitationsInput
  }

  export type InvitationCodeUncheckedCreateWithoutCourseInput = {
    id?: string
    code: string
    createdAt?: Date | string
    expiresAt: Date | string
    isUsed?: boolean
    usedAt?: Date | string | null
    usedById?: string | null
  }

  export type InvitationCodeCreateOrConnectWithoutCourseInput = {
    where: InvitationCodeWhereUniqueInput
    create: XOR<InvitationCodeCreateWithoutCourseInput, InvitationCodeUncheckedCreateWithoutCourseInput>
  }

  export type InvitationCodeCreateManyCourseInputEnvelope = {
    data: InvitationCodeCreateManyCourseInput | InvitationCodeCreateManyCourseInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutCoursesInput = {
    update: XOR<UserUpdateWithoutCoursesInput, UserUncheckedUpdateWithoutCoursesInput>
    create: XOR<UserCreateWithoutCoursesInput, UserUncheckedCreateWithoutCoursesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutCoursesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutCoursesInput, UserUncheckedUpdateWithoutCoursesInput>
  }

  export type UserUpdateWithoutCoursesInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
    teacherRubrics?: RubricUpdateManyWithoutTeacherNestedInput
    submissions?: SubmissionUpdateManyWithoutStudentNestedInput
    enrollments?: EnrollmentUpdateManyWithoutStudentNestedInput
    usedInvitations?: InvitationCodeUpdateManyWithoutUsedByNestedInput
  }

  export type UserUncheckedUpdateWithoutCoursesInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUncheckedUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
    teacherRubrics?: RubricUncheckedUpdateManyWithoutTeacherNestedInput
    submissions?: SubmissionUncheckedUpdateManyWithoutStudentNestedInput
    enrollments?: EnrollmentUncheckedUpdateManyWithoutStudentNestedInput
    usedInvitations?: InvitationCodeUncheckedUpdateManyWithoutUsedByNestedInput
  }

  export type AssignmentAreaUpsertWithWhereUniqueWithoutCourseInput = {
    where: AssignmentAreaWhereUniqueInput
    update: XOR<AssignmentAreaUpdateWithoutCourseInput, AssignmentAreaUncheckedUpdateWithoutCourseInput>
    create: XOR<AssignmentAreaCreateWithoutCourseInput, AssignmentAreaUncheckedCreateWithoutCourseInput>
  }

  export type AssignmentAreaUpdateWithWhereUniqueWithoutCourseInput = {
    where: AssignmentAreaWhereUniqueInput
    data: XOR<AssignmentAreaUpdateWithoutCourseInput, AssignmentAreaUncheckedUpdateWithoutCourseInput>
  }

  export type AssignmentAreaUpdateManyWithWhereWithoutCourseInput = {
    where: AssignmentAreaScalarWhereInput
    data: XOR<AssignmentAreaUpdateManyMutationInput, AssignmentAreaUncheckedUpdateManyWithoutCourseInput>
  }

  export type AssignmentAreaScalarWhereInput = {
    AND?: AssignmentAreaScalarWhereInput | AssignmentAreaScalarWhereInput[]
    OR?: AssignmentAreaScalarWhereInput[]
    NOT?: AssignmentAreaScalarWhereInput | AssignmentAreaScalarWhereInput[]
    id?: StringFilter<"AssignmentArea"> | string
    name?: StringFilter<"AssignmentArea"> | string
    description?: StringNullableFilter<"AssignmentArea"> | string | null
    courseId?: StringFilter<"AssignmentArea"> | string
    rubricId?: StringFilter<"AssignmentArea"> | string
    dueDate?: DateTimeNullableFilter<"AssignmentArea"> | Date | string | null
    createdAt?: DateTimeFilter<"AssignmentArea"> | Date | string
    updatedAt?: DateTimeFilter<"AssignmentArea"> | Date | string
  }

  export type EnrollmentUpsertWithWhereUniqueWithoutCourseInput = {
    where: EnrollmentWhereUniqueInput
    update: XOR<EnrollmentUpdateWithoutCourseInput, EnrollmentUncheckedUpdateWithoutCourseInput>
    create: XOR<EnrollmentCreateWithoutCourseInput, EnrollmentUncheckedCreateWithoutCourseInput>
  }

  export type EnrollmentUpdateWithWhereUniqueWithoutCourseInput = {
    where: EnrollmentWhereUniqueInput
    data: XOR<EnrollmentUpdateWithoutCourseInput, EnrollmentUncheckedUpdateWithoutCourseInput>
  }

  export type EnrollmentUpdateManyWithWhereWithoutCourseInput = {
    where: EnrollmentScalarWhereInput
    data: XOR<EnrollmentUpdateManyMutationInput, EnrollmentUncheckedUpdateManyWithoutCourseInput>
  }

  export type InvitationCodeUpsertWithWhereUniqueWithoutCourseInput = {
    where: InvitationCodeWhereUniqueInput
    update: XOR<InvitationCodeUpdateWithoutCourseInput, InvitationCodeUncheckedUpdateWithoutCourseInput>
    create: XOR<InvitationCodeCreateWithoutCourseInput, InvitationCodeUncheckedCreateWithoutCourseInput>
  }

  export type InvitationCodeUpdateWithWhereUniqueWithoutCourseInput = {
    where: InvitationCodeWhereUniqueInput
    data: XOR<InvitationCodeUpdateWithoutCourseInput, InvitationCodeUncheckedUpdateWithoutCourseInput>
  }

  export type InvitationCodeUpdateManyWithWhereWithoutCourseInput = {
    where: InvitationCodeScalarWhereInput
    data: XOR<InvitationCodeUpdateManyMutationInput, InvitationCodeUncheckedUpdateManyWithoutCourseInput>
  }

  export type CourseCreateWithoutAssignmentAreasInput = {
    id?: string
    name: string
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    teacher: UserCreateNestedOneWithoutCoursesInput
    enrollments?: EnrollmentCreateNestedManyWithoutCourseInput
    invitationCodes?: InvitationCodeCreateNestedManyWithoutCourseInput
  }

  export type CourseUncheckedCreateWithoutAssignmentAreasInput = {
    id?: string
    name: string
    description?: string | null
    teacherId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    enrollments?: EnrollmentUncheckedCreateNestedManyWithoutCourseInput
    invitationCodes?: InvitationCodeUncheckedCreateNestedManyWithoutCourseInput
  }

  export type CourseCreateOrConnectWithoutAssignmentAreasInput = {
    where: CourseWhereUniqueInput
    create: XOR<CourseCreateWithoutAssignmentAreasInput, CourseUncheckedCreateWithoutAssignmentAreasInput>
  }

  export type RubricCreateWithoutAssignmentAreasInput = {
    id?: string
    name: string
    description: string
    version?: number
    isActive?: boolean
    isTemplate?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutRubricsInput
    teacher?: UserCreateNestedOneWithoutTeacherRubricsInput
    gradingResults?: GradingResultCreateNestedManyWithoutRubricInput
  }

  export type RubricUncheckedCreateWithoutAssignmentAreasInput = {
    id?: string
    userId: string
    teacherId?: string | null
    name: string
    description: string
    version?: number
    isActive?: boolean
    isTemplate?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    gradingResults?: GradingResultUncheckedCreateNestedManyWithoutRubricInput
  }

  export type RubricCreateOrConnectWithoutAssignmentAreasInput = {
    where: RubricWhereUniqueInput
    create: XOR<RubricCreateWithoutAssignmentAreasInput, RubricUncheckedCreateWithoutAssignmentAreasInput>
  }

  export type SubmissionCreateWithoutAssignmentAreaInput = {
    id?: string
    filePath: string
    uploadedAt?: Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: number | null
    teacherFeedback?: string | null
    status?: $Enums.SubmissionStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    student: UserCreateNestedOneWithoutSubmissionsInput
  }

  export type SubmissionUncheckedCreateWithoutAssignmentAreaInput = {
    id?: string
    studentId: string
    filePath: string
    uploadedAt?: Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: number | null
    teacherFeedback?: string | null
    status?: $Enums.SubmissionStatus
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubmissionCreateOrConnectWithoutAssignmentAreaInput = {
    where: SubmissionWhereUniqueInput
    create: XOR<SubmissionCreateWithoutAssignmentAreaInput, SubmissionUncheckedCreateWithoutAssignmentAreaInput>
  }

  export type SubmissionCreateManyAssignmentAreaInputEnvelope = {
    data: SubmissionCreateManyAssignmentAreaInput | SubmissionCreateManyAssignmentAreaInput[]
    skipDuplicates?: boolean
  }

  export type CourseUpsertWithoutAssignmentAreasInput = {
    update: XOR<CourseUpdateWithoutAssignmentAreasInput, CourseUncheckedUpdateWithoutAssignmentAreasInput>
    create: XOR<CourseCreateWithoutAssignmentAreasInput, CourseUncheckedCreateWithoutAssignmentAreasInput>
    where?: CourseWhereInput
  }

  export type CourseUpdateToOneWithWhereWithoutAssignmentAreasInput = {
    where?: CourseWhereInput
    data: XOR<CourseUpdateWithoutAssignmentAreasInput, CourseUncheckedUpdateWithoutAssignmentAreasInput>
  }

  export type CourseUpdateWithoutAssignmentAreasInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    teacher?: UserUpdateOneRequiredWithoutCoursesNestedInput
    enrollments?: EnrollmentUpdateManyWithoutCourseNestedInput
    invitationCodes?: InvitationCodeUpdateManyWithoutCourseNestedInput
  }

  export type CourseUncheckedUpdateWithoutAssignmentAreasInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    teacherId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    enrollments?: EnrollmentUncheckedUpdateManyWithoutCourseNestedInput
    invitationCodes?: InvitationCodeUncheckedUpdateManyWithoutCourseNestedInput
  }

  export type RubricUpsertWithoutAssignmentAreasInput = {
    update: XOR<RubricUpdateWithoutAssignmentAreasInput, RubricUncheckedUpdateWithoutAssignmentAreasInput>
    create: XOR<RubricCreateWithoutAssignmentAreasInput, RubricUncheckedCreateWithoutAssignmentAreasInput>
    where?: RubricWhereInput
  }

  export type RubricUpdateToOneWithWhereWithoutAssignmentAreasInput = {
    where?: RubricWhereInput
    data: XOR<RubricUpdateWithoutAssignmentAreasInput, RubricUncheckedUpdateWithoutAssignmentAreasInput>
  }

  export type RubricUpdateWithoutAssignmentAreasInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isTemplate?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutRubricsNestedInput
    teacher?: UserUpdateOneWithoutTeacherRubricsNestedInput
    gradingResults?: GradingResultUpdateManyWithoutRubricNestedInput
  }

  export type RubricUncheckedUpdateWithoutAssignmentAreasInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    teacherId?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isTemplate?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gradingResults?: GradingResultUncheckedUpdateManyWithoutRubricNestedInput
  }

  export type SubmissionUpsertWithWhereUniqueWithoutAssignmentAreaInput = {
    where: SubmissionWhereUniqueInput
    update: XOR<SubmissionUpdateWithoutAssignmentAreaInput, SubmissionUncheckedUpdateWithoutAssignmentAreaInput>
    create: XOR<SubmissionCreateWithoutAssignmentAreaInput, SubmissionUncheckedCreateWithoutAssignmentAreaInput>
  }

  export type SubmissionUpdateWithWhereUniqueWithoutAssignmentAreaInput = {
    where: SubmissionWhereUniqueInput
    data: XOR<SubmissionUpdateWithoutAssignmentAreaInput, SubmissionUncheckedUpdateWithoutAssignmentAreaInput>
  }

  export type SubmissionUpdateManyWithWhereWithoutAssignmentAreaInput = {
    where: SubmissionScalarWhereInput
    data: XOR<SubmissionUpdateManyMutationInput, SubmissionUncheckedUpdateManyWithoutAssignmentAreaInput>
  }

  export type UserCreateWithoutSubmissionsInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
    courses?: CourseCreateNestedManyWithoutTeacherInput
    teacherRubrics?: RubricCreateNestedManyWithoutTeacherInput
    enrollments?: EnrollmentCreateNestedManyWithoutStudentInput
    usedInvitations?: InvitationCodeCreateNestedManyWithoutUsedByInput
  }

  export type UserUncheckedCreateWithoutSubmissionsInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricUncheckedCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
    courses?: CourseUncheckedCreateNestedManyWithoutTeacherInput
    teacherRubrics?: RubricUncheckedCreateNestedManyWithoutTeacherInput
    enrollments?: EnrollmentUncheckedCreateNestedManyWithoutStudentInput
    usedInvitations?: InvitationCodeUncheckedCreateNestedManyWithoutUsedByInput
  }

  export type UserCreateOrConnectWithoutSubmissionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSubmissionsInput, UserUncheckedCreateWithoutSubmissionsInput>
  }

  export type AssignmentAreaCreateWithoutSubmissionsInput = {
    id?: string
    name: string
    description?: string | null
    dueDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    course: CourseCreateNestedOneWithoutAssignmentAreasInput
    rubric: RubricCreateNestedOneWithoutAssignmentAreasInput
  }

  export type AssignmentAreaUncheckedCreateWithoutSubmissionsInput = {
    id?: string
    name: string
    description?: string | null
    courseId: string
    rubricId: string
    dueDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AssignmentAreaCreateOrConnectWithoutSubmissionsInput = {
    where: AssignmentAreaWhereUniqueInput
    create: XOR<AssignmentAreaCreateWithoutSubmissionsInput, AssignmentAreaUncheckedCreateWithoutSubmissionsInput>
  }

  export type UserUpsertWithoutSubmissionsInput = {
    update: XOR<UserUpdateWithoutSubmissionsInput, UserUncheckedUpdateWithoutSubmissionsInput>
    create: XOR<UserCreateWithoutSubmissionsInput, UserUncheckedCreateWithoutSubmissionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSubmissionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSubmissionsInput, UserUncheckedUpdateWithoutSubmissionsInput>
  }

  export type UserUpdateWithoutSubmissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
    courses?: CourseUpdateManyWithoutTeacherNestedInput
    teacherRubrics?: RubricUpdateManyWithoutTeacherNestedInput
    enrollments?: EnrollmentUpdateManyWithoutStudentNestedInput
    usedInvitations?: InvitationCodeUpdateManyWithoutUsedByNestedInput
  }

  export type UserUncheckedUpdateWithoutSubmissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUncheckedUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
    courses?: CourseUncheckedUpdateManyWithoutTeacherNestedInput
    teacherRubrics?: RubricUncheckedUpdateManyWithoutTeacherNestedInput
    enrollments?: EnrollmentUncheckedUpdateManyWithoutStudentNestedInput
    usedInvitations?: InvitationCodeUncheckedUpdateManyWithoutUsedByNestedInput
  }

  export type AssignmentAreaUpsertWithoutSubmissionsInput = {
    update: XOR<AssignmentAreaUpdateWithoutSubmissionsInput, AssignmentAreaUncheckedUpdateWithoutSubmissionsInput>
    create: XOR<AssignmentAreaCreateWithoutSubmissionsInput, AssignmentAreaUncheckedCreateWithoutSubmissionsInput>
    where?: AssignmentAreaWhereInput
  }

  export type AssignmentAreaUpdateToOneWithWhereWithoutSubmissionsInput = {
    where?: AssignmentAreaWhereInput
    data: XOR<AssignmentAreaUpdateWithoutSubmissionsInput, AssignmentAreaUncheckedUpdateWithoutSubmissionsInput>
  }

  export type AssignmentAreaUpdateWithoutSubmissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    dueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    course?: CourseUpdateOneRequiredWithoutAssignmentAreasNestedInput
    rubric?: RubricUpdateOneRequiredWithoutAssignmentAreasNestedInput
  }

  export type AssignmentAreaUncheckedUpdateWithoutSubmissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    courseId?: StringFieldUpdateOperationsInput | string
    rubricId?: StringFieldUpdateOperationsInput | string
    dueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCreateWithoutRubricsInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    gradingSessions?: GradingSessionCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
    courses?: CourseCreateNestedManyWithoutTeacherInput
    teacherRubrics?: RubricCreateNestedManyWithoutTeacherInput
    submissions?: SubmissionCreateNestedManyWithoutStudentInput
    enrollments?: EnrollmentCreateNestedManyWithoutStudentInput
    usedInvitations?: InvitationCodeCreateNestedManyWithoutUsedByInput
  }

  export type UserUncheckedCreateWithoutRubricsInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    gradingSessions?: GradingSessionUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
    courses?: CourseUncheckedCreateNestedManyWithoutTeacherInput
    teacherRubrics?: RubricUncheckedCreateNestedManyWithoutTeacherInput
    submissions?: SubmissionUncheckedCreateNestedManyWithoutStudentInput
    enrollments?: EnrollmentUncheckedCreateNestedManyWithoutStudentInput
    usedInvitations?: InvitationCodeUncheckedCreateNestedManyWithoutUsedByInput
  }

  export type UserCreateOrConnectWithoutRubricsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutRubricsInput, UserUncheckedCreateWithoutRubricsInput>
  }

  export type UserCreateWithoutTeacherRubricsInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
    courses?: CourseCreateNestedManyWithoutTeacherInput
    submissions?: SubmissionCreateNestedManyWithoutStudentInput
    enrollments?: EnrollmentCreateNestedManyWithoutStudentInput
    usedInvitations?: InvitationCodeCreateNestedManyWithoutUsedByInput
  }

  export type UserUncheckedCreateWithoutTeacherRubricsInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricUncheckedCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
    courses?: CourseUncheckedCreateNestedManyWithoutTeacherInput
    submissions?: SubmissionUncheckedCreateNestedManyWithoutStudentInput
    enrollments?: EnrollmentUncheckedCreateNestedManyWithoutStudentInput
    usedInvitations?: InvitationCodeUncheckedCreateNestedManyWithoutUsedByInput
  }

  export type UserCreateOrConnectWithoutTeacherRubricsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutTeacherRubricsInput, UserUncheckedCreateWithoutTeacherRubricsInput>
  }

  export type GradingResultCreateWithoutRubricInput = {
    id?: string
    status?: $Enums.GradingStatus
    progress?: number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: string | null
    gradingModel?: string | null
    gradingTokens?: number | null
    gradingDuration?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
    gradingSession: GradingSessionCreateNestedOneWithoutGradingResultsInput
    uploadedFile: UploadedFileCreateNestedOneWithoutGradingResultsInput
  }

  export type GradingResultUncheckedCreateWithoutRubricInput = {
    id?: string
    gradingSessionId: string
    uploadedFileId: string
    status?: $Enums.GradingStatus
    progress?: number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: string | null
    gradingModel?: string | null
    gradingTokens?: number | null
    gradingDuration?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
  }

  export type GradingResultCreateOrConnectWithoutRubricInput = {
    where: GradingResultWhereUniqueInput
    create: XOR<GradingResultCreateWithoutRubricInput, GradingResultUncheckedCreateWithoutRubricInput>
  }

  export type GradingResultCreateManyRubricInputEnvelope = {
    data: GradingResultCreateManyRubricInput | GradingResultCreateManyRubricInput[]
    skipDuplicates?: boolean
  }

  export type AssignmentAreaCreateWithoutRubricInput = {
    id?: string
    name: string
    description?: string | null
    dueDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    course: CourseCreateNestedOneWithoutAssignmentAreasInput
    submissions?: SubmissionCreateNestedManyWithoutAssignmentAreaInput
  }

  export type AssignmentAreaUncheckedCreateWithoutRubricInput = {
    id?: string
    name: string
    description?: string | null
    courseId: string
    dueDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    submissions?: SubmissionUncheckedCreateNestedManyWithoutAssignmentAreaInput
  }

  export type AssignmentAreaCreateOrConnectWithoutRubricInput = {
    where: AssignmentAreaWhereUniqueInput
    create: XOR<AssignmentAreaCreateWithoutRubricInput, AssignmentAreaUncheckedCreateWithoutRubricInput>
  }

  export type AssignmentAreaCreateManyRubricInputEnvelope = {
    data: AssignmentAreaCreateManyRubricInput | AssignmentAreaCreateManyRubricInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutRubricsInput = {
    update: XOR<UserUpdateWithoutRubricsInput, UserUncheckedUpdateWithoutRubricsInput>
    create: XOR<UserCreateWithoutRubricsInput, UserUncheckedCreateWithoutRubricsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutRubricsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutRubricsInput, UserUncheckedUpdateWithoutRubricsInput>
  }

  export type UserUpdateWithoutRubricsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gradingSessions?: GradingSessionUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
    courses?: CourseUpdateManyWithoutTeacherNestedInput
    teacherRubrics?: RubricUpdateManyWithoutTeacherNestedInput
    submissions?: SubmissionUpdateManyWithoutStudentNestedInput
    enrollments?: EnrollmentUpdateManyWithoutStudentNestedInput
    usedInvitations?: InvitationCodeUpdateManyWithoutUsedByNestedInput
  }

  export type UserUncheckedUpdateWithoutRubricsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gradingSessions?: GradingSessionUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
    courses?: CourseUncheckedUpdateManyWithoutTeacherNestedInput
    teacherRubrics?: RubricUncheckedUpdateManyWithoutTeacherNestedInput
    submissions?: SubmissionUncheckedUpdateManyWithoutStudentNestedInput
    enrollments?: EnrollmentUncheckedUpdateManyWithoutStudentNestedInput
    usedInvitations?: InvitationCodeUncheckedUpdateManyWithoutUsedByNestedInput
  }

  export type UserUpsertWithoutTeacherRubricsInput = {
    update: XOR<UserUpdateWithoutTeacherRubricsInput, UserUncheckedUpdateWithoutTeacherRubricsInput>
    create: XOR<UserCreateWithoutTeacherRubricsInput, UserUncheckedCreateWithoutTeacherRubricsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutTeacherRubricsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutTeacherRubricsInput, UserUncheckedUpdateWithoutTeacherRubricsInput>
  }

  export type UserUpdateWithoutTeacherRubricsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
    courses?: CourseUpdateManyWithoutTeacherNestedInput
    submissions?: SubmissionUpdateManyWithoutStudentNestedInput
    enrollments?: EnrollmentUpdateManyWithoutStudentNestedInput
    usedInvitations?: InvitationCodeUpdateManyWithoutUsedByNestedInput
  }

  export type UserUncheckedUpdateWithoutTeacherRubricsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUncheckedUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
    courses?: CourseUncheckedUpdateManyWithoutTeacherNestedInput
    submissions?: SubmissionUncheckedUpdateManyWithoutStudentNestedInput
    enrollments?: EnrollmentUncheckedUpdateManyWithoutStudentNestedInput
    usedInvitations?: InvitationCodeUncheckedUpdateManyWithoutUsedByNestedInput
  }

  export type GradingResultUpsertWithWhereUniqueWithoutRubricInput = {
    where: GradingResultWhereUniqueInput
    update: XOR<GradingResultUpdateWithoutRubricInput, GradingResultUncheckedUpdateWithoutRubricInput>
    create: XOR<GradingResultCreateWithoutRubricInput, GradingResultUncheckedCreateWithoutRubricInput>
  }

  export type GradingResultUpdateWithWhereUniqueWithoutRubricInput = {
    where: GradingResultWhereUniqueInput
    data: XOR<GradingResultUpdateWithoutRubricInput, GradingResultUncheckedUpdateWithoutRubricInput>
  }

  export type GradingResultUpdateManyWithWhereWithoutRubricInput = {
    where: GradingResultScalarWhereInput
    data: XOR<GradingResultUpdateManyMutationInput, GradingResultUncheckedUpdateManyWithoutRubricInput>
  }

  export type GradingResultScalarWhereInput = {
    AND?: GradingResultScalarWhereInput | GradingResultScalarWhereInput[]
    OR?: GradingResultScalarWhereInput[]
    NOT?: GradingResultScalarWhereInput | GradingResultScalarWhereInput[]
    id?: StringFilter<"GradingResult"> | string
    gradingSessionId?: StringFilter<"GradingResult"> | string
    uploadedFileId?: StringFilter<"GradingResult"> | string
    rubricId?: StringFilter<"GradingResult"> | string
    status?: EnumGradingStatusFilter<"GradingResult"> | $Enums.GradingStatus
    progress?: IntFilter<"GradingResult"> | number
    result?: JsonNullableFilter<"GradingResult">
    errorMessage?: StringNullableFilter<"GradingResult"> | string | null
    gradingModel?: StringNullableFilter<"GradingResult"> | string | null
    gradingTokens?: IntNullableFilter<"GradingResult"> | number | null
    gradingDuration?: IntNullableFilter<"GradingResult"> | number | null
    createdAt?: DateTimeFilter<"GradingResult"> | Date | string
    updatedAt?: DateTimeFilter<"GradingResult"> | Date | string
    completedAt?: DateTimeNullableFilter<"GradingResult"> | Date | string | null
  }

  export type AssignmentAreaUpsertWithWhereUniqueWithoutRubricInput = {
    where: AssignmentAreaWhereUniqueInput
    update: XOR<AssignmentAreaUpdateWithoutRubricInput, AssignmentAreaUncheckedUpdateWithoutRubricInput>
    create: XOR<AssignmentAreaCreateWithoutRubricInput, AssignmentAreaUncheckedCreateWithoutRubricInput>
  }

  export type AssignmentAreaUpdateWithWhereUniqueWithoutRubricInput = {
    where: AssignmentAreaWhereUniqueInput
    data: XOR<AssignmentAreaUpdateWithoutRubricInput, AssignmentAreaUncheckedUpdateWithoutRubricInput>
  }

  export type AssignmentAreaUpdateManyWithWhereWithoutRubricInput = {
    where: AssignmentAreaScalarWhereInput
    data: XOR<AssignmentAreaUpdateManyMutationInput, AssignmentAreaUncheckedUpdateManyWithoutRubricInput>
  }

  export type UserCreateWithoutGradingSessionsInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
    courses?: CourseCreateNestedManyWithoutTeacherInput
    teacherRubrics?: RubricCreateNestedManyWithoutTeacherInput
    submissions?: SubmissionCreateNestedManyWithoutStudentInput
    enrollments?: EnrollmentCreateNestedManyWithoutStudentInput
    usedInvitations?: InvitationCodeCreateNestedManyWithoutUsedByInput
  }

  export type UserUncheckedCreateWithoutGradingSessionsInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
    courses?: CourseUncheckedCreateNestedManyWithoutTeacherInput
    teacherRubrics?: RubricUncheckedCreateNestedManyWithoutTeacherInput
    submissions?: SubmissionUncheckedCreateNestedManyWithoutStudentInput
    enrollments?: EnrollmentUncheckedCreateNestedManyWithoutStudentInput
    usedInvitations?: InvitationCodeUncheckedCreateNestedManyWithoutUsedByInput
  }

  export type UserCreateOrConnectWithoutGradingSessionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutGradingSessionsInput, UserUncheckedCreateWithoutGradingSessionsInput>
  }

  export type GradingResultCreateWithoutGradingSessionInput = {
    id?: string
    status?: $Enums.GradingStatus
    progress?: number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: string | null
    gradingModel?: string | null
    gradingTokens?: number | null
    gradingDuration?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
    uploadedFile: UploadedFileCreateNestedOneWithoutGradingResultsInput
    rubric: RubricCreateNestedOneWithoutGradingResultsInput
  }

  export type GradingResultUncheckedCreateWithoutGradingSessionInput = {
    id?: string
    uploadedFileId: string
    rubricId: string
    status?: $Enums.GradingStatus
    progress?: number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: string | null
    gradingModel?: string | null
    gradingTokens?: number | null
    gradingDuration?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
  }

  export type GradingResultCreateOrConnectWithoutGradingSessionInput = {
    where: GradingResultWhereUniqueInput
    create: XOR<GradingResultCreateWithoutGradingSessionInput, GradingResultUncheckedCreateWithoutGradingSessionInput>
  }

  export type GradingResultCreateManyGradingSessionInputEnvelope = {
    data: GradingResultCreateManyGradingSessionInput | GradingResultCreateManyGradingSessionInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutGradingSessionsInput = {
    update: XOR<UserUpdateWithoutGradingSessionsInput, UserUncheckedUpdateWithoutGradingSessionsInput>
    create: XOR<UserCreateWithoutGradingSessionsInput, UserUncheckedCreateWithoutGradingSessionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutGradingSessionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutGradingSessionsInput, UserUncheckedUpdateWithoutGradingSessionsInput>
  }

  export type UserUpdateWithoutGradingSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
    courses?: CourseUpdateManyWithoutTeacherNestedInput
    teacherRubrics?: RubricUpdateManyWithoutTeacherNestedInput
    submissions?: SubmissionUpdateManyWithoutStudentNestedInput
    enrollments?: EnrollmentUpdateManyWithoutStudentNestedInput
    usedInvitations?: InvitationCodeUpdateManyWithoutUsedByNestedInput
  }

  export type UserUncheckedUpdateWithoutGradingSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
    courses?: CourseUncheckedUpdateManyWithoutTeacherNestedInput
    teacherRubrics?: RubricUncheckedUpdateManyWithoutTeacherNestedInput
    submissions?: SubmissionUncheckedUpdateManyWithoutStudentNestedInput
    enrollments?: EnrollmentUncheckedUpdateManyWithoutStudentNestedInput
    usedInvitations?: InvitationCodeUncheckedUpdateManyWithoutUsedByNestedInput
  }

  export type GradingResultUpsertWithWhereUniqueWithoutGradingSessionInput = {
    where: GradingResultWhereUniqueInput
    update: XOR<GradingResultUpdateWithoutGradingSessionInput, GradingResultUncheckedUpdateWithoutGradingSessionInput>
    create: XOR<GradingResultCreateWithoutGradingSessionInput, GradingResultUncheckedCreateWithoutGradingSessionInput>
  }

  export type GradingResultUpdateWithWhereUniqueWithoutGradingSessionInput = {
    where: GradingResultWhereUniqueInput
    data: XOR<GradingResultUpdateWithoutGradingSessionInput, GradingResultUncheckedUpdateWithoutGradingSessionInput>
  }

  export type GradingResultUpdateManyWithWhereWithoutGradingSessionInput = {
    where: GradingResultScalarWhereInput
    data: XOR<GradingResultUpdateManyMutationInput, GradingResultUncheckedUpdateManyWithoutGradingSessionInput>
  }

  export type UserCreateWithoutUploadedFilesInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionCreateNestedManyWithoutUserInput
    courses?: CourseCreateNestedManyWithoutTeacherInput
    teacherRubrics?: RubricCreateNestedManyWithoutTeacherInput
    submissions?: SubmissionCreateNestedManyWithoutStudentInput
    enrollments?: EnrollmentCreateNestedManyWithoutStudentInput
    usedInvitations?: InvitationCodeCreateNestedManyWithoutUsedByInput
  }

  export type UserUncheckedCreateWithoutUploadedFilesInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricUncheckedCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionUncheckedCreateNestedManyWithoutUserInput
    courses?: CourseUncheckedCreateNestedManyWithoutTeacherInput
    teacherRubrics?: RubricUncheckedCreateNestedManyWithoutTeacherInput
    submissions?: SubmissionUncheckedCreateNestedManyWithoutStudentInput
    enrollments?: EnrollmentUncheckedCreateNestedManyWithoutStudentInput
    usedInvitations?: InvitationCodeUncheckedCreateNestedManyWithoutUsedByInput
  }

  export type UserCreateOrConnectWithoutUploadedFilesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutUploadedFilesInput, UserUncheckedCreateWithoutUploadedFilesInput>
  }

  export type GradingResultCreateWithoutUploadedFileInput = {
    id?: string
    status?: $Enums.GradingStatus
    progress?: number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: string | null
    gradingModel?: string | null
    gradingTokens?: number | null
    gradingDuration?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
    gradingSession: GradingSessionCreateNestedOneWithoutGradingResultsInput
    rubric: RubricCreateNestedOneWithoutGradingResultsInput
  }

  export type GradingResultUncheckedCreateWithoutUploadedFileInput = {
    id?: string
    gradingSessionId: string
    rubricId: string
    status?: $Enums.GradingStatus
    progress?: number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: string | null
    gradingModel?: string | null
    gradingTokens?: number | null
    gradingDuration?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
  }

  export type GradingResultCreateOrConnectWithoutUploadedFileInput = {
    where: GradingResultWhereUniqueInput
    create: XOR<GradingResultCreateWithoutUploadedFileInput, GradingResultUncheckedCreateWithoutUploadedFileInput>
  }

  export type GradingResultCreateManyUploadedFileInputEnvelope = {
    data: GradingResultCreateManyUploadedFileInput | GradingResultCreateManyUploadedFileInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutUploadedFilesInput = {
    update: XOR<UserUpdateWithoutUploadedFilesInput, UserUncheckedUpdateWithoutUploadedFilesInput>
    create: XOR<UserCreateWithoutUploadedFilesInput, UserUncheckedCreateWithoutUploadedFilesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutUploadedFilesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutUploadedFilesInput, UserUncheckedUpdateWithoutUploadedFilesInput>
  }

  export type UserUpdateWithoutUploadedFilesInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUpdateManyWithoutUserNestedInput
    courses?: CourseUpdateManyWithoutTeacherNestedInput
    teacherRubrics?: RubricUpdateManyWithoutTeacherNestedInput
    submissions?: SubmissionUpdateManyWithoutStudentNestedInput
    enrollments?: EnrollmentUpdateManyWithoutStudentNestedInput
    usedInvitations?: InvitationCodeUpdateManyWithoutUsedByNestedInput
  }

  export type UserUncheckedUpdateWithoutUploadedFilesInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUncheckedUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUncheckedUpdateManyWithoutUserNestedInput
    courses?: CourseUncheckedUpdateManyWithoutTeacherNestedInput
    teacherRubrics?: RubricUncheckedUpdateManyWithoutTeacherNestedInput
    submissions?: SubmissionUncheckedUpdateManyWithoutStudentNestedInput
    enrollments?: EnrollmentUncheckedUpdateManyWithoutStudentNestedInput
    usedInvitations?: InvitationCodeUncheckedUpdateManyWithoutUsedByNestedInput
  }

  export type GradingResultUpsertWithWhereUniqueWithoutUploadedFileInput = {
    where: GradingResultWhereUniqueInput
    update: XOR<GradingResultUpdateWithoutUploadedFileInput, GradingResultUncheckedUpdateWithoutUploadedFileInput>
    create: XOR<GradingResultCreateWithoutUploadedFileInput, GradingResultUncheckedCreateWithoutUploadedFileInput>
  }

  export type GradingResultUpdateWithWhereUniqueWithoutUploadedFileInput = {
    where: GradingResultWhereUniqueInput
    data: XOR<GradingResultUpdateWithoutUploadedFileInput, GradingResultUncheckedUpdateWithoutUploadedFileInput>
  }

  export type GradingResultUpdateManyWithWhereWithoutUploadedFileInput = {
    where: GradingResultScalarWhereInput
    data: XOR<GradingResultUpdateManyMutationInput, GradingResultUncheckedUpdateManyWithoutUploadedFileInput>
  }

  export type GradingSessionCreateWithoutGradingResultsInput = {
    id?: string
    status?: $Enums.GradingSessionStatus
    progress?: number
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutGradingSessionsInput
  }

  export type GradingSessionUncheckedCreateWithoutGradingResultsInput = {
    id?: string
    userId: string
    status?: $Enums.GradingSessionStatus
    progress?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GradingSessionCreateOrConnectWithoutGradingResultsInput = {
    where: GradingSessionWhereUniqueInput
    create: XOR<GradingSessionCreateWithoutGradingResultsInput, GradingSessionUncheckedCreateWithoutGradingResultsInput>
  }

  export type UploadedFileCreateWithoutGradingResultsInput = {
    id?: string
    fileName: string
    originalFileName: string
    fileKey: string
    fileSize: number
    mimeType: string
    parseStatus?: $Enums.FileParseStatus
    parsedContent?: string | null
    parseError?: string | null
    isDeleted?: boolean
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    expiresAt?: Date | string | null
    user: UserCreateNestedOneWithoutUploadedFilesInput
  }

  export type UploadedFileUncheckedCreateWithoutGradingResultsInput = {
    id?: string
    userId: string
    fileName: string
    originalFileName: string
    fileKey: string
    fileSize: number
    mimeType: string
    parseStatus?: $Enums.FileParseStatus
    parsedContent?: string | null
    parseError?: string | null
    isDeleted?: boolean
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    expiresAt?: Date | string | null
  }

  export type UploadedFileCreateOrConnectWithoutGradingResultsInput = {
    where: UploadedFileWhereUniqueInput
    create: XOR<UploadedFileCreateWithoutGradingResultsInput, UploadedFileUncheckedCreateWithoutGradingResultsInput>
  }

  export type RubricCreateWithoutGradingResultsInput = {
    id?: string
    name: string
    description: string
    version?: number
    isActive?: boolean
    isTemplate?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutRubricsInput
    teacher?: UserCreateNestedOneWithoutTeacherRubricsInput
    assignmentAreas?: AssignmentAreaCreateNestedManyWithoutRubricInput
  }

  export type RubricUncheckedCreateWithoutGradingResultsInput = {
    id?: string
    userId: string
    teacherId?: string | null
    name: string
    description: string
    version?: number
    isActive?: boolean
    isTemplate?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    assignmentAreas?: AssignmentAreaUncheckedCreateNestedManyWithoutRubricInput
  }

  export type RubricCreateOrConnectWithoutGradingResultsInput = {
    where: RubricWhereUniqueInput
    create: XOR<RubricCreateWithoutGradingResultsInput, RubricUncheckedCreateWithoutGradingResultsInput>
  }

  export type GradingSessionUpsertWithoutGradingResultsInput = {
    update: XOR<GradingSessionUpdateWithoutGradingResultsInput, GradingSessionUncheckedUpdateWithoutGradingResultsInput>
    create: XOR<GradingSessionCreateWithoutGradingResultsInput, GradingSessionUncheckedCreateWithoutGradingResultsInput>
    where?: GradingSessionWhereInput
  }

  export type GradingSessionUpdateToOneWithWhereWithoutGradingResultsInput = {
    where?: GradingSessionWhereInput
    data: XOR<GradingSessionUpdateWithoutGradingResultsInput, GradingSessionUncheckedUpdateWithoutGradingResultsInput>
  }

  export type GradingSessionUpdateWithoutGradingResultsInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingSessionStatusFieldUpdateOperationsInput | $Enums.GradingSessionStatus
    progress?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutGradingSessionsNestedInput
  }

  export type GradingSessionUncheckedUpdateWithoutGradingResultsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingSessionStatusFieldUpdateOperationsInput | $Enums.GradingSessionStatus
    progress?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UploadedFileUpsertWithoutGradingResultsInput = {
    update: XOR<UploadedFileUpdateWithoutGradingResultsInput, UploadedFileUncheckedUpdateWithoutGradingResultsInput>
    create: XOR<UploadedFileCreateWithoutGradingResultsInput, UploadedFileUncheckedCreateWithoutGradingResultsInput>
    where?: UploadedFileWhereInput
  }

  export type UploadedFileUpdateToOneWithWhereWithoutGradingResultsInput = {
    where?: UploadedFileWhereInput
    data: XOR<UploadedFileUpdateWithoutGradingResultsInput, UploadedFileUncheckedUpdateWithoutGradingResultsInput>
  }

  export type UploadedFileUpdateWithoutGradingResultsInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileName?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    fileKey?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    parseStatus?: EnumFileParseStatusFieldUpdateOperationsInput | $Enums.FileParseStatus
    parsedContent?: NullableStringFieldUpdateOperationsInput | string | null
    parseError?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: BoolFieldUpdateOperationsInput | boolean
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    user?: UserUpdateOneRequiredWithoutUploadedFilesNestedInput
  }

  export type UploadedFileUncheckedUpdateWithoutGradingResultsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    fileName?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    fileKey?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    parseStatus?: EnumFileParseStatusFieldUpdateOperationsInput | $Enums.FileParseStatus
    parsedContent?: NullableStringFieldUpdateOperationsInput | string | null
    parseError?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: BoolFieldUpdateOperationsInput | boolean
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type RubricUpsertWithoutGradingResultsInput = {
    update: XOR<RubricUpdateWithoutGradingResultsInput, RubricUncheckedUpdateWithoutGradingResultsInput>
    create: XOR<RubricCreateWithoutGradingResultsInput, RubricUncheckedCreateWithoutGradingResultsInput>
    where?: RubricWhereInput
  }

  export type RubricUpdateToOneWithWhereWithoutGradingResultsInput = {
    where?: RubricWhereInput
    data: XOR<RubricUpdateWithoutGradingResultsInput, RubricUncheckedUpdateWithoutGradingResultsInput>
  }

  export type RubricUpdateWithoutGradingResultsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isTemplate?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutRubricsNestedInput
    teacher?: UserUpdateOneWithoutTeacherRubricsNestedInput
    assignmentAreas?: AssignmentAreaUpdateManyWithoutRubricNestedInput
  }

  export type RubricUncheckedUpdateWithoutGradingResultsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    teacherId?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isTemplate?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    assignmentAreas?: AssignmentAreaUncheckedUpdateManyWithoutRubricNestedInput
  }

  export type UserCreateWithoutEnrollmentsInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
    courses?: CourseCreateNestedManyWithoutTeacherInput
    teacherRubrics?: RubricCreateNestedManyWithoutTeacherInput
    submissions?: SubmissionCreateNestedManyWithoutStudentInput
    usedInvitations?: InvitationCodeCreateNestedManyWithoutUsedByInput
  }

  export type UserUncheckedCreateWithoutEnrollmentsInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricUncheckedCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
    courses?: CourseUncheckedCreateNestedManyWithoutTeacherInput
    teacherRubrics?: RubricUncheckedCreateNestedManyWithoutTeacherInput
    submissions?: SubmissionUncheckedCreateNestedManyWithoutStudentInput
    usedInvitations?: InvitationCodeUncheckedCreateNestedManyWithoutUsedByInput
  }

  export type UserCreateOrConnectWithoutEnrollmentsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutEnrollmentsInput, UserUncheckedCreateWithoutEnrollmentsInput>
  }

  export type CourseCreateWithoutEnrollmentsInput = {
    id?: string
    name: string
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    teacher: UserCreateNestedOneWithoutCoursesInput
    assignmentAreas?: AssignmentAreaCreateNestedManyWithoutCourseInput
    invitationCodes?: InvitationCodeCreateNestedManyWithoutCourseInput
  }

  export type CourseUncheckedCreateWithoutEnrollmentsInput = {
    id?: string
    name: string
    description?: string | null
    teacherId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    assignmentAreas?: AssignmentAreaUncheckedCreateNestedManyWithoutCourseInput
    invitationCodes?: InvitationCodeUncheckedCreateNestedManyWithoutCourseInput
  }

  export type CourseCreateOrConnectWithoutEnrollmentsInput = {
    where: CourseWhereUniqueInput
    create: XOR<CourseCreateWithoutEnrollmentsInput, CourseUncheckedCreateWithoutEnrollmentsInput>
  }

  export type UserUpsertWithoutEnrollmentsInput = {
    update: XOR<UserUpdateWithoutEnrollmentsInput, UserUncheckedUpdateWithoutEnrollmentsInput>
    create: XOR<UserCreateWithoutEnrollmentsInput, UserUncheckedCreateWithoutEnrollmentsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutEnrollmentsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutEnrollmentsInput, UserUncheckedUpdateWithoutEnrollmentsInput>
  }

  export type UserUpdateWithoutEnrollmentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
    courses?: CourseUpdateManyWithoutTeacherNestedInput
    teacherRubrics?: RubricUpdateManyWithoutTeacherNestedInput
    submissions?: SubmissionUpdateManyWithoutStudentNestedInput
    usedInvitations?: InvitationCodeUpdateManyWithoutUsedByNestedInput
  }

  export type UserUncheckedUpdateWithoutEnrollmentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUncheckedUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
    courses?: CourseUncheckedUpdateManyWithoutTeacherNestedInput
    teacherRubrics?: RubricUncheckedUpdateManyWithoutTeacherNestedInput
    submissions?: SubmissionUncheckedUpdateManyWithoutStudentNestedInput
    usedInvitations?: InvitationCodeUncheckedUpdateManyWithoutUsedByNestedInput
  }

  export type CourseUpsertWithoutEnrollmentsInput = {
    update: XOR<CourseUpdateWithoutEnrollmentsInput, CourseUncheckedUpdateWithoutEnrollmentsInput>
    create: XOR<CourseCreateWithoutEnrollmentsInput, CourseUncheckedCreateWithoutEnrollmentsInput>
    where?: CourseWhereInput
  }

  export type CourseUpdateToOneWithWhereWithoutEnrollmentsInput = {
    where?: CourseWhereInput
    data: XOR<CourseUpdateWithoutEnrollmentsInput, CourseUncheckedUpdateWithoutEnrollmentsInput>
  }

  export type CourseUpdateWithoutEnrollmentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    teacher?: UserUpdateOneRequiredWithoutCoursesNestedInput
    assignmentAreas?: AssignmentAreaUpdateManyWithoutCourseNestedInput
    invitationCodes?: InvitationCodeUpdateManyWithoutCourseNestedInput
  }

  export type CourseUncheckedUpdateWithoutEnrollmentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    teacherId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    assignmentAreas?: AssignmentAreaUncheckedUpdateManyWithoutCourseNestedInput
    invitationCodes?: InvitationCodeUncheckedUpdateManyWithoutCourseNestedInput
  }

  export type CourseCreateWithoutInvitationCodesInput = {
    id?: string
    name: string
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    teacher: UserCreateNestedOneWithoutCoursesInput
    assignmentAreas?: AssignmentAreaCreateNestedManyWithoutCourseInput
    enrollments?: EnrollmentCreateNestedManyWithoutCourseInput
  }

  export type CourseUncheckedCreateWithoutInvitationCodesInput = {
    id?: string
    name: string
    description?: string | null
    teacherId: string
    createdAt?: Date | string
    updatedAt?: Date | string
    assignmentAreas?: AssignmentAreaUncheckedCreateNestedManyWithoutCourseInput
    enrollments?: EnrollmentUncheckedCreateNestedManyWithoutCourseInput
  }

  export type CourseCreateOrConnectWithoutInvitationCodesInput = {
    where: CourseWhereUniqueInput
    create: XOR<CourseCreateWithoutInvitationCodesInput, CourseUncheckedCreateWithoutInvitationCodesInput>
  }

  export type UserCreateWithoutUsedInvitationsInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
    courses?: CourseCreateNestedManyWithoutTeacherInput
    teacherRubrics?: RubricCreateNestedManyWithoutTeacherInput
    submissions?: SubmissionCreateNestedManyWithoutStudentInput
    enrollments?: EnrollmentCreateNestedManyWithoutStudentInput
  }

  export type UserUncheckedCreateWithoutUsedInvitationsInput = {
    id?: string
    email: string
    role?: $Enums.UserRole
    name: string
    picture: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricUncheckedCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
    courses?: CourseUncheckedCreateNestedManyWithoutTeacherInput
    teacherRubrics?: RubricUncheckedCreateNestedManyWithoutTeacherInput
    submissions?: SubmissionUncheckedCreateNestedManyWithoutStudentInput
    enrollments?: EnrollmentUncheckedCreateNestedManyWithoutStudentInput
  }

  export type UserCreateOrConnectWithoutUsedInvitationsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutUsedInvitationsInput, UserUncheckedCreateWithoutUsedInvitationsInput>
  }

  export type CourseUpsertWithoutInvitationCodesInput = {
    update: XOR<CourseUpdateWithoutInvitationCodesInput, CourseUncheckedUpdateWithoutInvitationCodesInput>
    create: XOR<CourseCreateWithoutInvitationCodesInput, CourseUncheckedCreateWithoutInvitationCodesInput>
    where?: CourseWhereInput
  }

  export type CourseUpdateToOneWithWhereWithoutInvitationCodesInput = {
    where?: CourseWhereInput
    data: XOR<CourseUpdateWithoutInvitationCodesInput, CourseUncheckedUpdateWithoutInvitationCodesInput>
  }

  export type CourseUpdateWithoutInvitationCodesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    teacher?: UserUpdateOneRequiredWithoutCoursesNestedInput
    assignmentAreas?: AssignmentAreaUpdateManyWithoutCourseNestedInput
    enrollments?: EnrollmentUpdateManyWithoutCourseNestedInput
  }

  export type CourseUncheckedUpdateWithoutInvitationCodesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    teacherId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    assignmentAreas?: AssignmentAreaUncheckedUpdateManyWithoutCourseNestedInput
    enrollments?: EnrollmentUncheckedUpdateManyWithoutCourseNestedInput
  }

  export type UserUpsertWithoutUsedInvitationsInput = {
    update: XOR<UserUpdateWithoutUsedInvitationsInput, UserUncheckedUpdateWithoutUsedInvitationsInput>
    create: XOR<UserCreateWithoutUsedInvitationsInput, UserUncheckedCreateWithoutUsedInvitationsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutUsedInvitationsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutUsedInvitationsInput, UserUncheckedUpdateWithoutUsedInvitationsInput>
  }

  export type UserUpdateWithoutUsedInvitationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
    courses?: CourseUpdateManyWithoutTeacherNestedInput
    teacherRubrics?: RubricUpdateManyWithoutTeacherNestedInput
    submissions?: SubmissionUpdateManyWithoutStudentNestedInput
    enrollments?: EnrollmentUpdateManyWithoutStudentNestedInput
  }

  export type UserUncheckedUpdateWithoutUsedInvitationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    name?: StringFieldUpdateOperationsInput | string
    picture?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUncheckedUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
    courses?: CourseUncheckedUpdateManyWithoutTeacherNestedInput
    teacherRubrics?: RubricUncheckedUpdateManyWithoutTeacherNestedInput
    submissions?: SubmissionUncheckedUpdateManyWithoutStudentNestedInput
    enrollments?: EnrollmentUncheckedUpdateManyWithoutStudentNestedInput
  }

  export type RubricCreateManyUserInput = {
    id?: string
    teacherId?: string | null
    name: string
    description: string
    version?: number
    isActive?: boolean
    isTemplate?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GradingSessionCreateManyUserInput = {
    id?: string
    status?: $Enums.GradingSessionStatus
    progress?: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UploadedFileCreateManyUserInput = {
    id?: string
    fileName: string
    originalFileName: string
    fileKey: string
    fileSize: number
    mimeType: string
    parseStatus?: $Enums.FileParseStatus
    parsedContent?: string | null
    parseError?: string | null
    isDeleted?: boolean
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    expiresAt?: Date | string | null
  }

  export type CourseCreateManyTeacherInput = {
    id?: string
    name: string
    description?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RubricCreateManyTeacherInput = {
    id?: string
    userId: string
    name: string
    description: string
    version?: number
    isActive?: boolean
    isTemplate?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubmissionCreateManyStudentInput = {
    id?: string
    assignmentAreaId: string
    filePath: string
    uploadedAt?: Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: number | null
    teacherFeedback?: string | null
    status?: $Enums.SubmissionStatus
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type EnrollmentCreateManyStudentInput = {
    id?: string
    courseId: string
    enrolledAt?: Date | string
  }

  export type InvitationCodeCreateManyUsedByInput = {
    id?: string
    code: string
    courseId: string
    createdAt?: Date | string
    expiresAt: Date | string
    isUsed?: boolean
    usedAt?: Date | string | null
  }

  export type RubricUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isTemplate?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    teacher?: UserUpdateOneWithoutTeacherRubricsNestedInput
    gradingResults?: GradingResultUpdateManyWithoutRubricNestedInput
    assignmentAreas?: AssignmentAreaUpdateManyWithoutRubricNestedInput
  }

  export type RubricUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    teacherId?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isTemplate?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gradingResults?: GradingResultUncheckedUpdateManyWithoutRubricNestedInput
    assignmentAreas?: AssignmentAreaUncheckedUpdateManyWithoutRubricNestedInput
  }

  export type RubricUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    teacherId?: NullableStringFieldUpdateOperationsInput | string | null
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isTemplate?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GradingSessionUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingSessionStatusFieldUpdateOperationsInput | $Enums.GradingSessionStatus
    progress?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gradingResults?: GradingResultUpdateManyWithoutGradingSessionNestedInput
  }

  export type GradingSessionUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingSessionStatusFieldUpdateOperationsInput | $Enums.GradingSessionStatus
    progress?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gradingResults?: GradingResultUncheckedUpdateManyWithoutGradingSessionNestedInput
  }

  export type GradingSessionUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingSessionStatusFieldUpdateOperationsInput | $Enums.GradingSessionStatus
    progress?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UploadedFileUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileName?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    fileKey?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    parseStatus?: EnumFileParseStatusFieldUpdateOperationsInput | $Enums.FileParseStatus
    parsedContent?: NullableStringFieldUpdateOperationsInput | string | null
    parseError?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: BoolFieldUpdateOperationsInput | boolean
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    gradingResults?: GradingResultUpdateManyWithoutUploadedFileNestedInput
  }

  export type UploadedFileUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileName?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    fileKey?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    parseStatus?: EnumFileParseStatusFieldUpdateOperationsInput | $Enums.FileParseStatus
    parsedContent?: NullableStringFieldUpdateOperationsInput | string | null
    parseError?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: BoolFieldUpdateOperationsInput | boolean
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    gradingResults?: GradingResultUncheckedUpdateManyWithoutUploadedFileNestedInput
  }

  export type UploadedFileUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileName?: StringFieldUpdateOperationsInput | string
    originalFileName?: StringFieldUpdateOperationsInput | string
    fileKey?: StringFieldUpdateOperationsInput | string
    fileSize?: IntFieldUpdateOperationsInput | number
    mimeType?: StringFieldUpdateOperationsInput | string
    parseStatus?: EnumFileParseStatusFieldUpdateOperationsInput | $Enums.FileParseStatus
    parsedContent?: NullableStringFieldUpdateOperationsInput | string | null
    parseError?: NullableStringFieldUpdateOperationsInput | string | null
    isDeleted?: BoolFieldUpdateOperationsInput | boolean
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type CourseUpdateWithoutTeacherInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    assignmentAreas?: AssignmentAreaUpdateManyWithoutCourseNestedInput
    enrollments?: EnrollmentUpdateManyWithoutCourseNestedInput
    invitationCodes?: InvitationCodeUpdateManyWithoutCourseNestedInput
  }

  export type CourseUncheckedUpdateWithoutTeacherInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    assignmentAreas?: AssignmentAreaUncheckedUpdateManyWithoutCourseNestedInput
    enrollments?: EnrollmentUncheckedUpdateManyWithoutCourseNestedInput
    invitationCodes?: InvitationCodeUncheckedUpdateManyWithoutCourseNestedInput
  }

  export type CourseUncheckedUpdateManyWithoutTeacherInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RubricUpdateWithoutTeacherInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isTemplate?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutRubricsNestedInput
    gradingResults?: GradingResultUpdateManyWithoutRubricNestedInput
    assignmentAreas?: AssignmentAreaUpdateManyWithoutRubricNestedInput
  }

  export type RubricUncheckedUpdateWithoutTeacherInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isTemplate?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gradingResults?: GradingResultUncheckedUpdateManyWithoutRubricNestedInput
    assignmentAreas?: AssignmentAreaUncheckedUpdateManyWithoutRubricNestedInput
  }

  export type RubricUncheckedUpdateManyWithoutTeacherInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isTemplate?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubmissionUpdateWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    filePath?: StringFieldUpdateOperationsInput | string
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: NullableIntFieldUpdateOperationsInput | number | null
    teacherFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    assignmentArea?: AssignmentAreaUpdateOneRequiredWithoutSubmissionsNestedInput
  }

  export type SubmissionUncheckedUpdateWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    assignmentAreaId?: StringFieldUpdateOperationsInput | string
    filePath?: StringFieldUpdateOperationsInput | string
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: NullableIntFieldUpdateOperationsInput | number | null
    teacherFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubmissionUncheckedUpdateManyWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    assignmentAreaId?: StringFieldUpdateOperationsInput | string
    filePath?: StringFieldUpdateOperationsInput | string
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: NullableIntFieldUpdateOperationsInput | number | null
    teacherFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EnrollmentUpdateWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    enrolledAt?: DateTimeFieldUpdateOperationsInput | Date | string
    course?: CourseUpdateOneRequiredWithoutEnrollmentsNestedInput
  }

  export type EnrollmentUncheckedUpdateWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    courseId?: StringFieldUpdateOperationsInput | string
    enrolledAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EnrollmentUncheckedUpdateManyWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    courseId?: StringFieldUpdateOperationsInput | string
    enrolledAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InvitationCodeUpdateWithoutUsedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isUsed?: BoolFieldUpdateOperationsInput | boolean
    usedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    course?: CourseUpdateOneRequiredWithoutInvitationCodesNestedInput
  }

  export type InvitationCodeUncheckedUpdateWithoutUsedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    courseId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isUsed?: BoolFieldUpdateOperationsInput | boolean
    usedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type InvitationCodeUncheckedUpdateManyWithoutUsedByInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    courseId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isUsed?: BoolFieldUpdateOperationsInput | boolean
    usedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type AssignmentAreaCreateManyCourseInput = {
    id?: string
    name: string
    description?: string | null
    rubricId: string
    dueDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type EnrollmentCreateManyCourseInput = {
    id?: string
    studentId: string
    enrolledAt?: Date | string
  }

  export type InvitationCodeCreateManyCourseInput = {
    id?: string
    code: string
    createdAt?: Date | string
    expiresAt: Date | string
    isUsed?: boolean
    usedAt?: Date | string | null
    usedById?: string | null
  }

  export type AssignmentAreaUpdateWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    dueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubric?: RubricUpdateOneRequiredWithoutAssignmentAreasNestedInput
    submissions?: SubmissionUpdateManyWithoutAssignmentAreaNestedInput
  }

  export type AssignmentAreaUncheckedUpdateWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    rubricId?: StringFieldUpdateOperationsInput | string
    dueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    submissions?: SubmissionUncheckedUpdateManyWithoutAssignmentAreaNestedInput
  }

  export type AssignmentAreaUncheckedUpdateManyWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    rubricId?: StringFieldUpdateOperationsInput | string
    dueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EnrollmentUpdateWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    enrolledAt?: DateTimeFieldUpdateOperationsInput | Date | string
    student?: UserUpdateOneRequiredWithoutEnrollmentsNestedInput
  }

  export type EnrollmentUncheckedUpdateWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentId?: StringFieldUpdateOperationsInput | string
    enrolledAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type EnrollmentUncheckedUpdateManyWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentId?: StringFieldUpdateOperationsInput | string
    enrolledAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InvitationCodeUpdateWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isUsed?: BoolFieldUpdateOperationsInput | boolean
    usedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    usedBy?: UserUpdateOneWithoutUsedInvitationsNestedInput
  }

  export type InvitationCodeUncheckedUpdateWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isUsed?: BoolFieldUpdateOperationsInput | boolean
    usedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    usedById?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type InvitationCodeUncheckedUpdateManyWithoutCourseInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    isUsed?: BoolFieldUpdateOperationsInput | boolean
    usedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    usedById?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type SubmissionCreateManyAssignmentAreaInput = {
    id?: string
    studentId: string
    filePath: string
    uploadedAt?: Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: number | null
    teacherFeedback?: string | null
    status?: $Enums.SubmissionStatus
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubmissionUpdateWithoutAssignmentAreaInput = {
    id?: StringFieldUpdateOperationsInput | string
    filePath?: StringFieldUpdateOperationsInput | string
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: NullableIntFieldUpdateOperationsInput | number | null
    teacherFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    student?: UserUpdateOneRequiredWithoutSubmissionsNestedInput
  }

  export type SubmissionUncheckedUpdateWithoutAssignmentAreaInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentId?: StringFieldUpdateOperationsInput | string
    filePath?: StringFieldUpdateOperationsInput | string
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: NullableIntFieldUpdateOperationsInput | number | null
    teacherFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubmissionUncheckedUpdateManyWithoutAssignmentAreaInput = {
    id?: StringFieldUpdateOperationsInput | string
    studentId?: StringFieldUpdateOperationsInput | string
    filePath?: StringFieldUpdateOperationsInput | string
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    aiAnalysisResult?: NullableJsonNullValueInput | InputJsonValue
    finalScore?: NullableIntFieldUpdateOperationsInput | number | null
    teacherFeedback?: NullableStringFieldUpdateOperationsInput | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GradingResultCreateManyRubricInput = {
    id?: string
    gradingSessionId: string
    uploadedFileId: string
    status?: $Enums.GradingStatus
    progress?: number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: string | null
    gradingModel?: string | null
    gradingTokens?: number | null
    gradingDuration?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
  }

  export type AssignmentAreaCreateManyRubricInput = {
    id?: string
    name: string
    description?: string | null
    courseId: string
    dueDate?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GradingResultUpdateWithoutRubricInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingStatusFieldUpdateOperationsInput | $Enums.GradingStatus
    progress?: IntFieldUpdateOperationsInput | number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    gradingModel?: NullableStringFieldUpdateOperationsInput | string | null
    gradingTokens?: NullableIntFieldUpdateOperationsInput | number | null
    gradingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    gradingSession?: GradingSessionUpdateOneRequiredWithoutGradingResultsNestedInput
    uploadedFile?: UploadedFileUpdateOneRequiredWithoutGradingResultsNestedInput
  }

  export type GradingResultUncheckedUpdateWithoutRubricInput = {
    id?: StringFieldUpdateOperationsInput | string
    gradingSessionId?: StringFieldUpdateOperationsInput | string
    uploadedFileId?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingStatusFieldUpdateOperationsInput | $Enums.GradingStatus
    progress?: IntFieldUpdateOperationsInput | number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    gradingModel?: NullableStringFieldUpdateOperationsInput | string | null
    gradingTokens?: NullableIntFieldUpdateOperationsInput | number | null
    gradingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type GradingResultUncheckedUpdateManyWithoutRubricInput = {
    id?: StringFieldUpdateOperationsInput | string
    gradingSessionId?: StringFieldUpdateOperationsInput | string
    uploadedFileId?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingStatusFieldUpdateOperationsInput | $Enums.GradingStatus
    progress?: IntFieldUpdateOperationsInput | number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    gradingModel?: NullableStringFieldUpdateOperationsInput | string | null
    gradingTokens?: NullableIntFieldUpdateOperationsInput | number | null
    gradingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type AssignmentAreaUpdateWithoutRubricInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    dueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    course?: CourseUpdateOneRequiredWithoutAssignmentAreasNestedInput
    submissions?: SubmissionUpdateManyWithoutAssignmentAreaNestedInput
  }

  export type AssignmentAreaUncheckedUpdateWithoutRubricInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    courseId?: StringFieldUpdateOperationsInput | string
    dueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    submissions?: SubmissionUncheckedUpdateManyWithoutAssignmentAreaNestedInput
  }

  export type AssignmentAreaUncheckedUpdateManyWithoutRubricInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    courseId?: StringFieldUpdateOperationsInput | string
    dueDate?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GradingResultCreateManyGradingSessionInput = {
    id?: string
    uploadedFileId: string
    rubricId: string
    status?: $Enums.GradingStatus
    progress?: number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: string | null
    gradingModel?: string | null
    gradingTokens?: number | null
    gradingDuration?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
  }

  export type GradingResultUpdateWithoutGradingSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingStatusFieldUpdateOperationsInput | $Enums.GradingStatus
    progress?: IntFieldUpdateOperationsInput | number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    gradingModel?: NullableStringFieldUpdateOperationsInput | string | null
    gradingTokens?: NullableIntFieldUpdateOperationsInput | number | null
    gradingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    uploadedFile?: UploadedFileUpdateOneRequiredWithoutGradingResultsNestedInput
    rubric?: RubricUpdateOneRequiredWithoutGradingResultsNestedInput
  }

  export type GradingResultUncheckedUpdateWithoutGradingSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    uploadedFileId?: StringFieldUpdateOperationsInput | string
    rubricId?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingStatusFieldUpdateOperationsInput | $Enums.GradingStatus
    progress?: IntFieldUpdateOperationsInput | number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    gradingModel?: NullableStringFieldUpdateOperationsInput | string | null
    gradingTokens?: NullableIntFieldUpdateOperationsInput | number | null
    gradingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type GradingResultUncheckedUpdateManyWithoutGradingSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    uploadedFileId?: StringFieldUpdateOperationsInput | string
    rubricId?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingStatusFieldUpdateOperationsInput | $Enums.GradingStatus
    progress?: IntFieldUpdateOperationsInput | number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    gradingModel?: NullableStringFieldUpdateOperationsInput | string | null
    gradingTokens?: NullableIntFieldUpdateOperationsInput | number | null
    gradingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type GradingResultCreateManyUploadedFileInput = {
    id?: string
    gradingSessionId: string
    rubricId: string
    status?: $Enums.GradingStatus
    progress?: number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: string | null
    gradingModel?: string | null
    gradingTokens?: number | null
    gradingDuration?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    completedAt?: Date | string | null
  }

  export type GradingResultUpdateWithoutUploadedFileInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingStatusFieldUpdateOperationsInput | $Enums.GradingStatus
    progress?: IntFieldUpdateOperationsInput | number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    gradingModel?: NullableStringFieldUpdateOperationsInput | string | null
    gradingTokens?: NullableIntFieldUpdateOperationsInput | number | null
    gradingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    gradingSession?: GradingSessionUpdateOneRequiredWithoutGradingResultsNestedInput
    rubric?: RubricUpdateOneRequiredWithoutGradingResultsNestedInput
  }

  export type GradingResultUncheckedUpdateWithoutUploadedFileInput = {
    id?: StringFieldUpdateOperationsInput | string
    gradingSessionId?: StringFieldUpdateOperationsInput | string
    rubricId?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingStatusFieldUpdateOperationsInput | $Enums.GradingStatus
    progress?: IntFieldUpdateOperationsInput | number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    gradingModel?: NullableStringFieldUpdateOperationsInput | string | null
    gradingTokens?: NullableIntFieldUpdateOperationsInput | number | null
    gradingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type GradingResultUncheckedUpdateManyWithoutUploadedFileInput = {
    id?: StringFieldUpdateOperationsInput | string
    gradingSessionId?: StringFieldUpdateOperationsInput | string
    rubricId?: StringFieldUpdateOperationsInput | string
    status?: EnumGradingStatusFieldUpdateOperationsInput | $Enums.GradingStatus
    progress?: IntFieldUpdateOperationsInput | number
    result?: NullableJsonNullValueInput | InputJsonValue
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    gradingModel?: NullableStringFieldUpdateOperationsInput | string | null
    gradingTokens?: NullableIntFieldUpdateOperationsInput | number | null
    gradingDuration?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }
}
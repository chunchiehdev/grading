
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

}

export type GradingSessionStatus = $Enums.GradingSessionStatus

export const GradingSessionStatus = $Enums.GradingSessionStatus

export type GradingStatus = $Enums.GradingStatus

export const GradingStatus = $Enums.GradingStatus

export type FileParseStatus = $Enums.FileParseStatus

export const FileParseStatus = $Enums.FileParseStatus



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
      "value": "/app/app/generated/prisma/client",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "linux-musl-openssl-3.0.x",
        "native": true
      },
      {
        "fromEnvVar": null,
        "value": "linux-musl-openssl-3.0.x"
      }
    ],
    "previewFeatures": [],
    "sourceFilePath": "/app/prisma/schema.prisma",
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
        "value": "postgresql://grading_admin:password@db:5432/grading_db"
      }
    }
  },
  "inlineSchema": "generator client {\n  provider      = \"prisma-client\"\n  output        = \"../app/generated/prisma/client\"\n  binaryTargets = [\"native\", \"linux-musl-openssl-3.0.x\"]\n}\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\nmodel User {\n  id        String   @id @default(uuid())\n  email     String   @unique\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  // Relations\n  rubrics         Rubric[]\n  gradingSessions GradingSession[]\n  uploadedFiles   UploadedFile[]\n\n  @@map(\"users\")\n}\n\n// 評分標準表 - 支援版本控制\nmodel Rubric {\n  id     String @id @default(uuid())\n  userId String\n  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  name        String  @db.VarChar(255)\n  description String  @db.Text\n  version     Int     @default(1) // 版本號\n  isActive    Boolean @default(true) // 是否為當前版本\n\n  // 評分標準結構 (JSON)\n  criteria Json // [{ id, name, description, maxScore, levels: [{ score, description }] }]\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  // Relations\n  gradingResults GradingResult[]\n\n  @@index([userId, isActive])\n  @@map(\"rubrics\")\n}\n\n// 評分會話 - 一次評分請求可包含多個檔案\nmodel GradingSession {\n  id     String @id @default(uuid())\n  userId String\n  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  status   GradingSessionStatus @default(PENDING)\n  progress Int                  @default(0) // 整體進度 0-100\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  // Relations\n  gradingResults GradingResult[]\n\n  @@index([userId, status])\n  @@map(\"grading_sessions\")\n}\n\n// 上傳的檔案記錄\nmodel UploadedFile {\n  id     String @id @default(uuid())\n  userId String\n  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  fileName         String @db.VarChar(500)\n  originalFileName String @db.VarChar(500)\n  fileKey          String @unique // S3 key\n  fileSize         Int\n  mimeType         String @db.VarChar(100)\n\n  // 檔案處理狀態\n  parseStatus   FileParseStatus @default(PENDING)\n  parsedContent String?         @db.Text // 解析後的文字內容\n  parseError    String? // 解析錯誤訊息\n\n  // 軟刪除標記\n  isDeleted Boolean   @default(false)\n  deletedAt DateTime? // 刪除時間\n\n  createdAt DateTime  @default(now())\n  updatedAt DateTime  @updatedAt\n  expiresAt DateTime? // 檔案過期時間，用於自動清理\n\n  // Relations\n  gradingResults GradingResult[]\n\n  @@index([userId, parseStatus])\n  @@index([userId, isDeleted]) // 用於過濾已刪除檔案\n  @@index([expiresAt]) // 用於清理過期檔案\n  @@map(\"uploaded_files\")\n}\n\n// 評分結果 - 每個檔案對應一個評分標準的結果\nmodel GradingResult {\n  id               String         @id @default(uuid())\n  gradingSessionId String\n  gradingSession   GradingSession @relation(fields: [gradingSessionId], references: [id], onDelete: Cascade)\n\n  uploadedFileId String\n  uploadedFile   UploadedFile @relation(fields: [uploadedFileId], references: [id], onDelete: Cascade)\n\n  rubricId String\n  rubric   Rubric @relation(fields: [rubricId], references: [id], onDelete: Restrict)\n\n  // 評分狀態和結果\n  status   GradingStatus @default(PENDING)\n  progress Int           @default(0) // 此項評分進度 0-100\n\n  // LLM評分結果 (JSON結構)\n  result       Json? // { totalScore, maxScore, breakdown: [{ criteriaId, score, feedback }], overallFeedback }\n  errorMessage String? // 評分失敗時的錯誤訊息\n\n  // 評分元數據\n  gradingModel    String? @db.VarChar(100) // 使用的模型名稱\n  gradingTokens   Int? // 消耗的tokens數量\n  gradingDuration Int? // 評分耗時(毫秒)\n\n  createdAt   DateTime  @default(now())\n  updatedAt   DateTime  @updatedAt\n  completedAt DateTime? // 評分完成時間\n\n  @@index([gradingSessionId, status])\n  @@index([uploadedFileId])\n  @@index([rubricId])\n  @@map(\"grading_results\")\n}\n\n// 評分會話狀態\nenum GradingSessionStatus {\n  PENDING // 等待開始\n  PROCESSING // 評分中\n  COMPLETED // 全部完成\n  FAILED // 失敗\n  CANCELLED // 已取消\n}\n\n// 單項評分狀態\nenum GradingStatus {\n  PENDING // 等待評分\n  PROCESSING // 評分中\n  COMPLETED // 評分完成\n  FAILED // 評分失敗\n  SKIPPED // 跳過(檔案解析失敗等)\n}\n\n// 檔案解析狀態\nenum FileParseStatus {\n  PENDING // 等待解析\n  PROCESSING // 解析中\n  COMPLETED // 解析完成\n  FAILED // 解析失敗\n}\n",
  "inlineSchemaHash": "048f6b6cfb535f06d7deac6672ab3e851faec6b0d4dfb927203982520319cb8a",
  "copyEngine": true,
  "runtimeDataModel": {
    "models": {},
    "enums": {},
    "types": {}
  },
  "dirname": ""
}
config.dirname = __dirname

config.runtimeDataModel = JSON.parse("{\"models\":{\"User\":{\"dbName\":\"users\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"email\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"rubrics\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Rubric\",\"nativeType\":null,\"relationName\":\"RubricToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"gradingSessions\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"GradingSession\",\"nativeType\":null,\"relationName\":\"GradingSessionToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"uploadedFiles\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"UploadedFile\",\"nativeType\":null,\"relationName\":\"UploadedFileToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Rubric\":{\"dbName\":\"rubrics\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"userId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"user\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"nativeType\":null,\"relationName\":\"RubricToUser\",\"relationFromFields\":[\"userId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"255\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"description\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"Text\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"version\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":1,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isActive\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"nativeType\":null,\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"criteria\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"gradingResults\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"GradingResult\",\"nativeType\":null,\"relationName\":\"GradingResultToRubric\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"GradingSession\":{\"dbName\":\"grading_sessions\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"userId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"user\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"nativeType\":null,\"relationName\":\"GradingSessionToUser\",\"relationFromFields\":[\"userId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"GradingSessionStatus\",\"nativeType\":null,\"default\":\"PENDING\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"progress\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"gradingResults\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"GradingResult\",\"nativeType\":null,\"relationName\":\"GradingResultToGradingSession\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"UploadedFile\":{\"dbName\":\"uploaded_files\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"userId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"user\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"nativeType\":null,\"relationName\":\"UploadedFileToUser\",\"relationFromFields\":[\"userId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fileName\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"500\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"originalFileName\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"500\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fileKey\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"fileSize\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"mimeType\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"100\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"parseStatus\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"FileParseStatus\",\"nativeType\":null,\"default\":\"PENDING\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"parsedContent\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"Text\",[]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"parseError\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isDeleted\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"nativeType\":null,\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"deletedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"expiresAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"gradingResults\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"GradingResult\",\"nativeType\":null,\"relationName\":\"GradingResultToUploadedFile\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"GradingResult\":{\"dbName\":\"grading_results\",\"schema\":null,\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"nativeType\":null,\"default\":{\"name\":\"uuid\",\"args\":[4]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"gradingSessionId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"gradingSession\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"GradingSession\",\"nativeType\":null,\"relationName\":\"GradingResultToGradingSession\",\"relationFromFields\":[\"gradingSessionId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"uploadedFileId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"uploadedFile\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"UploadedFile\",\"nativeType\":null,\"relationName\":\"GradingResultToUploadedFile\",\"relationFromFields\":[\"uploadedFileId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rubricId\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rubric\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Rubric\",\"nativeType\":null,\"relationName\":\"GradingResultToRubric\",\"relationFromFields\":[\"rubricId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Restrict\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"GradingStatus\",\"nativeType\":null,\"default\":\"PENDING\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"progress\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"nativeType\":null,\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"result\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Json\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"errorMessage\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"gradingModel\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"nativeType\":[\"VarChar\",[\"100\"]],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"gradingTokens\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"gradingDuration\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"nativeType\":null,\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"completedAt\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"nativeType\":null,\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false}},\"enums\":{\"GradingSessionStatus\":{\"values\":[{\"name\":\"PENDING\",\"dbName\":null},{\"name\":\"PROCESSING\",\"dbName\":null},{\"name\":\"COMPLETED\",\"dbName\":null},{\"name\":\"FAILED\",\"dbName\":null},{\"name\":\"CANCELLED\",\"dbName\":null}],\"dbName\":null},\"GradingStatus\":{\"values\":[{\"name\":\"PENDING\",\"dbName\":null},{\"name\":\"PROCESSING\",\"dbName\":null},{\"name\":\"COMPLETED\",\"dbName\":null},{\"name\":\"FAILED\",\"dbName\":null},{\"name\":\"SKIPPED\",\"dbName\":null}],\"dbName\":null},\"FileParseStatus\":{\"values\":[{\"name\":\"PENDING\",\"dbName\":null},{\"name\":\"PROCESSING\",\"dbName\":null},{\"name\":\"COMPLETED\",\"dbName\":null},{\"name\":\"FAILED\",\"dbName\":null}],\"dbName\":null}},\"types\":{}}")
config.engineWasm = undefined
config.compilerWasm = undefined



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
    Rubric: 'Rubric',
    GradingSession: 'GradingSession',
    UploadedFile: 'UploadedFile',
    GradingResult: 'GradingResult'
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
      modelProps: "user" | "rubric" | "gradingSession" | "uploadedFile" | "gradingResult"
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
    rubric?: RubricOmit
    gradingSession?: GradingSessionOmit
    uploadedFile?: UploadedFileOmit
    gradingResult?: GradingResultOmit
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
  }

  export type UserCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    rubrics?: boolean | UserCountOutputTypeCountRubricsArgs
    gradingSessions?: boolean | UserCountOutputTypeCountGradingSessionsArgs
    uploadedFiles?: boolean | UserCountOutputTypeCountUploadedFilesArgs
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
   * Count Type RubricCountOutputType
   */

  export type RubricCountOutputType = {
    gradingResults: number
  }

  export type RubricCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    gradingResults?: boolean | RubricCountOutputTypeCountGradingResultsArgs
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
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    email: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    email: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    email?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    email?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    email?: true
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
    createdAt?: boolean
    updatedAt?: boolean
    rubrics?: boolean | User$rubricsArgs<ExtArgs>
    gradingSessions?: boolean | User$gradingSessionsArgs<ExtArgs>
    uploadedFiles?: boolean | User$uploadedFilesArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    email?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "email" | "createdAt" | "updatedAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    rubrics?: boolean | User$rubricsArgs<ExtArgs>
    gradingSessions?: boolean | User$gradingSessionsArgs<ExtArgs>
    uploadedFiles?: boolean | User$uploadedFilesArgs<ExtArgs>
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
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      email: string
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
    name: string | null
    description: string | null
    version: number | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RubricMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    description: string | null
    version: number | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RubricCountAggregateOutputType = {
    id: number
    userId: number
    name: number
    description: number
    version: number
    isActive: number
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
    name?: true
    description?: true
    version?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RubricMaxAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    description?: true
    version?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RubricCountAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    description?: true
    version?: true
    isActive?: true
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
    name: string
    description: string
    version: number
    isActive: boolean
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
    name?: boolean
    description?: boolean
    version?: boolean
    isActive?: boolean
    criteria?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    gradingResults?: boolean | Rubric$gradingResultsArgs<ExtArgs>
    _count?: boolean | RubricCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["rubric"]>

  export type RubricSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    description?: boolean
    version?: boolean
    isActive?: boolean
    criteria?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["rubric"]>

  export type RubricSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    description?: boolean
    version?: boolean
    isActive?: boolean
    criteria?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["rubric"]>

  export type RubricSelectScalar = {
    id?: boolean
    userId?: boolean
    name?: boolean
    description?: boolean
    version?: boolean
    isActive?: boolean
    criteria?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type RubricOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "userId" | "name" | "description" | "version" | "isActive" | "criteria" | "createdAt" | "updatedAt", ExtArgs["result"]["rubric"]>
  export type RubricInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    gradingResults?: boolean | Rubric$gradingResultsArgs<ExtArgs>
    _count?: boolean | RubricCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type RubricIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type RubricIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $RubricPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Rubric"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      gradingResults: Prisma.$GradingResultPayload<ExtArgs>[]
    }
    scalars: runtime.Types.Extensions.GetPayloadResult<{
      id: string
      userId: string
      name: string
      description: string
      version: number
      isActive: boolean
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
    gradingResults<T extends Rubric$gradingResultsArgs<ExtArgs> = {}>(args?: Subset<T, Rubric$gradingResultsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$GradingResultPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
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
    readonly name: FieldRef<"Rubric", 'String'>
    readonly description: FieldRef<"Rubric", 'String'>
    readonly version: FieldRef<"Rubric", 'Int'>
    readonly isActive: FieldRef<"Rubric", 'Boolean'>
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
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  } as const

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const RubricScalarFieldEnum = {
    id: 'id',
    userId: 'userId',
    name: 'name',
    description: 'description',
    version: 'version',
    isActive: 'isActive',
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


  export const SortOrder = {
    asc: 'asc',
    desc: 'desc'
  } as const

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput = {
    JsonNull: JsonNull
  } as const

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const NullableJsonNullValueInput = {
    DbNull: DbNull,
    JsonNull: JsonNull
  } as const

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode = {
    default: 'default',
    insensitive: 'insensitive'
  } as const

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const JsonNullValueFilter = {
    DbNull: DbNull,
    JsonNull: JsonNull,
    AnyNull: AnyNull
  } as const

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  export const NullsOrder = {
    first: 'first',
    last: 'last'
  } as const

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


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
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


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
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    rubrics?: RubricListRelationFilter
    gradingSessions?: GradingSessionListRelationFilter
    uploadedFiles?: UploadedFileListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    rubrics?: RubricOrderByRelationAggregateInput
    gradingSessions?: GradingSessionOrderByRelationAggregateInput
    uploadedFiles?: UploadedFileOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    rubrics?: RubricListRelationFilter
    gradingSessions?: GradingSessionListRelationFilter
    uploadedFiles?: UploadedFileListRelationFilter
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
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
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type RubricWhereInput = {
    AND?: RubricWhereInput | RubricWhereInput[]
    OR?: RubricWhereInput[]
    NOT?: RubricWhereInput | RubricWhereInput[]
    id?: StringFilter<"Rubric"> | string
    userId?: StringFilter<"Rubric"> | string
    name?: StringFilter<"Rubric"> | string
    description?: StringFilter<"Rubric"> | string
    version?: IntFilter<"Rubric"> | number
    isActive?: BoolFilter<"Rubric"> | boolean
    criteria?: JsonFilter<"Rubric">
    createdAt?: DateTimeFilter<"Rubric"> | Date | string
    updatedAt?: DateTimeFilter<"Rubric"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    gradingResults?: GradingResultListRelationFilter
  }

  export type RubricOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    version?: SortOrder
    isActive?: SortOrder
    criteria?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    user?: UserOrderByWithRelationInput
    gradingResults?: GradingResultOrderByRelationAggregateInput
  }

  export type RubricWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RubricWhereInput | RubricWhereInput[]
    OR?: RubricWhereInput[]
    NOT?: RubricWhereInput | RubricWhereInput[]
    userId?: StringFilter<"Rubric"> | string
    name?: StringFilter<"Rubric"> | string
    description?: StringFilter<"Rubric"> | string
    version?: IntFilter<"Rubric"> | number
    isActive?: BoolFilter<"Rubric"> | boolean
    criteria?: JsonFilter<"Rubric">
    createdAt?: DateTimeFilter<"Rubric"> | Date | string
    updatedAt?: DateTimeFilter<"Rubric"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    gradingResults?: GradingResultListRelationFilter
  }, "id">

  export type RubricOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    version?: SortOrder
    isActive?: SortOrder
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
    name?: StringWithAggregatesFilter<"Rubric"> | string
    description?: StringWithAggregatesFilter<"Rubric"> | string
    version?: IntWithAggregatesFilter<"Rubric"> | number
    isActive?: BoolWithAggregatesFilter<"Rubric"> | boolean
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

  export type UserCreateInput = {
    id?: string
    email: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    email: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricUncheckedCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUncheckedUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    email: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RubricCreateInput = {
    id?: string
    name: string
    description: string
    version?: number
    isActive?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutRubricsInput
    gradingResults?: GradingResultCreateNestedManyWithoutRubricInput
  }

  export type RubricUncheckedCreateInput = {
    id?: string
    userId: string
    name: string
    description: string
    version?: number
    isActive?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    gradingResults?: GradingResultUncheckedCreateNestedManyWithoutRubricInput
  }

  export type RubricUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutRubricsNestedInput
    gradingResults?: GradingResultUpdateManyWithoutRubricNestedInput
  }

  export type RubricUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gradingResults?: GradingResultUncheckedUpdateManyWithoutRubricNestedInput
  }

  export type RubricCreateManyInput = {
    id?: string
    userId: string
    name: string
    description: string
    version?: number
    isActive?: boolean
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
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RubricUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
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

  export type RubricOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type GradingSessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UploadedFileOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
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

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
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
    name?: SortOrder
    description?: SortOrder
    version?: SortOrder
    isActive?: SortOrder
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
    name?: SortOrder
    description?: SortOrder
    version?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RubricMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    version?: SortOrder
    isActive?: SortOrder
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

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
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

  export type EnumGradingStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.GradingStatus | EnumGradingStatusFieldRefInput<$PrismaModel>
    in?: $Enums.GradingStatus[] | ListEnumGradingStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.GradingStatus[] | ListEnumGradingStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumGradingStatusFilter<$PrismaModel> | $Enums.GradingStatus
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

  export type GradingSessionScalarRelationFilter = {
    is?: GradingSessionWhereInput
    isNot?: GradingSessionWhereInput
  }

  export type UploadedFileScalarRelationFilter = {
    is?: UploadedFileWhereInput
    isNot?: UploadedFileWhereInput
  }

  export type RubricScalarRelationFilter = {
    is?: RubricWhereInput
    isNot?: RubricWhereInput
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

  export type StringFieldUpdateOperationsInput = {
    set?: string
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

  export type UserCreateNestedOneWithoutRubricsInput = {
    create?: XOR<UserCreateWithoutRubricsInput, UserUncheckedCreateWithoutRubricsInput>
    connectOrCreate?: UserCreateOrConnectWithoutRubricsInput
    connect?: UserWhereUniqueInput
  }

  export type GradingResultCreateNestedManyWithoutRubricInput = {
    create?: XOR<GradingResultCreateWithoutRubricInput, GradingResultUncheckedCreateWithoutRubricInput> | GradingResultCreateWithoutRubricInput[] | GradingResultUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: GradingResultCreateOrConnectWithoutRubricInput | GradingResultCreateOrConnectWithoutRubricInput[]
    createMany?: GradingResultCreateManyRubricInputEnvelope
    connect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
  }

  export type GradingResultUncheckedCreateNestedManyWithoutRubricInput = {
    create?: XOR<GradingResultCreateWithoutRubricInput, GradingResultUncheckedCreateWithoutRubricInput> | GradingResultCreateWithoutRubricInput[] | GradingResultUncheckedCreateWithoutRubricInput[]
    connectOrCreate?: GradingResultCreateOrConnectWithoutRubricInput | GradingResultCreateOrConnectWithoutRubricInput[]
    createMany?: GradingResultCreateManyRubricInputEnvelope
    connect?: GradingResultWhereUniqueInput | GradingResultWhereUniqueInput[]
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

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
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

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
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

  export type NestedEnumFileParseStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.FileParseStatus | EnumFileParseStatusFieldRefInput<$PrismaModel>
    in?: $Enums.FileParseStatus[] | ListEnumFileParseStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.FileParseStatus[] | ListEnumFileParseStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumFileParseStatusWithAggregatesFilter<$PrismaModel> | $Enums.FileParseStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumFileParseStatusFilter<$PrismaModel>
    _max?: NestedEnumFileParseStatusFilter<$PrismaModel>
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

  export type RubricCreateWithoutUserInput = {
    id?: string
    name: string
    description: string
    version?: number
    isActive?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    gradingResults?: GradingResultCreateNestedManyWithoutRubricInput
  }

  export type RubricUncheckedCreateWithoutUserInput = {
    id?: string
    name: string
    description: string
    version?: number
    isActive?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    gradingResults?: GradingResultUncheckedCreateNestedManyWithoutRubricInput
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
    name?: StringFilter<"Rubric"> | string
    description?: StringFilter<"Rubric"> | string
    version?: IntFilter<"Rubric"> | number
    isActive?: BoolFilter<"Rubric"> | boolean
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

  export type UserCreateWithoutRubricsInput = {
    id?: string
    email: string
    createdAt?: Date | string
    updatedAt?: Date | string
    gradingSessions?: GradingSessionCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutRubricsInput = {
    id?: string
    email: string
    createdAt?: Date | string
    updatedAt?: Date | string
    gradingSessions?: GradingSessionUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutRubricsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutRubricsInput, UserUncheckedCreateWithoutRubricsInput>
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
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gradingSessions?: GradingSessionUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutRubricsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gradingSessions?: GradingSessionUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
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

  export type UserCreateWithoutGradingSessionsInput = {
    id?: string
    email: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutGradingSessionsInput = {
    id?: string
    email: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricUncheckedCreateNestedManyWithoutUserInput
    uploadedFiles?: UploadedFileUncheckedCreateNestedManyWithoutUserInput
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
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutGradingSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUncheckedUpdateManyWithoutUserNestedInput
    uploadedFiles?: UploadedFileUncheckedUpdateManyWithoutUserNestedInput
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
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutUploadedFilesInput = {
    id?: string
    email: string
    createdAt?: Date | string
    updatedAt?: Date | string
    rubrics?: RubricUncheckedCreateNestedManyWithoutUserInput
    gradingSessions?: GradingSessionUncheckedCreateNestedManyWithoutUserInput
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
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutUploadedFilesInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    rubrics?: RubricUncheckedUpdateManyWithoutUserNestedInput
    gradingSessions?: GradingSessionUncheckedUpdateManyWithoutUserNestedInput
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
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    user: UserCreateNestedOneWithoutRubricsInput
  }

  export type RubricUncheckedCreateWithoutGradingResultsInput = {
    id?: string
    userId: string
    name: string
    description: string
    version?: number
    isActive?: boolean
    criteria: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
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
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutRubricsNestedInput
  }

  export type RubricUncheckedUpdateWithoutGradingResultsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RubricCreateManyUserInput = {
    id?: string
    name: string
    description: string
    version?: number
    isActive?: boolean
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

  export type RubricUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gradingResults?: GradingResultUpdateManyWithoutRubricNestedInput
  }

  export type RubricUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    criteria?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gradingResults?: GradingResultUncheckedUpdateManyWithoutRubricNestedInput
  }

  export type RubricUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    version?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
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
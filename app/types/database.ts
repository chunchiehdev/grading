// 統一的資料庫類型導出
// 所有地方都應該從這裡import，而不是直接從generated client導入

// PrismaClient needs to be exported as a value for constructor usage
export {
  PrismaClient,
  GradingSessionStatus,
  GradingStatus,
  FileParseStatus,
  UserRole,
  SubmissionStatus,
} from '../generated/prisma/client';

export type {
  User,
  Rubric,
  Course,
  InvitationCode,
  UploadedFile,
  GradingSession,
  GradingResult,
  Prisma,
} from '../generated/prisma/client';

// 重新導出db實例
export { db } from '../lib/db.server'; 
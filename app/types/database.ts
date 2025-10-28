// Unified database type exports  
// All imports should come from here instead of directly from the generated client
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

export { db } from '../lib/db.server';

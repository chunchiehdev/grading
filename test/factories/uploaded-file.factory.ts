import { db, FileParseStatus } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateUploadedFileOptions {
  userId: string;
  fileName?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
  parseStatus?: FileParseStatus;
  parsedContent?: string | null;
  parseError?: string | null;
}

export class UploadedFileFactory {
  static async create(options: CreateUploadedFileOptions) {
    const file = await db.uploadedFile.create({
      data: {
        id: uuidv4(),
        userId: options.userId,
        fileName: options.fileName || `test-file-${Math.random().toString(36).substr(2, 8)}.pdf`,
        originalFileName: options.originalFileName || 'test-document.pdf',
        fileKey: `uploads/${uuidv4()}-${options.originalFileName || 'test-document.pdf'}`,
        fileSize: options.fileSize || 1024 * 100, // 100KB default
        mimeType: options.mimeType || 'application/pdf',
        parseStatus: options.parseStatus || FileParseStatus.COMPLETED,
        parsedContent: options.parsedContent !== undefined 
          ? options.parsedContent 
          : 'This is a sample PDF content for testing purposes. The document contains academic content that can be graded according to the rubric criteria.',
        parseError: options.parseError || null,
      }
    });
    
    console.log(`📄 Created uploaded file: ${file.originalFileName} (${file.parseStatus})`);
    return file;
  }
  
  static async createPdf(userId: string, options: Omit<CreateUploadedFileOptions, 'userId' | 'mimeType'> = {}) {
    return this.create({
      ...options,
      userId,
      mimeType: 'application/pdf',
      originalFileName: options.originalFileName || 'assignment.pdf'
    });
  }
  
  static async createWord(userId: string, options: Omit<CreateUploadedFileOptions, 'userId' | 'mimeType'> = {}) {
    return this.create({
      ...options,
      userId,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      originalFileName: options.originalFileName || 'assignment.docx'
    });
  }
  
  static async createWithParseStatus(userId: string, parseStatus: FileParseStatus, options: Omit<CreateUploadedFileOptions, 'userId' | 'parseStatus'> = {}) {
    const parsedContent = parseStatus === FileParseStatus.COMPLETED 
      ? 'Successfully parsed content for testing.'
      : null;
      
    const parseError = parseStatus === FileParseStatus.FAILED
      ? 'Failed to parse file: corrupted or unsupported format'
      : null;
    
    return this.create({
      ...options,
      userId,
      parseStatus,
      parsedContent,
      parseError
    });
  }
}
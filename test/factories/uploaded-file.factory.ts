import { PrismaClient, UploadedFile, FileParseStatus } from '@/types/database';

export interface CreateUploadedFileData {
  userId: string;
  fileName?: string;
  originalFileName?: string;
  fileKey?: string;
  fileSize?: number;
  mimeType?: string;
  parseStatus?: FileParseStatus;
  parsedContent?: string;
  parseError?: string;
  expiresAt?: Date;
}

export class UploadedFileFactory {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateUploadedFileData): Promise<UploadedFile> {
    const timestamp = Date.now();
    const fileData = {
      userId: data.userId,
      fileName: data.fileName || `test-file-${timestamp}.pdf`,
      originalFileName: data.originalFileName || `original-file-${timestamp}.pdf`,
      fileKey: data.fileKey || `uploads/${timestamp}-test.pdf`,
      fileSize: data.fileSize || 1024000, // 1MB default
      mimeType: data.mimeType || 'application/pdf',
      parseStatus: data.parseStatus || FileParseStatus.COMPLETED,
      // Only set default parsedContent if not explicitly provided and status suggests content should exist
      parsedContent: data.parsedContent !== undefined ? data.parsedContent : 
        (data.parseStatus === FileParseStatus.COMPLETED || !data.parseStatus) ? 
        'This is sample parsed content for testing.' : undefined,
      parseError: data.parseError,
      expiresAt: data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
    };

    return this.prisma.uploadedFile.create({
      data: fileData
    });
  }

  async createMany(count: number, userId: string): Promise<UploadedFile[]> {
    const files: UploadedFile[] = [];
    for (let i = 0; i < count; i++) {
      files.push(await this.create({
        userId,
        fileName: `test-file-${i}.pdf`,
        originalFileName: `original-file-${i}.pdf`,
      }));
    }
    return files;
  }

  async createWithParseStatus(userId: string, status: FileParseStatus): Promise<UploadedFile> {
    const baseData: CreateUploadedFileData = {
      userId,
      parseStatus: status,
    };

    switch (status) {
      case FileParseStatus.PENDING:
        // Don't set any content or errors for pending files
        break;
      case FileParseStatus.PROCESSING:
        // Don't set any content or errors for processing files
        break;
      case FileParseStatus.COMPLETED:
        baseData.parsedContent = 'Successfully parsed content.';
        break;
      case FileParseStatus.FAILED:
        baseData.parseError = 'Parse failed: Unsupported file format';
        break;
    }

    return this.create(baseData);
  }

  async createPdfFile(userId: string): Promise<UploadedFile> {
    return this.create({
      userId,
      fileName: 'document.pdf',
      originalFileName: 'My Document.pdf',
      mimeType: 'application/pdf',
      fileSize: 2048000, // 2MB
      parsedContent: 'This is a PDF document content for grading.'
    });
  }

  async createWordFile(userId: string): Promise<UploadedFile> {
    return this.create({
      userId,
      fileName: 'essay.docx',
      originalFileName: 'My Essay.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileSize: 512000, // 512KB
      parsedContent: 'This is a Word document content for grading.'
    });
  }
} 
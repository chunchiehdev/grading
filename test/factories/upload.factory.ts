import { PrismaClient } from '../../app/generated/prisma/client';

export interface Upload {
  id: string;
  userId: string;
  rubricId: string;
  originalFileName: string;
  storedFileKey: string;
  storageLocation: string;
  fileSize: number;
  mimeType: string;
  status: 'not_started' | 'processing' | 'completed' | 'failed';
  result?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUploadData {
  userId: string;
  rubricId: string;
  originalFileName?: string;
  storedFileKey?: string;
  storageLocation?: string;
  fileSize?: number;
  mimeType?: string;
  status?: 'not_started' | 'processing' | 'completed' | 'failed';
  result?: any;
}

export class UploadFactory {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateUploadData): Promise<Upload> {
    // 驗證必填欄位
    if (!data.userId) {
      throw new Error('User ID is required');
    }
    if (!data.rubricId) {
      throw new Error('Rubric ID is required');
    }

    const timestamp = Date.now();
    const uploadData = {
      userId: data.userId,
      rubricId: data.rubricId,
      originalFileName: data.originalFileName || `test-document-${timestamp}.pdf`,
      storedFileKey: data.storedFileKey || `uploads/${timestamp}-${Math.random().toString(36).substr(2, 9)}.pdf`,
      storageLocation: data.storageLocation || `/uploads/test-document-${timestamp}.pdf`,
      fileSize: data.fileSize || 1024 + Math.floor(Math.random() * 10000), // Random size between 1KB-11KB
      mimeType: data.mimeType || 'application/pdf',
      status: data.status || 'not_started',
      result: data.result || null
    };

    return this.prisma.upload.create({
      data: uploadData
    });
  }

  async createMany(count: number, userId: string, rubricId: string): Promise<Upload[]> {
    const uploads: Upload[] = [];
    for (let i = 0; i < count; i++) {
      uploads.push(await this.create({
        userId,
        rubricId,
        originalFileName: `batch-upload-${i}.pdf`,
        storageLocation: `/uploads/batch-${i}.pdf`
      }));
    }
    return uploads;
  }

  async createWithResult(data: CreateUploadData & { score?: number; feedback?: string }): Promise<Upload> {
    const result = {
      score: data.score || 85,
      feedback: data.feedback || 'Good work overall with room for improvement',
      criteria_scores: [
        { name: 'Content', score: data.score || 85, feedback: 'Well structured content' },
        { name: 'Grammar', score: (data.score || 85) + 5, feedback: 'Excellent grammar usage' }
      ],
      graded_at: new Date().toISOString()
    };

    return this.create({
      ...data,
      status: 'completed',
      result
    });
  }
} 
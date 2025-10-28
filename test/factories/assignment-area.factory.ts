import { db } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateAssignmentAreaOptions {
  courseId: string;
  rubricId: string;
  name?: string;
  description?: string;
  dueDate?: Date | null;
  classId?: string | null;
  referenceFileIds?: string | null;
  customGradingPrompt?: string | null;
}

export class AssignmentAreaFactory {
  static async create(options: CreateAssignmentAreaOptions) {
    const assignmentArea = await db.assignmentArea.create({
      data: {
        id: uuidv4(),
        courseId: options.courseId,
        rubricId: options.rubricId,
        name: options.name || `Assignment ${Math.floor(Math.random() * 1000)}`,
        description: options.description || 'Test assignment for automated testing',
        dueDate: options.dueDate !== undefined ? options.dueDate : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        classId: options.classId ?? null,
        referenceFileIds: options.referenceFileIds ?? null,
        customGradingPrompt: options.customGradingPrompt ?? null,
      },
    });

    console.log(`📝 Created assignment area: ${assignmentArea.name}`);
    return assignmentArea;
  }

  static async createWithDueDate(options: Omit<CreateAssignmentAreaOptions, 'dueDate'>, daysFromNow: number) {
    const dueDate = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
    return this.create({
      ...options,
      dueDate,
    });
  }
}

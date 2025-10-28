import { db } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateEnrollmentOptions {
  studentId: string;
  classId: string;
  finalGrade?: number;
  attendance?: Record<string, any>;
}

export class EnrollmentFactory {
  static async create(options: CreateEnrollmentOptions) {
    const enrollment = await db.enrollment.create({
      data: {
        id: uuidv4(),
        studentId: options.studentId,
        classId: options.classId,
        finalGrade: options.finalGrade ?? null,
        ...(options.attendance && { attendance: options.attendance }),
      },
    });

    console.log(`📋 Created enrollment: student ${options.studentId.substring(0, 8)} in class ${options.classId.substring(0, 8)}`);
    return enrollment;
  }

  static async createMultiple(studentIds: string[], classId: string, options: Omit<CreateEnrollmentOptions, 'studentId' | 'classId'> = {}) {
    const enrollments = [];
    for (const studentId of studentIds) {
      enrollments.push(
        await this.create({
          ...options,
          studentId,
          classId,
        })
      );
    }
    return enrollments;
  }

  static async createForClass(classId: string, studentIds: string[], options: Omit<CreateEnrollmentOptions, 'classId' | 'studentId'> = {}) {
    return this.createMultiple(studentIds, classId, options);
  }
}

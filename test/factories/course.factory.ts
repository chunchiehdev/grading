import { db } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateCourseOptions {
  teacherId: string;
  name?: string;
  description?: string;
}

export class CourseFactory {
  static async create(options: CreateCourseOptions) {
    const course = await db.course.create({
      data: {
        id: uuidv4(),
        teacherId: options.teacherId,
        name: options.name || `Test Course ${Math.floor(Math.random() * 1000)}`,
        description: options.description || 'A test course for automated testing',
      },
    });

    console.log(`🎓 Created course: ${course.name}`);
    return course;
  }

  static async createWithInvitation(teacherId: string, options: Omit<CreateCourseOptions, 'teacherId'> = {}) {
    const course = await this.create({ ...options, teacherId });

    // Create invitation code
    const invitationCode = await db.invitationCode.create({
      data: {
        id: uuidv4(),
        code: `TEST-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        courseId: course.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isUsed: false,
      },
    });

    console.log(`🔑 Created invitation code: ${invitationCode.code}`);
    return { course, invitationCode };
  }
}

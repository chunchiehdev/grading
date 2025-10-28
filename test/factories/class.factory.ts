import { db } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateClassOptions {
  courseId: string;
  name?: string;
  schedule?: Record<string, any>;
  capacity?: number;
  assistantId?: string;
  isActive?: boolean;
}

export class ClassFactory {
  static async create(options: CreateClassOptions) {
    const classData = await db.class.create({
      data: {
        id: uuidv4(),
        courseId: options.courseId,
        name: options.name || `Class ${Math.floor(Math.random() * 1000)}`,
        ...(options.schedule && { schedule: options.schedule }),
        capacity: options.capacity ?? null,
        assistantId: options.assistantId ?? null,
        isActive: options.isActive ?? true,
      },
    });

    console.log(`📚 Created class: ${classData.name}`);
    return classData;
  }

  static async createActive(options: Omit<CreateClassOptions, 'isActive'> = { courseId: '' }) {
    return this.create({ ...options, isActive: true });
  }

  static async createWithCapacity(courseId: string, capacity: number, options: Omit<CreateClassOptions, 'courseId' | 'capacity'> = {}) {
    return this.create({ ...options, courseId, capacity });
  }

  static async createMany(courseId: string, count: number, options: Omit<CreateClassOptions, 'courseId'> = {}) {
    const classes = [];
    for (let i = 0; i < count; i++) {
      classes.push(
        await this.create({
          ...options,
          courseId,
          name: options.name ? `${options.name} ${i + 1}` : `Class ${i + 1}`,
        })
      );
    }
    return classes;
  }
}

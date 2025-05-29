import { PrismaClient } from '../../app/generated/prisma/client';

export interface Rubric {
  id: string;
  userId: string;
  name: string;
  description: string;
  criteria: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRubricData {
  userId: string;
  name?: string;
  description?: string;
  criteria?: any;
}

export class RubricFactory {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateRubricData): Promise<Rubric> {
    // 先驗證原始輸入
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Rubric name is required and cannot be empty');
    }
    if (data.description !== undefined && !data.description.trim()) {
      throw new Error('Rubric description is required and cannot be empty');
    }

    const defaultCriteria = [
      {
        name: 'Content Quality',
        description: 'Quality of content and ideas',
        levels: [
          { level: 1, description: 'Poor', score: 1 },
          { level: 2, description: 'Fair', score: 2 },
          { level: 3, description: 'Good', score: 3 },
          { level: 4, description: 'Excellent', score: 4 }
        ]
      }
    ];

    const rubricData = {
      userId: data.userId,
      name: data.name || `Test Rubric ${Date.now()}`,
      description: data.description || 'A test rubric for grading',
      criteria: data.criteria !== undefined ? data.criteria : defaultCriteria
    };

    return this.prisma.rubric.create({
      data: rubricData
    });
  }

  async createMany(count: number, userId: string): Promise<Rubric[]> {
    const rubrics: Rubric[] = [];
    for (let i = 0; i < count; i++) {
      rubrics.push(await this.create({
        userId,
        name: `Test Rubric ${i}`,
        description: `Description for rubric ${i}`,
        criteria: []
      }));
    }
    return rubrics;
  }
} 
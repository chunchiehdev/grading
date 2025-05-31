import { PrismaClient, Rubric } from '@/types/database';

export interface CreateRubricData {
  userId: string;
  name?: string;
  description?: string;
  version?: number;
  isActive?: boolean;
  criteria?: any[];
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
        id: 'criteria-1',
        name: 'Content Quality',
        description: 'Quality of content and ideas',
        maxScore: 4,
        levels: [
          { score: 1, description: 'Poor' },
          { score: 2, description: 'Fair' },
          { score: 3, description: 'Good' },
          { score: 4, description: 'Excellent' }
        ]
      }
    ];

    const rubricData = {
      userId: data.userId,
      name: data.name || `Test Rubric ${Date.now()}`,
      description: data.description || 'A test rubric for grading',
      version: data.version || 1,
      isActive: data.isActive !== undefined ? data.isActive : true,
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

  async createWithVersions(userId: string, baseData: Partial<CreateRubricData> = {}): Promise<Rubric[]> {
    const versions: Rubric[] = [];
    
    // Create version 1 (inactive)
    const v1 = await this.create({
      userId,
      name: baseData.name || 'Test Rubric',
      description: baseData.description || 'Version 1',
      version: 1,
      isActive: false,
      criteria: [
        {
          id: 'criteria-1',
          name: 'Basic Criteria',
          description: 'Basic evaluation criteria',
          maxScore: 3,
          levels: [
            { score: 1, description: 'Poor' },
            { score: 2, description: 'Good' },
            { score: 3, description: 'Excellent' }
          ]
        }
      ]
    });
    versions.push(v1);

    // Create version 2 (active)
    const v2 = await this.create({
      userId,
      name: baseData.name || 'Test Rubric',
      description: baseData.description || 'Version 2 - Updated',
      version: 2,
      isActive: true,
      criteria: [
        {
          id: 'criteria-1',
          name: 'Enhanced Criteria',
          description: 'Enhanced evaluation criteria',
          maxScore: 4,
          levels: [
            { score: 1, description: 'Poor' },
            { score: 2, description: 'Fair' },
            { score: 3, description: 'Good' },
            { score: 4, description: 'Excellent' }
          ]
        }
      ]
    });
    versions.push(v2);

    return versions;
  }
} 
import { db } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateRubricOptions {
  userId: string;
  name?: string;
  description?: string;
  isTemplate?: boolean;
  version?: number;
  isActive?: boolean;
  criteria?: any;
}

export class RubricFactory {
  static defaultCriteria = [
    {
      id: uuidv4(),
      name: 'Content Quality',
      description: 'Quality and depth of content',
      maxScore: 40,
      levels: [
        { score: 40, description: 'Exceptional - Clear, comprehensive, and insightful' },
        { score: 30, description: 'Good - Clear and adequate content' },
        { score: 20, description: 'Fair - Basic content with some gaps' },
        { score: 10, description: 'Poor - Minimal or unclear content' },
        { score: 0, description: 'Missing - No relevant content' },
      ],
    },
    {
      id: uuidv4(),
      name: 'Organization',
      description: 'Structure and flow of ideas',
      maxScore: 30,
      levels: [
        { score: 30, description: 'Excellent - Well-organized and logical flow' },
        { score: 20, description: 'Good - Generally well-organized' },
        { score: 15, description: 'Fair - Some organization issues' },
        { score: 10, description: 'Poor - Disorganized or confusing' },
        { score: 0, description: 'Missing - No clear organization' },
      ],
    },
    {
      id: uuidv4(),
      name: 'Grammar & Style',
      description: 'Language usage and writing quality',
      maxScore: 30,
      levels: [
        { score: 30, description: 'Excellent - Professional writing with no errors' },
        { score: 25, description: "Good - Minor errors that don't impede understanding" },
        { score: 20, description: 'Fair - Some errors that occasionally impede understanding' },
        { score: 15, description: 'Poor - Frequent errors that impede understanding' },
        { score: 0, description: 'Missing - Incomprehensible or missing content' },
      ],
    },
  ];

  static async create(options: CreateRubricOptions) {
    const rubric = await db.rubric.create({
      data: {
        id: uuidv4(),
        userId: options.userId,
        name: options.name || `Test Rubric ${Math.floor(Math.random() * 1000)}`,
        description: options.description || 'A test rubric for automated testing',
        version: options.version || 1,
        isActive: options.isActive ?? true,
        isTemplate: options.isTemplate || false,
        criteria: options.criteria || this.defaultCriteria,
      },
    });

    console.log(`📋 Created rubric: ${rubric.name} (${rubric.isTemplate ? 'template' : 'regular'})`);
    return rubric;
  }

  static async createWithCategories(options: CreateRubricOptions) {
    const categorizedCriteria = [
      {
        id: uuidv4(),
        name: 'Content',
        criteria: [
          this.defaultCriteria[0], // Content Quality
        ],
      },
      {
        id: uuidv4(),
        name: 'Structure',
        criteria: [
          this.defaultCriteria[1], // Organization
          this.defaultCriteria[2], // Grammar & Style
        ],
      },
    ];

    return this.create({
      ...options,
      criteria: categorizedCriteria,
    });
  }

  static async createTemplate(options: Omit<CreateRubricOptions, 'isTemplate'>) {
    return this.create({ ...options, isTemplate: true });
  }
}

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
  // Helper: Flatten categorized criteria to flat format for database storage
  // Production UI expects flat criteria with maxScore fields!
  static flattenCategoriesToCriteria(categories: any[]): any[] {
    return categories.flatMap((category) => {
      if (Array.isArray(category.criteria)) {
        // Categorized format: extract criteria from each category
        return category.criteria.map((criterion: any) => ({
          id: criterion.id,
          name: criterion.name,
          description: criterion.description || '',
          maxScore: criterion.maxScore || 0,
          levels: criterion.levels || [],
        }));
      } else {
        // Already flat format
        return [{
          id: category.id,
          name: category.name,
          description: category.description || '',
          maxScore: category.maxScore || 0,
          levels: category.levels || [],
        }];
      }
    });
  }

  // Helper: Convert flat criteria to categorized format for database storage
  // The service layer (rubric.server.ts) expects categorized format!
  static ensureCategorizedFormat(criteria: any[]): any[] {
    if (!Array.isArray(criteria) || criteria.length === 0) {
      return [];
    }

    // Check if already in categorized format (items have .criteria property)
    const isAlreadyCategorized = criteria[0]?.criteria !== undefined;
    if (isAlreadyCategorized) {
      return criteria;
    }

    // Check if in flat format (items have .maxScore property)
    const isFlat = criteria[0]?.maxScore !== undefined;
    if (isFlat) {
      // Wrap flat criteria in a default "General" category
      return [{
        id: uuidv4(),
        name: 'General',
        criteria: criteria.map(criterion => ({
          id: criterion.id || uuidv4(),
          name: criterion.name,
          description: criterion.description || '',
          maxScore: criterion.maxScore || 0,
          levels: criterion.levels || [],
        }))
      }];
    }

    // Unknown format, return as-is
    console.warn('Unknown criteria format, returning as-is');
    return criteria;
  }

  // Flat criteria format (for direct use)
  static getFlatCriteria() {
    return [
      {
        id: uuidv4(),
        name: 'Content Quality',
        description: 'Quality and depth of content',
        maxScore: 4,
        levels: [
          { score: 4, description: 'Exceptional - Clear, comprehensive, and insightful' },
          { score: 3, description: 'Good - Clear and adequate content' },
          { score: 2, description: 'Fair - Basic content with some gaps' },
          { score: 1, description: 'Poor - Minimal or unclear content' },
        ],
      },
      {
        id: uuidv4(),
        name: 'Organization',
        description: 'Structure and flow of ideas',
        maxScore: 4,
        levels: [
          { score: 4, description: 'Excellent - Well-organized and logical flow' },
          { score: 3, description: 'Good - Generally well-organized' },
          { score: 2, description: 'Fair - Some organization issues' },
          { score: 1, description: 'Poor - Disorganized or confusing' },
        ],
      },
      {
        id: uuidv4(),
        name: 'Grammar & Style',
        description: 'Language usage and writing quality',
        maxScore: 4,
        levels: [
          { score: 4, description: 'Excellent - Professional writing with no errors' },
          { score: 3, description: "Good - Minor errors that don't impede understanding" },
          { score: 2, description: 'Fair - Some errors that occasionally impede understanding' },
          { score: 1, description: 'Poor - Frequent errors that impede understanding' },
        ],
      },
    ];
  }

  // Categorized criteria format (as stored in production)
  static getCategorizedCriteria() {
    return [
      {
        id: uuidv4(),
        name: 'Content',
        criteria: [
          {
            id: uuidv4(),
            name: 'Content Quality',
            description: 'Quality and depth of content',
            maxScore: 4,
            levels: [
              { score: 4, description: 'Exceptional - Clear, comprehensive, and insightful' },
              { score: 3, description: 'Good - Clear and adequate content' },
              { score: 2, description: 'Fair - Basic content with some gaps' },
              { score: 1, description: 'Poor - Minimal or unclear content' },
            ],
          },
        ],
      },
      {
        id: uuidv4(),
        name: 'Structure',
        criteria: [
          {
            id: uuidv4(),
            name: 'Organization',
            description: 'Structure and flow of ideas',
            maxScore: 4,
            levels: [
              { score: 4, description: 'Excellent - Well-organized and logical flow' },
              { score: 3, description: 'Good - Generally well-organized' },
              { score: 2, description: 'Fair - Some organization issues' },
              { score: 1, description: 'Poor - Disorganized or confusing' },
            ],
          },
          {
            id: uuidv4(),
            name: 'Grammar & Style',
            description: 'Language usage and writing quality',
            maxScore: 4,
            levels: [
              { score: 4, description: 'Excellent - Professional writing with no errors' },
              { score: 3, description: "Good - Minor errors that don't impede understanding" },
              { score: 2, description: 'Fair - Some errors that occasionally impede understanding' },
              { score: 1, description: 'Poor - Frequent errors that impede understanding' },
            ],
          },
        ],
      },
    ];
  }

  static async create(options: CreateRubricOptions) {
    // CRITICAL: Ensure criteria is always in CATEGORIZED format for database storage
    // The service layer (rubric.server.ts) expects: categories[].criteria[].maxScore
    let storageCriteria = options.criteria || this.getFlatCriteria();

    // Convert to categorized format if needed (service layer expects this!)
    storageCriteria = this.ensureCategorizedFormat(storageCriteria);

    const rubric = await db.rubric.create({
      data: {
        id: uuidv4(),
        userId: options.userId,
        name: options.name || `Test Rubric ${Math.floor(Math.random() * 1000)}`,
        description: options.description || 'A test rubric for automated testing',
        version: options.version || 1,
        isActive: options.isActive ?? true,
        isTemplate: options.isTemplate || false,
        criteria: storageCriteria,
      },
    });

    console.log(`📋 Created rubric: ${rubric.name} (${rubric.isTemplate ? 'template' : 'regular'})`);
    return rubric;
  }

  static async createWithCategories(options: CreateRubricOptions) {
    // IMPORTANT: Ensure categorized format for storage
    // The service layer expects categorized format, not flat!
    const categoriesToStore = options.criteria || this.getCategorizedCriteria();

    // The create method will ensure categorized format
    return this.create({
      ...options,
      criteria: categoriesToStore,
    });
  }

  static async createTemplate(options: Omit<CreateRubricOptions, 'isTemplate'>) {
    return this.create({ ...options, isTemplate: true });
  }
}

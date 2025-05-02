import type { Section, AssignmentSubmission, ValidationResult } from '../types/grading';

/**
 * 針對不同部分的驗證規則配置
 */
export const SECTION_VALIDATION_RULES = {
  summary: {
    minLength: 50,
    maxLength: 500,
  },
  reflection: {
    minLength: 100,
    maxLength: 1000,
  },
  questions: {
    minLength: 30,
    maxLength: 300,
  },
};

/**
 * 評分區段的配置
 */
export const SECTION_CONFIG: Section[] = [
  {
    id: 'summary',
    title: '摘要',
    content: '',
    placeholder: '請輸入摘要內容...',
    maxLength: SECTION_VALIDATION_RULES.summary.maxLength,
    required: true,
    order: 1,
    minLength: SECTION_VALIDATION_RULES.summary.minLength,
  },
  {
    id: 'reflection',
    title: '反思',
    content: '',
    placeholder: '請輸入反思內容...',
    maxLength: SECTION_VALIDATION_RULES.reflection.maxLength,
    required: true,
    order: 2,
    minLength: SECTION_VALIDATION_RULES.reflection.minLength,
  },
  {
    id: 'questions',
    title: '問題',
    content: '',
    placeholder: '請輸入問題內容...',
    maxLength: SECTION_VALIDATION_RULES.questions.maxLength,
    required: true,
    order: 3,
    minLength: SECTION_VALIDATION_RULES.questions.minLength,
  },
];

/**
 * 驗證單個部分的內容
 */
function validateSection(section: Section): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const rules = SECTION_VALIDATION_RULES[section.id];

  if (section.required && (!section.content || section.content.trim().length === 0)) {
    errors.push(`${section.title}為必填項目`);
    return { isValid: false, errors };
  }

  if (section.content) {
    const content = section.content.trim();

    if (content.length < rules.minLength) {
      errors.push(`${section.title}至少需要${rules.minLength}字`);
    }

    if (content.length > rules.maxLength) {
      errors.push(`${section.title}不得超過${rules.maxLength}字`);
    }

    if (section.maxLength && content.length > section.maxLength) {
      errors.push(`${section.title}超過指定的長度限制${section.maxLength}字`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 驗證整個作業提交
 */
export function validateAssignment(submission: AssignmentSubmission): ValidationResult {
  const errors: string[] = [];
  const missingFields: string[] = [];
  const invalidFields: { field: string; reason: string }[] = [];

  if (!submission.metadata?.submittedAt) {
    errors.push('缺少提交時間');
  }
  if (!submission.metadata?.authorId) {
    errors.push('缺少作者ID');
  }

  for (const section of submission.sections) {
    const sectionValidation = validateSection(section);

    if (!sectionValidation.isValid) {
      if (!section.content && section.required) {
        missingFields.push(section.title);
      } else {
        sectionValidation.errors.forEach((error) => {
          invalidFields.push({
            field: section.title,
            reason: error,
          });
          errors.push(error);
        });
      }
    }
  }

  const isOrderValid = submission.sections.every(
    (section, index, array) => index === 0 || section.order > array[index - 1].order
  );

  if (!isOrderValid) {
    errors.push('作業部分順序錯誤');
  }

  return {
    isValid: errors.length === 0,
    errors,
    missingFields: missingFields.length > 0 ? missingFields : undefined,
    invalidFields: invalidFields.length > 0 ? invalidFields : undefined,
  };
}

export const ValidationUtils = {
  validateAssignment,
  validateSection,
};

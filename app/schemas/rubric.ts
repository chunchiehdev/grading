import { z } from 'zod';

export const LevelSchema = z.object({
  score: z.number().int().min(1).max(4),
  description: z.string().min(1, '等級描述不能為空').max(500, '等級描述過長'),
});

export const UICriterionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, '評分標準名稱不能為空').max(100, '評分標準名稱過長'),
  description: z
    .string()
    .max(500, '評分標準描述過長')
    .transform((val) => val || ''),
  levels: z.array(LevelSchema).min(1, '請至少設定一個等級'),
});

export const UICategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, '類別名稱不能為空').max(100, '類別名稱過長'),
  criteria: z.array(UICriterionSchema),
});

export const UIRubricDataSchema = z.object({
  name: z.string().min(1, '評分標準名稱不能為空').max(200, '評分標準名稱過長'),
  description: z.string().min(1, '評分標準描述不能為空').max(1000, '評分標準描述過長'),
  categories: z.array(UICategorySchema).min(1, '請至少新增一個評分類別'),
});

export const DbCriterionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z
    .string()
    .max(500)
    .transform((val) => val || ''),
  levels: z.array(LevelSchema),
});

export const CreateRubricRequestSchema = z.object({
  name: z.string().min(1, '評分標準名稱不能為空').max(200),
  description: z.string().min(1, '評分標準描述不能為空').max(1000),
  categoriesJson: z.string().transform((str, ctx) => {
    try {
      const parsed = JSON.parse(str);
      const parsedCategories = z
        .array(
          z.object({
            id: z.string().uuid(),
            name: z.string().min(1, '類別名稱不能為空').max(100),
            criteria: z.array(
              z.object({
                id: z.string().uuid(),
                name: z.string().min(1, '評分標準名稱不能為空').max(100),
                description: z.string().transform((val) => val || ''),
                levels: z.array(LevelSchema),
              })
            ),
          })
        )
        .parse(parsed);

      if (parsedCategories.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: '請至少新增一個評分類別' });
        return z.NEVER;
      }

      return parsedCategories;
    } catch (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '無效的類別資料格式' });
      return z.NEVER;
    }
  }),
});

export const UpdateRubricRequestSchema = CreateRubricRequestSchema.extend({
  id: z.string().uuid(),
});

export const DeleteRubricRequestSchema = z.object({
  id: z.string().uuid('無效的評分標準ID'),
});

export const RubricCompletionSchema = UIRubricDataSchema.refine(
  (data) => {
    return data.categories.length > 0;
  },
  { message: '請至少新增一個評分類別' }
);

export function getRubricWarnings(data: UIRubricData): string[] {
  const warnings: string[] = [];
  const totalCriteria = data.categories.reduce((acc, cat) => acc + cat.criteria.length, 0);
  if (totalCriteria === 0) {
    warnings.push('建議為每個類別添加評分標準');
  }

  const completedCriteria = data.categories.reduce(
    (acc, cat) =>
      acc + cat.criteria.filter((crit) => crit.levels.some((level) => level.description.trim().length > 0)).length,
    0
  );

  if (completedCriteria < totalCriteria) {
    warnings.push(`還有 ${totalCriteria - completedCriteria} 個評分標準未完成等級描述`);
  }

  data.categories.forEach((category) => {
    category.criteria.forEach((criterion) => {
      const incompletelevels = criterion.levels.filter((level) => !level.description.trim());
      if (incompletelevels.length > 0) {
        warnings.push(`「${criterion.name}」缺少 ${incompletelevels.length} 個等級描述`);
      }
    });
  });

  return warnings;
}

export type Level = z.infer<typeof LevelSchema>;
export type UICriterion = z.infer<typeof UICriterionSchema>;
export type UICategory = z.infer<typeof UICategorySchema>;
export type UIRubricData = z.infer<typeof UIRubricDataSchema>;
export type CreateRubricRequest = z.infer<typeof CreateRubricRequestSchema>;
export type UpdateRubricRequest = z.infer<typeof UpdateRubricRequestSchema>;
export type DeleteRubricRequest = z.infer<typeof DeleteRubricRequestSchema>;

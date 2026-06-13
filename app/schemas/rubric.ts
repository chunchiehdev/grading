import { z } from 'zod';

const LevelSchema = z.object({
  score: z.number().int().min(1).max(4),
  description: z.string().min(1, '等級描述不能為空').max(500, '等級描述過長'),
});

const UICriterionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, '評分標準名稱不能為空').max(100, '評分標準名稱過長'),
  description: z
    .string()
    .max(500, '評分標準描述過長')
    .transform((val) => val || ''),
  levels: z.array(LevelSchema).min(1, '請至少設定一個等級'),
});

const UICategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, '類別名稱不能為空').max(100, '類別名稱過長'),
  criteria: z.array(UICriterionSchema),
});

export const UIRubricDataSchema = z.object({
  name: z.string().min(1, '評分標準名稱不能為空').max(200, '評分標準名稱過長'),
  description: z.string().min(1, '評分標準描述不能為空').max(1000, '評分標準描述過長'),
  categories: z.array(UICategorySchema).min(1, '請至少新增一個評分類別'),
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

export type Level = z.infer<typeof LevelSchema>;

import { z } from "zod";

// Schema for each comment section
const CommentSchema = z.string().min(1, "評論內容不能為空");

// Schema for the strengths array
const StrengthSchema = z.string().min(1, "優點內容不能為空");

// Schema for the feedback data
export const FeedbackDataSchema = z.object({
  score: z.number().int().min(0, "分數必須在0-100之間").max(100, "分數必須在0-100之間"),
  summaryComments: CommentSchema.min(1, "缺少摘要評論"),
  reflectionComments: CommentSchema.min(1, "缺少反思評論"),
  questionComments: CommentSchema.min(1, "缺少問題評論"),
  overallSuggestions: CommentSchema.min(1, "缺少整體建議"),
  strengths: z.array(StrengthSchema).min(1, "至少需要一個優點"),
  createdAt: z.date().or(z.string().datetime()).optional().default(() => new Date()),
  gradingDuration: z.number().positive("評分時間無效"),
  sectionScores: z.record(z.string(), z.number().int().min(0).max(100)).optional(),
});

// Type inference from the schema
export type ZodFeedbackData = z.infer<typeof FeedbackDataSchema>;

// Function to validate feedback data using the schema
export function validateFeedbackWithZod(feedback: unknown) {
  const result = FeedbackDataSchema.safeParse(feedback);
  
  if (result.success) {
    return {
      isValid: true,
      data: result.data
    };
  }
  
  // Format errors to match existing ValidationResult structure
  const formattedErrors = result.error.format();
  const errors: string[] = [];
  const invalidFields: { field: string; reason: string }[] = [];
  
  // Process top-level errors
  Object.entries(formattedErrors)
    .filter(([key]) => key !== "_errors")
    .forEach(([field, fieldErrors]) => {
      if (typeof fieldErrors === "object" && "_errors" in fieldErrors && Array.isArray(fieldErrors._errors) && fieldErrors._errors.length > 0) {
        const errorMessage = fieldErrors._errors[0];
        errors.push(errorMessage);
        invalidFields.push({
          field,
          reason: errorMessage
        });
      }
    });
  
  return {
    isValid: false,
    errors,
    invalidFields: invalidFields.length > 0 ? invalidFields : undefined
  };
} 
import { z } from "zod";
import { SECTION_VALIDATION_RULES } from "@/utils/validation";
import type { Section } from "@/types/grading";

// Schema for a section in an assignment
export const SectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().optional(),
  order: z.number().int().positive(),
  required: z.boolean().default(false),
  maxLength: z.number().int().positive().optional(),
}).refine((section) => {
  // Skip validation for non-required empty sections
  if (!section.required && (!section.content || section.content.trim().length === 0)) {
    return true;
  }
  
  if (section.required && (!section.content || section.content.trim().length === 0)) {
    return false;
  }

  // Check if the section ID is valid
  const validSectionIds = Object.keys(SECTION_VALIDATION_RULES);
  if (!validSectionIds.includes(section.id)) return true;

  const rules = SECTION_VALIDATION_RULES[section.id as keyof typeof SECTION_VALIDATION_RULES];
  if (!rules) return true;

  const content = section.content?.trim() || "";
  if (content.length < rules.minLength) {
    return false;
  }
  
  if (content.length > rules.maxLength) {
    return false;
  }
  
  if (section.maxLength && content.length > section.maxLength) {
    return false;
  }

  return true;
}, {
  message: "內容不符合長度要求",
  path: ["content"]
});

// Schema for assignment metadata
export const AssignmentMetadataSchema = z.object({
  submittedAt: z.date().or(z.string().datetime()),
  authorId: z.string().min(1, "作者ID為必填項目")
});

// Schema for the complete assignment submission
export const AssignmentSubmissionSchema = z.object({
  sections: z.array(SectionSchema)
    .min(1, "至少需要一個部分")
    .refine(
      (sections) => {
        // Check if sections are in correct order
        return sections.every(
          (section, index, array) =>
            index === 0 || section.order > array[index - 1].order
        );
      },
      {
        message: "作業部分順序錯誤",
        path: ["sections"]
      }
    ),
  metadata: AssignmentMetadataSchema
});

// Type inference from the schema
export type ZodAssignmentSubmission = z.infer<typeof AssignmentSubmissionSchema>;

// Function to validate an assignment using the schema
export function validateAssignmentWithZod(submission: unknown) {
  const result = AssignmentSubmissionSchema.safeParse(submission);
  
  if (result.success) {
    return {
      isValid: true,
      data: result.data
    };
  }
  
  // Format errors to match existing ValidationResult structure
  const formattedErrors = result.error.format();
  const errors: string[] = [];
  const missingFields: string[] = [];
  const invalidFields: { field: string; reason: string }[] = [];
  
  // Process metadata errors
  if (formattedErrors.metadata && typeof formattedErrors.metadata === "object") {
    const metadataErrors = formattedErrors.metadata;
    if ("submittedAt" in metadataErrors && metadataErrors.submittedAt?._errors) {
      errors.push("缺少提交時間");
    }
    if ("authorId" in metadataErrors && metadataErrors.authorId?._errors) {
      errors.push("缺少作者ID");
    }
  }
  
  // Process section errors
  if (formattedErrors.sections?._errors) {
    errors.push(...formattedErrors.sections._errors);
  }
  
  // Process individual section errors
  if (formattedErrors.sections && typeof formattedErrors.sections === "object") {
    Object.entries(formattedErrors.sections)
      .filter(([key]) => key !== "_errors")
      .forEach(([index, sectionErrors]) => {
        if (typeof sectionErrors === "object" && submission && 
            typeof submission === "object" && "sections" in submission && 
            Array.isArray((submission as any).sections)) {
          const section = (submission as { sections: Section[] }).sections[Number(index)];
          if (section) {
            if ("content" in sectionErrors && section.required) {
              missingFields.push(section.title);
            } else if ("content" in sectionErrors) {
              invalidFields.push({
                field: section.title,
                reason: `${section.title}不符合長度要求`
              });
              errors.push(`${section.title}不符合長度要求`);
            }
          }
        }
      });
  }
  
  return {
    isValid: false,
    errors,
    missingFields: missingFields.length > 0 ? missingFields : undefined,
    invalidFields: invalidFields.length > 0 ? invalidFields : undefined
  };
} 
import { useState, useCallback, useMemo } from "react";
import { Form } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Progress } from "~/components/ui/progress";
import {
  CheckCircle2,
  ChevronRight,
  Send,
  Info,
  AlertCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Alert, AlertDescription } from "~/components/ui/alert";
import type { Section, ValidationResult, GradingStatus } from "~/types/grading";

interface AssignmentInputProps {
  sections: Section[]; // 改為必需，從外部傳入
  disabled?: boolean;
  validationErrors?: string[];
  status: GradingStatus; // 改為必需
  onValidation?: (result: ValidationResult) => void;
  className?: string;
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

interface SectionInputProps {
  section: Section;
  onChange: (content: string) => void;
  error?: string;
}

interface CompletionPreviewProps {
  sections: Section[];
}

// 輔助函數：驗證單個部分
function validateSection(section: Section): string[] {
  const errors: string[] = [];
  const content = section.content.trim();

  if (section.required && !content) {
    errors.push(`${section.title}為必填項目`);
  }

  if (content) {
    if (section.minLength && content.length < section.minLength) {
      errors.push(`${section.title}至少需要${section.minLength}字`);
    }
    if (section.maxLength && content.length > section.maxLength) {
      errors.push(`${section.title}不能超過${section.maxLength}字`);
    }
  }

  return errors;
}

const StepIndicator = ({ currentStep, totalSteps }: StepIndicatorProps) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="space-y-2">
      <Progress value={progress} className="h-2" />
      <div className="text-sm text-gray-500">
        步驟 {currentStep} / {totalSteps}
      </div>
    </div>
  );
};

const SectionInput = ({ section, onChange, error }: SectionInputProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {section.title}
          {section.required && <span className="text-red-500 ml-1">*</span>}
        </h3>
        <span className="text-sm text-gray-500">
          {section.content.length}/{section.maxLength}
        </span>
      </div>
      <Textarea
        value={section.content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={section.placeholder}
        className={`h-32 resize-none ${error ? "border-red-500" : ""}`}
        maxLength={section.maxLength}
      />
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

const CompletionPreview = ({ sections }: CompletionPreviewProps) => {
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h4 className="font-medium">{section.title}</h4>
          </div>
          <p className="text-gray-600 text-sm pl-7">{section.content}</p>
        </div>
      ))}
    </div>
  );
};

export function AssignmentInput({
  sections: initialSections,
  disabled = false,
  validationErrors = [],
  status,
  onValidation,
  className,
}: AssignmentInputProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  

  const totalSteps = sections.length + 1;
  const currentSection = sections[currentStep - 1];
  const isPreviewStep = currentStep === sections.length + 1;

  const canProceed = useMemo(() => {
    if (!currentSection && !isPreviewStep) return false;

    const content = currentSection?.content.trim() || '';
    
    // 只檢查當前區段的必填和長度限制
    return !currentSection || (
      (!currentSection.required || content.length > 0) &&
      (!currentSection.minLength || content.length >= currentSection.minLength) &&
      (!currentSection.maxLength || content.length <= currentSection.maxLength)
    );
  }, [currentSection, isPreviewStep]);

  const validateCurrentSection = useCallback(() => {
    if (!currentSection) return true;
    const errors = validateSection(currentSection);
    
    setLocalErrors((prev) => ({
      ...prev,
      [currentSection.id]: errors[0] || "",
    }));
    
    return errors.length === 0;
  }, [currentSection]);

  const validateAllSections = useCallback(() => {
    const allErrors = sections.flatMap(validateSection);
    const validationResult: ValidationResult = {
      isValid: allErrors.length === 0,
      errors: allErrors,
      missingFields: sections
        .filter((section) => section.required && !section.content.trim())
        .map((section) => section.title),
    };
    
    return validationResult;
  }, [sections]);

  const handleNext = useCallback(() => {
    console.log('handleNext called', {
      currentStep,
      totalSteps,
      isValid: validateCurrentSection()
    });

    if (validateCurrentSection()) {
      if (currentStep === totalSteps - 1) {
        // 在進入預覽頁面前驗證所有部分
        const validationResult = validateAllSections();
        if (validationResult.isValid) {
          // 使用 setTimeout 確保狀態更新完成
          setTimeout(() => {
            setCurrentStep((prev) => prev + 1);
          }, 0);
        } else {
          onValidation?.(validationResult);
        }
      } else {
        setCurrentStep((prev) => prev + 1);
      }
    }
  }, [validateCurrentSection, currentStep, totalSteps, validateAllSections, onValidation]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      
      // 最後驗證一次
      const validationResult = validateAllSections();
      onValidation?.(validationResult);

      if (validationResult.isValid) {
        const formData = new FormData(event.currentTarget);
        
        // 添加所有部分的內容
        sections.forEach((section) => {
          console.log(`Adding ${section.id}:`, section.content);
          formData.append(section.id, section.content);
        });

        // 真正提交表單
        event.currentTarget.submit();
      }
    },
    [sections, onValidation, validateAllSections]
  );

  const updateSection = useCallback(
    (content: string) => {
      setSections((prev) =>
        prev.map((section) =>
          section.id === currentSection?.id ? { ...section, content } : section
        )
      );
      // 清除該區段的錯誤訊息
      setLocalErrors((prev) => ({
        ...prev,
        [currentSection?.id]: "",
      }));
    },
    [currentSection?.id]
  );

  return (
    <Card className={className}>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle>作業內容</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>請依序填寫摘要、反思和問題</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
      </CardHeader>

      <CardContent className="space-y-6">
        <Form method="post" onSubmit={handleSubmit} className="space-y-6">
          <input type="hidden" name="authorId" value="user123" />{" "}
          {/* 需要從用戶系統獲取 */}
          <input type="hidden" name="courseId" value="course456" />{" "}
          {/* 需要從課程上下文獲取 */}
          {isPreviewStep ? (
            <CompletionPreview sections={sections} />
          ) : (
            <SectionInput
              section={currentSection}
              onChange={updateSection}
              error={localErrors[currentSection.id]}
            />
          )}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationErrors.join(", ")}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              返回
            </Button>

            {isPreviewStep ? (
              <Button
                type="submit"
                disabled={!canProceed || disabled || status === "processing"}
                className="gap-2"
              >
                送出 <Send className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed}
                className="gap-2"
              >
                下一步 <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}

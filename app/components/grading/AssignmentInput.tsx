import { useState, useCallback, useMemo, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
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
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Alert, AlertDescription } from "~/components/ui/alert";
import type { Section, ValidationResult, GradingStatus } from "~/types/grading";
import type { action } from "~/routes/assignments.grade";
import { v4 as uuidv4 } from 'uuid';

interface AssignmentInputProps {
  sections: Section[]; 
  disabled?: boolean;
  validationErrors?: string[];
  status: GradingStatus; 
  onValidation?: (result: ValidationResult) => void;
  className?: string;
  fetcher: ReturnType<typeof useFetcher<typeof action>>;
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
          <p className="text-gray-600 text-sm pl-7 break-words overflow-wrap-anywhere whitespace-pre-wrap">
            {section.content}
          </p>
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
  fetcher,
}: AssignmentInputProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const totalSteps = sections.length + 1;
  const currentSection = sections[currentStep - 1];
  const isPreviewStep = currentStep === sections.length + 1;
  const isSubmitting =
    fetcher.state === "submitting" && currentStep === totalSteps;
  const isLastStep = currentStep === totalSteps;
  const isActuallySubmitting = fetcher.state === "submitting" && isPreviewStep;
  const showSubmittingState = isActuallySubmitting && isLastStep;
  const [taskId, setTaskId] = useState<string | null>(null);

  const allErrors = useMemo(
    () => [...validationErrors, ...(fetcher.data?.validationErrors || [])],
    [validationErrors, fetcher.data?.validationErrors]
  );

  const canProceed = useMemo(() => {
    if (!currentSection && !isPreviewStep) return false;

    const content = currentSection?.content.trim() || "";

    return (
      !currentSection ||
      ((!currentSection.required || content.length > 0) &&
        (!currentSection.minLength ||
          content.length >= currentSection.minLength) &&
        (!currentSection.maxLength ||
          content.length <= currentSection.maxLength))
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

  const validateAllSections = useCallback((): ValidationResult => {
    const allErrors = sections.flatMap(validateSection);
    const result: ValidationResult = {
      isValid: allErrors.length === 0,
      errors: allErrors,
      missingFields: sections
        .filter((section) => section.required && !section.content.trim())
        .map((section) => section.title),
      invalidFields: sections
        .filter((section) => {
          const content = section.content.trim();
          return (
            (section.minLength && content.length < section.minLength) ||
            (section.maxLength && content.length > section.maxLength)
          );
        })
        .map((section) => ({
          field: section.title,
          reason: getInvalidReason(section),
        })),
    };

    setValidationResult(result);
    return result;
  }, [sections]);

  const getInvalidReason = (section: Section): string => {
    const content = section.content.trim();

    if (section.minLength && content.length < section.minLength) {
      return `至少需要 ${section.minLength} 字`;
    }

    if (section.maxLength && content.length > section.maxLength) {
      return `不能超過 ${section.maxLength} 字`;
    }

    return "";
  };

  const handleValidateAndProceed = useCallback(() => {
    const result = validateAllSections();
    onValidation?.(result);
    return result.isValid;
  }, [validateAllSections, onValidation]);

  const handleNext = useCallback(() => {
    if (validateCurrentSection()) {
      if (currentStep === totalSteps - 1) {
        const isValid = handleValidateAndProceed();
        if (isValid) {
          setCurrentStep((prev) => prev + 1);
        }
      } else {
        setCurrentStep((prev) => prev + 1);
      }
    }
  }, [
    validateCurrentSection,
    currentStep,
    totalSteps,
    handleValidateAndProceed,
  ]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      if (fetcher.state !== "idle") {
        fetcher.data = undefined; 
      }
    }
  }, [currentStep, fetcher]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!isPreviewStep) {
        return;
      }

      const isValid = handleValidateAndProceed();
      if (!isValid) {
        return;
      }

      const newTaskId = uuidv4();
      setTaskId(newTaskId); 

      const formData = new FormData(event.currentTarget);
      formData.append("taskId", newTaskId);

      
      sections.forEach((section) => {
        formData.append(section.id, section.content);
      });
      
      if (fetcher.state === "idle") {
        console.log("Submitting form with taskId:", taskId);
        fetcher.submit(formData, { method: "post" });
      }
    },
    [sections, validateAllSections, fetcher, isPreviewStep]
  );

  useEffect(() => {
    if (fetcher.data?.validationErrors) {
      onValidation?.({
        isValid: false,
        errors: fetcher.data.validationErrors,
        missingFields: [],
        invalidFields: [],
      });
    }
  }, [fetcher.data, onValidation]);

  useEffect(() => {
    
    if (status === "completed" || status === "error") {
      setTaskId(null);
    }
  }, [status]);

  useEffect(() => {
    console.log("=== AssignmentInput TaskId Update ===", {
      taskId,
      status,
      fetcherState: fetcher.state
    });
  }, [taskId, status, fetcher.state]);

  const updateSection = useCallback(
    (content: string) => {
      setSections((prev) =>
        prev.map((section) =>
          section.id === currentSection?.id ? { ...section, content } : section
        )
      );
      
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
        {isPreviewStep ? (
          <fetcher.Form
            method="post"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {taskId && <input type="text" name="taskId" value={taskId} />}
            <input type="hidden" name="authorId" value="user123" />
            <input type="hidden" name="courseId" value="course456" />
            <CompletionPreview sections={sections} />
            {allErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{allErrors.join(", ")}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                返回
              </Button>
              <Button
                type="submit"
                disabled={
                  !canProceed ||
                  disabled ||
                  status === "processing" ||
                  isActuallySubmitting
                }
                className="gap-2"
              >
                {showSubmittingState ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    提交中
                  </>
                ) : (
                  <>
                    送出 <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </fetcher.Form>
        ) : (
          <div className="space-y-6">
            <SectionInput
              section={currentSection}
              onChange={updateSection}
              error={localErrors[currentSection.id]}
            />
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                返回
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed}
                className="gap-2"
              >
                下一步 <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

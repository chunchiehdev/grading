import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  ChevronRight,
  Send,
  Info,
  AlertCircle,
  Loader2,
  FileText,
  Clock,
  XCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Section, ValidationResult, GradingStatus } from "@/types/grading";
import type { action } from "@/routes/assignments.grade.$taskId";
import { v4 as uuidv4 } from "uuid";
import _ from "lodash";

interface AssignmentInputProps {
  sections: Section[];
  disabled?: boolean;
  validationErrors?: string[];
  status: GradingStatus;
  onValidation?: (result: ValidationResult) => void;
  onBack?: () => void;
  className?: string;
  fetcher: ReturnType<typeof useFetcher<typeof action>>;
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

interface SectionInputProps {
  section: Section;
  onChange: (content: string, id: string, errors?: string[]) => void;
  error?: string;
  warning?: string;
}

interface CompletionPreviewProps {
  sections: Section[];
}

function validateSection(section: Section): string[] {
  const errors: string[] = [];
  const content = section.content.trim();

  switch (section.id) {
    case "summary":
      if (!content && section.required) {
        errors.push("摘要為必填項目");
      }
      break;
    case "reflection":
      if (!content && section.required) {
        errors.push("反思為必填項目");
      }
      break;
    case "questions":
      if (!content && section.required) {
        errors.push("問題為必填項目");
      }
      break;
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
      <div className="text-sm dark:text-orange-60 text-gray-500">
        步驟 {currentStep} / {totalSteps}
      </div>
    </div>
  );
};

const SectionInput = ({
  section,
  onChange,
  error,
  warning,
}: SectionInputProps) => {
  const contentRef = useRef("");

  const debouncedValidate = useMemo(
    () =>
      _.debounce((content: string, sectionData: Section) => {
        if (content !== contentRef.current) {
          return;
        }

        const errors = validateSection({
          ...sectionData,
          content,
        });

        onChange(content, sectionData.id, errors);
      }, 300),
    [onChange]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    contentRef.current = newContent;
    onChange(newContent, section.id);
    debouncedValidate(newContent, section);
  };

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
        onChange={handleChange}
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
      {warning && !error && (
        <Alert
          variant="default"
          className="bg-yellow-50 text-yellow-800 border-yellow-200"
        >
          <Info className="h-4 w-4" />
          <AlertDescription>{warning}</AlertDescription>
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
  onBack,
  className,
  fetcher,
}: AssignmentInputProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  // const totalSteps = sections.length + 1;
  const totalSteps = 2;
  const currentSection = sections[currentStep - 1];
  const isPreviewStep = currentStep === 2;
  const isSubmitting =
    fetcher.state === "submitting" && currentStep === totalSteps;
  // const isLastStep = currentStep === totalSteps;
  const isActuallySubmitting = fetcher.state === "submitting" && isPreviewStep;
  // const showSubmittingState = isActuallySubmitting && isLastStep;
  const [taskId, setTaskId] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const allErrors = [
    ...validationErrors,
    ...(fetcher.data?.validationErrors || []),
  ];

  const canProceed = useMemo(() => {
    return sections.every((section) => {
      const content = section.content.trim();
      return (
        (!section.required || content.length > 0) &&
        (!section.minLength || content.length >= section.minLength) &&
        (!section.maxLength || content.length <= section.maxLength)
      );
    });
  }, [sections]);

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
    const result = validateAllSections();
    onValidation?.(result);
    if (result.isValid) {
      setCurrentStep(2);
    }
  }, [validateAllSections, onValidation]);

  const handleBack = useCallback(() => {
    setCurrentStep(1);
    if (fetcher.state !== "idle") {
      fetcher.data = undefined;
    }
    onBack?.();
  }, [fetcher, onBack]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const isValid = handleValidateAndProceed();
      if (!isValid) {
        return;
      }

      setShowConfirmDialog(true);
    },
    [handleValidateAndProceed]
  );

  const handleConfirmedSubmit = useCallback(() => {
    const newTaskId = uuidv4();
    setTaskId(newTaskId);

    const formData = new FormData();
    formData.append("taskId", newTaskId);
    formData.append("authorId", "user123");  
    formData.append("courseId", "course456"); 

    sections.forEach((section) => {
      formData.append(section.id, section.content);
    });

    if (fetcher.state === "idle") {
      fetcher.submit(formData, { method: "post" });
    }

    setShowConfirmDialog(false);
  }, [sections, fetcher]);

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

  const updateSection = useCallback(
    (content: string, sectionId: string, errors?: string[]) => {
      setSections((prev) =>
        prev.map((section) =>
          section.id === sectionId ? { ...section, content } : section
        )
      );

      if (errors) {
        setLocalErrors((prev) => ({
          ...prev,
          [sectionId]: errors[0] || "",
        }));

        const contentLength = content.trim().length;
        let warning = "";

        switch (sectionId) {
          case "summary":
            if (contentLength < 50)
              warning = `建議摘要至少 50 字，目前 ${contentLength} 字`;
            break;
          case "reflection":
            if (contentLength < 100)
              warning = `建議反思至少 100 字，目前 ${contentLength} 字`;
            break;
          case "questions":
            if (contentLength < 30)
              warning = `建議問題至少 30 字，目前 ${contentLength} 字`;
            break;
        }

        setWarnings((prev) => ({
          ...prev,
          [sectionId]: warning,
        }));
      }
    },
    []
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
                disabled={disabled || status === "processing" || isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
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
            {sections.map((section) => (
              <SectionInput
                key={section.id}
                section={section}
                onChange={(content, id, errors) =>
                  updateSection(content, id, errors)
                }
                error={localErrors[section.id]}
                warning={warnings[section.id]}
              />
            ))}

            <div className="flex justify-end">
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

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md transition-all duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-bottom-[2%] data-[state=open]:slide-in-from-bottom-[2%] ">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              <AlertDialogTitle className="text-xl">
                確認提交作業
              </AlertDialogTitle>
            </div>

            <AlertDialogDescription className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-slate-700">
                  <FileText className="h-4 w-4" />
                  <span>提交以下內容：</span>
                </div>

                {sections.map((section) => (
                  <div key={section.id} className="ml-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">
                        {section.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 ml-6 mt-1 break-all whitespace-break-spaces ">
                      {section.content} 
                    </p>
                  </div>
                ))}
              </div>

            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              取消
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleConfirmedSubmit}
              disabled={disabled || status === "processing" || isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 min-w-[100px] justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  提交中
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  確認提交
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

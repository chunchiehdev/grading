import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  FeedbackData,
  GradingStatus,
  ValidationResult,
  Section,
} from "~/types/grading";
import { useActionData, useNavigation, useFetcher } from "@remix-run/react";
import { GradingStepper } from "./GradingStepper";
import { AssignmentInput } from "./AssignmentInput";
import { GradingProgress } from "./GradingProgress";
import { FeedbackDisplay } from "./FeedbackDisplay";
import { StatusSnackbar } from "./StatusSnackbar";
import { Card } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { cn } from "~/lib/utils";
import type { action } from "~/routes/assignments.grade";  // 調整路徑以匹配你的實際路由文件位置

type SnackbarSeverity = "success" | "error" | "info";

interface GradingContainerProps {
  sections: Section[]; // 新增，用於傳遞部分配置
  feedback?: FeedbackData;
  error?: string;
  validationErrors?: string[];
  status: GradingStatus; // 改為必需
  onValidationComplete?: (result: ValidationResult) => void;
  onRetry?: () => void;
  fetcher: ReturnType<typeof useFetcher<typeof action>>;  // 新增這行
}

interface Step {
  label: string;
  completed: boolean;
  status: "waiting" | "processing" | "completed" | "error";
  description: string;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
}

export function GradingContainer({
  sections, // 新增
  feedback,
  error,
  validationErrors = [],
  status,
  onValidationComplete,
  onRetry,
  fetcher,
}: GradingContainerProps) {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });

  // console.log("GradingContainer received props:", {
  //   status,
  //   feedback,
  //   error,
  //   validationErrors
  // });

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const steps: Step[] = useMemo(
    () => [
      {
        label: "輸入作業",
        completed: currentStep > 0,
        status: currentStep === 0 ? "processing" : "completed",
        description: "請輸入作業內容，包含摘要、反思和問題",
      },
      {
        label: "評分中",
        completed: currentStep > 1,
        status:
          status === "processing"
            ? "processing"
            : currentStep > 1
            ? "completed"
            : "waiting",
        description: "系統正在評估您的作業",
      },
      {
        label: "查看結果",
        completed: Boolean(feedback),
        status: feedback ? "completed" : "waiting",
        description: "查看評分結果和建議",
      },
    ],
    [currentStep, status, feedback]
  );

  useEffect(() => {
    if (error || validationErrors.length > 0) {
      const errorMessage = error || validationErrors.join(", ");
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
      if (status === "processing") {
        setCurrentStep(0);
      }
    }
  }, [error, validationErrors, status]);

  useEffect(() => {
    // console.log("Current status:", status);
    // console.log("Current feedback:", feedback);

    if (status === "processing") {
      setCurrentStep(1);
      setSnackbar({
        open: true,
        message: "開始評分...",
        severity: "info",
      });
    } else if (status === "completed" && feedback) {
      // console.log("Setting completed step with feedback");
      setCurrentStep(2);
      setSnackbar({
        open: true,
        message: "評分完成！",
        severity: "success",
      });
    } else if (status === "error") {
      setCurrentStep(0);
      setSnackbar({
        open: true,
        message: error || "評分過程發生錯誤",
        severity: "error",
      });
    }
  }, [status, feedback, error]);

  const handleValidation = useCallback(
    (result: ValidationResult) => {
      if (!result.isValid) {
        setSnackbar({
          open: true,
          message: result.errors.join(", "),
          severity: "error",
        });
      }
      onValidationComplete?.(result);
    },
    [onValidationComplete]
  );

  const handleSnackbarClose = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  const handleTransition = useCallback((isStart: boolean) => {
    setIsTransitioning(isStart);
  }, []);

  const handleRetry = useCallback(() => {
    setCurrentStep(0);
    onRetry?.();
  }, [onRetry]);

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <div className="flex flex-col space-y-6">
        <GradingStepper
          steps={steps}
          activeStep={currentStep}
          className={cn(
            "transition-opacity duration-300",
            isTransitioning && "opacity-50"
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="h-full shadow-lg">
              <AssignmentInput
                sections={sections} // 新增
                disabled={status === "processing" || status === "completed"}
                validationErrors={validationErrors}
                status={status}
                onValidation={handleValidation}
                className={cn(
                  "transition-all duration-300",
                  status === "processing" && "opacity-50 pointer-events-none"
                )}
                fetcher={fetcher}
              />
            </Card>
          </div>

          <div className="md:col-span-1">
            <Card
              className={cn(
                "h-full transition-all duration-300 shadow-lg",
                status === "processing" && "animate-pulse",
                isTransitioning && "opacity-50"
              )}
              onAnimationStart={() => handleTransition(true)}
              onAnimationEnd={() => handleTransition(false)}
            >
              {status === "processing" ? (
                <GradingProgress status={status} className="p-6" />
              ) : (
                <FeedbackDisplay
                  feedback={feedback}
                  variant={feedback ? "accordion" : undefined}
                  className="p-6"
                />
              )}
            </Card>
          </div>
        </div>

        {(error || validationErrors.length > 0) && (
          <Alert
            variant="destructive"
            className="animate-in fade-in slide-in-from-top-1"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex justify-between items-center">
              <span>{error || validationErrors.join(", ")}</span>
              {onRetry && (
                <button
                  onClick={handleRetry}
                  className="text-sm underline hover:no-underline"
                >
                  重試
                </button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <StatusSnackbar
          open={snackbar.open}
          message={snackbar.message}
          severity={snackbar.severity}
          onClose={handleSnackbarClose}
          autoHideDuration={6000}
        />
      </div>
    </div>
  );
}

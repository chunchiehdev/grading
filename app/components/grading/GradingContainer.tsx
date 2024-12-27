//GradingContainer.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { CompactFileUpload } from "./CompactFileUpload";
import { Card } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Download, AlertCircle, RefreshCcw, CheckCircle } from "lucide-react";
import { cn } from "~/lib/utils";
import type { action } from "~/routes/assignments.grade";
import { AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";

type SnackbarSeverity = "success" | "error" | "info";

interface GradingContainerProps {
  sections: Section[];
  feedback?: FeedbackData;
  error?: string;
  validationErrors?: string[];
  status: GradingStatus;
  gradingProgress: number;
  gradingPhase: string;
  gradingMessage: string;
  onValidationComplete?: (result: ValidationResult) => void;
  onRetry?: () => void;
  fetcher: ReturnType<typeof useFetcher<typeof action>>;
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
  sections,
  feedback,
  error,
  validationErrors = [],
  status,
  gradingProgress,
  gradingPhase,
  gradingMessage,
  onValidationComplete,
  onRetry,
  fetcher,
}: GradingContainerProps) {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [mode, setMode] = useState<"editing" | "submitted">("editing");
  const completionShown = useRef(false);
  const lastMessage = useRef("");
  const [isEditing, setIsEditing] = useState(false);

  const handleEditMode = () => {
    setIsEditing(true);
    setMode("editing");
  };

  const handleReset = useCallback(() => {
    setMode("editing");
    setCurrentStep(0);
    completionShown.current = false;
    lastMessage.current = "";

    fetcher.data = undefined;

    if (onRetry) {
      onRetry();
    }
  }, [onRetry, fetcher]);

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

  const handleDownload = useCallback(() => {
    if (!feedback) return;

    const content = {
      feedback,
      timestamp: new Date().toISOString(),
      sections: sections.map((section) => ({
        title: section.title,
        content: section.content,
      })),
    };

    const blob = new Blob([JSON.stringify(content, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feedback-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [feedback, sections]);

  useEffect(() => {
    const currentMessage =
      error ||
      (validationErrors.length > 0 ? validationErrors.join(", ") : null) ||
      (status === "processing" ? gradingMessage : null);

    if (currentMessage && currentMessage !== lastMessage.current) {
      lastMessage.current = currentMessage;

      if (error || validationErrors.length > 0) {
        setSnackbar({
          open: true,
          message: error || validationErrors.join(", "),
          severity: "error",
        });
      } else if (status === "processing" && !feedback) {
        setSnackbar({
          open: true,
          message: gradingMessage || "開始評分...",
          severity: "info",
        });
      }

      if (status === "completed" && feedback && !completionShown.current) {
        completionShown.current = true;
        setMode("submitted");
        setSnackbar({
          open: true,
          message: "評分完成！",
          severity: "success",
        });
      }
    }
  }, [status, error, validationErrors, feedback, gradingMessage]);

  useEffect(() => {
    if (status === "processing") {
      setCurrentStep(1);
    } else if (status === "completed" && feedback) {
      setCurrentStep(2);
      setMode("submitted");
    } else if (status === "error") {
      setCurrentStep(0);
    }
  }, [status, feedback]);

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

        <div className="w-full mb-2">
          <Card className="shadow-sm bg-white">
            <div className="p-4">
              <CompactFileUpload
                maxFiles={3}
                maxFileSize={5 * 1024 * 1024} 
                acceptedFileTypes={[".pdf", ".doc"]}
                onFilesChange={(files) => console.log("Files changed:", files)}
                onUploadComplete={() => console.log("Upload complete")}
                onError={(error) => console.error("Upload error:", error)}
              />{" "}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card
              className={cn(
                "h-full shadow-lg",
                mode === "submitted" && "bg-gray-50"
              )}
            >
              {mode === "submitted" && status === "completed" && (
                <div className="p-4 border-b border-gray-200">
                  <Alert variant="default">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>評分完成</AlertTitle>
                    <AlertDescription>
                      您可以查看右側的評分結果，或點擊下方按鈕開始新的提交。
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              <AssignmentInput
                sections={sections}
                disabled={status === "processing" && !isEditing}
                validationErrors={validationErrors}
                status={status}
                onValidation={handleValidation}
                className={cn(
                  "transition-all duration-300",
                  status === "processing" && "opacity-50 pointer-events-none"
                )}
                fetcher={fetcher}
                onBack={() => handleEditMode()}
              />

              {mode === "submitted" && status === "completed" && (
                <div className="p-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="gap-2"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      開始新的提交
                    </Button>
                    {feedback && (
                      <Button
                        variant="secondary"
                        onClick={handleDownload}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        下載評分結果
                      </Button>
                    )}
                  </div>
                </div>
              )}
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
              {status === "processing" || fetcher.state === "submitting" ? (
                <GradingProgress
                  status={status}
                  initialProgress={gradingProgress}
                  phase={gradingPhase}
                  message={gradingMessage}
                  className="p-6"
                />
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

        {/* <StatusSnackbar
          open={snackbar.open}
          message={snackbar.message}
          severity={snackbar.severity}
          onClose={handleSnackbarClose}
          autoHideDuration={6000}
        /> */}
      </div>
    </div>
  );
}

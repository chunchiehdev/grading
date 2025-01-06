//GradingContainer.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type {
  FeedbackData,
  GradingStatus,
  ValidationResult,
  Section,
} from "@/types/grading";
import { useActionData, useNavigation, useFetcher } from "@remix-run/react";
import { GradingStepper } from "./GradingStepper";
import { AssignmentInput } from "./AssignmentInput";
import { GradingProgress } from "./GradingProgress";
import { FeedbackDisplay } from "./FeedbackDisplay";
import { StatusSnackbar } from "./StatusSnackbar";
import { CompactFileUpload } from "./CompactFileUpload";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  AlertCircle,
  RefreshCcw,
  CheckCircle,
  Loader2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { action } from "@/routes/assignments.grade.$taskId";
import { AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);
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
        label: "上傳閱讀文本",
        completed: hasUploadedFiles,
        status:
          currentStep === 0
            ? "processing"
            : hasUploadedFiles
            ? "completed"
            : "waiting",
        description: "請上傳閱讀文本",
      },
      {
        label: "輸入作業",
        completed: currentStep > 1,
        status:
          currentStep === 1
            ? "processing"
            : currentStep > 1
            ? "completed"
            : "waiting",
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
      setCurrentStep(2);
    } else if (status === "completed" && feedback) {
      setCurrentStep(3);
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
    <div className="container mx-auto px-4 pb-16 max-w-7xl">
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
          <Card>
            <div className="p-4">
              <CompactFileUpload
                maxFiles={3}
                maxFileSize={100 * 1024 * 1024}
                acceptedFileTypes={[".pdf", ".doc"]}
                onFilesChange={(files) => {
                  setHasUploadedFiles(files.length > 0);
                  if (files.length === 0) {
                    setCurrentStep(0);
                  }
                }}
                onUploadComplete={() => {
                  console.log("Upload complete");
                  setCurrentStep(1);
                }}
                onError={(error) => {
                  console.error("Upload error:", error);
                  setHasUploadedFiles(false);
                }}
              />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            {/* <div className="p-4 border-b border-gray-100 bg-gray-50">
                <CompactFileUpload
                  maxFiles={3}
                  maxFileSize={5 * 1024 * 1024}
                  acceptedFileTypes={[".pdf", ".doc"]}
                  onFilesChange={(files) =>
                    console.log("Files changed:", files)
                  }
                  onUploadComplete={() => console.log("Upload complete")}
                  onError={(error) => console.error("Upload error:", error)}
                />
              </div> */}

            <AssignmentInput
              sections={sections}
              disabled={status === "processing" && !isEditing}
              validationErrors={validationErrors}
              status={status}
              onValidation={handleValidation}
              className={cn(
                "transition-all duration-300",
                (!hasUploadedFiles || status === "processing") &&
                  "opacity-50 pointer-events-none"
              )}
              fetcher={fetcher}
              onBack={() => handleEditMode()}
            />
            {mode === "submitted" && status === "completed" && (
              <div className="p-4 bg-accent border-b border-border">
                <Alert variant="default">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <AlertTitle>評分完成</AlertTitle>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="gap-2 ml-4"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      開始新的提交
                    </Button>
                  </div>
                </Alert>
              </div>
            )}
          </div>
          {/* <div className="md:col-span-1">
            <Card
              className={cn(
                "h-full transition-all duration-300 shadow-lg",
                status === "processing" && "animate-pulse",
                isTransitioning && "opacity-50"
              )}
            >
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-medium flex items-center gap-2 text-gray-700">
                  {status === "processing" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      評分進行中
                    </>
                  ) : feedback ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      評分結果
                    </>
                  ) : (
                    <>
                      <Info className="h-4 w-4" />
                      等待提交
                    </>
                  )}
                </h3>
              </div>

              <div className="p-4">
                {status === "processing" || fetcher.state === "submitting" ? (
                  <GradingProgress
                    status={status}
                    initialProgress={gradingProgress}
                    phase={gradingPhase}
                    message={gradingMessage}
                    className="space-y-4"
                  />
                ) : (
                  <FeedbackDisplay
                    feedback={feedback}
                    variant={feedback ? "accordion" : undefined}
                    className="space-y-4"
                  />
                )}
              </div>

              {feedback && (
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                  <Button
                    variant="outline"
                    onClick={handleDownload}
                    className="w-full gap-2"
                  >
                    <Download className="h-4 w-4" />
                    下載評分結果
                  </Button>
                </div>
              )}
            </Card>
          </div> */}
          <Card className="h-full">
            <div className="p-4">
              {status === "processing" || fetcher.state === "submitting" ? (
                <GradingProgress
                  status={status}
                  initialProgress={gradingProgress}
                  phase={gradingPhase}
                  message={gradingMessage}
                  className="space-y-4"
                />
              ) : (
                <FeedbackDisplay
                  feedback={feedback}
                  variant={feedback ? "accordion" : undefined}
                  className="space-y-4"
                />
              )}

              {feedback && (
                <div className="p-4 border-t border-border bg-accent">
                  <Button
                    variant="outline"
                    onClick={handleDownload}
                    className="w-full gap-2"
                  >
                    <Download className="h-4 w-4" />
                    下載評分結果
                  </Button>
                </div>
              )}
            </div>
          </Card>
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

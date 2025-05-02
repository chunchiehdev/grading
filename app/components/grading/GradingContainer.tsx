// GradingContainer.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FeedbackData, GradingStatus, ValidationResult, Section } from '@/types/grading';
import { useFetcher } from 'react-router';
import { GradingStepper } from './GradingStepper';
import { AssignmentInput } from './AssignmentInput';
import { GradingProgress } from './GradingProgress';
import FeedbackDisplay from './FeedbackDisplay';
import { CompactFileUpload } from './CompactFileUpload';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, AlertCircle, RefreshCcw, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { action } from '@/routes/assignments.grade.$taskId';
import { Button } from '@/components/ui/button';
import type { UploadedFileInfo } from '@/types/files';

type SnackbarSeverity = 'success' | 'error' | 'info';

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
  status: 'waiting' | 'processing' | 'completed' | 'error';
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
  const [_snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [mode, setMode] = useState<'editing' | 'submitted'>('editing');
  const completionShown = useRef(false);
  const lastMessage = useRef('');
  const [isEditing, setIsEditing] = useState(false);
  const [_uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const processingFetcher = useFetcher();

  const handleEditMode = () => {
    setIsEditing(true);
    setMode('editing');
  };

  const handleReset = useCallback(() => {
    window.location.reload();
    setMode('editing');
    setCurrentStep(0);
    completionShown.current = false;
    lastMessage.current = '';

    fetcher.data = undefined;

    if (onRetry) {
      onRetry();
    }
  }, [onRetry, fetcher]);

  const steps: Step[] = useMemo(
    () => [
      {
        label: '上傳閱讀文本',
        completed: hasUploadedFiles,
        status: currentStep === 0 ? 'processing' : hasUploadedFiles ? 'completed' : 'waiting',
        description: '請上傳閱讀文本',
      },
      {
        label: '輸入作業',
        completed: status === 'processing' || status === 'completed',
        status:
          status === 'processing' || status === 'completed'
            ? 'completed'
            : currentStep === 1
              ? 'processing'
              : 'waiting',
        description: '請輸入作業內容，包含摘要、反思和問題',
      },
      {
        label: '評分中',
        completed: status === 'completed',
        status: status === 'processing' ? 'processing' : status === 'completed' ? 'completed' : 'waiting',
        description: '系統正在評估您的作業',
      },
      {
        label: '查看結果',
        completed: Boolean(feedback),
        status: feedback ? 'completed' : 'waiting',
        description: '查看評分結果和建議',
      },
    ],
    [currentStep, status, feedback, hasUploadedFiles]
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
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
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
      (validationErrors.length > 0 ? validationErrors.join(', ') : null) ||
      (status === 'processing' ? gradingMessage : null);

    if (currentMessage && currentMessage !== lastMessage.current) {
      lastMessage.current = currentMessage;

      if (error || validationErrors.length > 0) {
        setSnackbar({
          open: true,
          message: error || validationErrors.join(', '),
          severity: 'error',
        });
      } else if (status === 'processing' && !feedback) {
        setSnackbar({
          open: true,
          message: gradingMessage || '開始評分...',
          severity: 'info',
        });
      }

      if (status === 'completed' && feedback && !completionShown.current) {
        completionShown.current = true;
        setMode('submitted');
        setSnackbar({
          open: true,
          message: '評分完成！',
          severity: 'success',
        });
      }
    }
  }, [status, error, validationErrors, feedback, gradingMessage]);

  useEffect(() => {
    if (status === 'processing') {
      setCurrentStep(2);
    } else if (status === 'completed' && feedback) {
      setCurrentStep(3);
      setMode('submitted');
    } else if (status === 'error') {
      setCurrentStep(0);
    }
  }, [status, feedback]);

  const handleValidation = useCallback(
    (result: ValidationResult) => {
      if (!result.isValid) {
        setSnackbar({
          open: true,
          message: result.errors.join(', '),
          severity: 'error',
        });
      }
      onValidationComplete?.(result);
    },
    [onValidationComplete]
  );

  const handleFileChange = useCallback((files: Array<File>) => {
    const hasFiles = files.length > 0;
    setHasUploadedFiles(hasFiles);

    if (hasFiles) {
      setCurrentStep(1);
    } else {
      setCurrentStep(0);
    }
  }, []);

  const callProcessUploadedFiles = useCallback(
    async (files: UploadedFileInfo[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', JSON.stringify(file));
      });

      processingFetcher.submit(formData, {
        method: 'POST',
        action: '/api/process-documents',
      });
    },
    [processingFetcher]
  );

  const handleUploadComplete = useCallback(
    (files?: UploadedFileInfo[]) => {
      if (!files || files.length === 0) return;

      console.log('Uploaded Complete', files);
      setUploadedFiles(files);
      setHasUploadedFiles(true);
      setCurrentStep(1);

      processingFetcher.submit(
        { files: JSON.stringify(files) },
        {
          method: 'post',
          action: '/api/process-documents',
          encType: 'application/json',
        }
      );
      callProcessUploadedFiles(files);
    },
    [callProcessUploadedFiles, processingFetcher]
  );

  const _handleSnackbarClose = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  const _handleTransition = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, []);

  const handleRetry = useCallback(() => {
    setCurrentStep(0);
    onRetry?.();
  }, [onRetry]);

  useEffect(() => {
    if (processingFetcher.data?.success) {
      setHasUploadedFiles(true);
    }
  }, [processingFetcher.data, callProcessUploadedFiles]);

  return (
    <div className="container mx-auto px-4 pb-16 max-w-7xl">
      <div className="flex flex-col space-y-6">
        <GradingStepper
          steps={steps}
          activeStep={currentStep}
          className={cn('transition-opacity duration-300', isTransitioning && 'opacity-50')}
        />

        <div className="w-full mb-2">
          <Card>
            <div className="p-4">
              <CompactFileUpload
                maxFiles={3}
                maxFileSize={100 * 1024 * 1024}
                acceptedFileTypes={['.pdf', '.doc']}
                onFilesChange={handleFileChange}
                onUploadComplete={handleUploadComplete}
                onError={(error) => {
                  console.error('Upload error:', error);
                  setHasUploadedFiles(false);
                }}
              />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className={cn((!hasUploadedFiles || status === 'processing') && 'cursor-not-allowed')}>
              <AssignmentInput
                sections={sections}
                disabled={status === 'processing' && !isEditing}
                validationErrors={validationErrors}
                status={status}
                onValidation={handleValidation}
                className={cn(
                  'transition-all duration-300',
                  (!hasUploadedFiles || status === 'processing') && 'opacity-50 pointer-events-none'
                )}
                fetcher={fetcher}
                onBack={() => handleEditMode()}
              />
            </div>
            {mode === 'submitted' && status === 'completed' && (
              <div className="p-4 bg-accent border-b border-border">
                <Alert variant="default">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <AlertTitle>評分完成</AlertTitle>
                    </div>
                    <Button variant="outline" onClick={handleReset} className="gap-2 ml-4">
                      <RefreshCcw className="h-4 w-4" />
                      開始新的提交
                    </Button>
                  </div>
                </Alert>
              </div>
            )}
          </div>
          <Card className="h-full">
            <div className="p-4">
              {status === 'processing' || fetcher.state === 'submitting' ? (
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
                  variant={feedback ? 'accordion' : undefined}
                  className="space-y-4"
                />
              )}

              {feedback && (
                <div className="p-4 border-t border-border bg-accent">
                  <Button variant="outline" onClick={handleDownload} className="w-full gap-2">
                    <Download className="h-4 w-4" />
                    下載評分結果
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {(error || validationErrors.length > 0) && (
          <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex justify-between items-center">
              <span>{error || validationErrors.join(', ')}</span>
              {onRetry && (
                <button onClick={handleRetry} className="text-sm underline hover:no-underline">
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

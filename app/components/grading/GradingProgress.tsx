import { useState, useEffect, useCallback } from "react";
import { Progress } from "~/components/ui/progress";
import { Search, PenLine, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import type { GradingStatus, GradingProgress as GradingProgressType } from "~/types/grading";
import { cn } from "~/lib/utils";

interface GradingProgressProps {
  status: GradingStatus;  // 改為必需
  className?: string;
  onStepComplete?: (step: number) => void;
  onProgressUpdate?: (progress: GradingProgressType) => void;  // 新增
}

interface GradingStep {
  id: string;
  label: string;
  icon: typeof Search;
  description: string;
  progressText: string;
  estimatedTime: number;  // 秒
}

const GRADING_STEPS: GradingStep[] = [
  {
    id: "check",
    label: "檢查輸入",
    icon: Search,
    description: "正在檢查作業格式與內容完整性...",
    progressText: "檢查中...",
    estimatedTime: 3
  },
  {
    id: "grade",
    label: "批改作業",
    icon: PenLine,
    description: "正在進行作業評分與分析...",
    progressText: "批改中...",
    estimatedTime: 10
  },
  {
    id: "verify",
    label: "檢查過程",
    icon: CheckCircle2,
    description: "正在驗證評分結果...",
    progressText: "驗證中...",
    estimatedTime: 2
  },
];

export function GradingProgress({ 
  status,
  className,
  onStepComplete,
  onProgressUpdate
}: GradingProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const totalEstimatedTime = GRADING_STEPS.reduce(
    (acc, step) => acc + step.estimatedTime,
    0
  );

  const updateProgress = useCallback((stepIndex: number, stepProgress: number) => {
    const previousStepsWeight = stepIndex * (100 / GRADING_STEPS.length);
    const currentStepWeight = (stepProgress / 100) * (100 / GRADING_STEPS.length);
    const totalProgress = previousStepsWeight + currentStepWeight;
    
    setProgress(totalProgress);

    // 更新進度並通知父組件
    if (onProgressUpdate) {
      onProgressUpdate({
        percentage: totalProgress,
        currentStep: GRADING_STEPS[currentStep].label,
        estimatedTimeLeft: timeRemaining || undefined
      });
    }
  }, [currentStep, timeRemaining, onProgressUpdate]);

  useEffect(() => {
    if (status === 'error') {
      setError('評分過程發生錯誤，請稍後再試');
      return;
    }

    if (status !== 'processing') return;

    const currentStepData = GRADING_STEPS[currentStep];
    let stepProgress = 0;
    let startTime = Date.now();

    const timer = setInterval(() => {
      const elapsedTime = (Date.now() - startTime) / 1000;
      stepProgress = Math.min(
        100,
        (elapsedTime / currentStepData.estimatedTime) * 100
      );

      updateProgress(currentStep, stepProgress);

      // 更新剩餘時間
      const totalProgress = (currentStep * 100 + stepProgress) / GRADING_STEPS.length;
      const estimatedTotalTime = (totalEstimatedTime * 100) / totalProgress;
      const remaining = Math.max(0, Math.ceil(estimatedTotalTime - elapsedTime));
      setTimeRemaining(remaining);

      if (stepProgress >= 100) {
        if (currentStep < GRADING_STEPS.length - 1) {
          setCurrentStep(prev => prev + 1);
          startTime = Date.now();
          onStepComplete?.(currentStep);
        } else {
          clearInterval(timer);
        }
      }
    }, 100);

    return () => clearInterval(timer);
  }, [currentStep, status, totalEstimatedTime, updateProgress, onStepComplete]);

  const CurrentStepIcon = GRADING_STEPS[currentStep]?.icon || Search;

  return (
    <div className={cn("w-full p-6", className)}>
      {error ? (
        <div className="flex flex-col items-center justify-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500" />
          <p className="text-red-500 font-medium">{error}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <CurrentStepIcon className="w-6 h-6 text-blue-600" />
                {status === 'processing' && (
                  <Loader2 className="w-6 h-6 text-blue-600 absolute top-0 left-0 animate-spin opacity-50" />
                )}
              </div>
              <h3 className="text-lg font-semibold">
                {GRADING_STEPS[currentStep]?.label || '準備中'}
              </h3>
            </div>
            {timeRemaining !== null && (
              <span className="text-sm text-gray-500">
                預估剩餘時間: {timeRemaining}秒
              </span>
            )}
          </div>

          <p className="text-gray-600 mb-4">
            {GRADING_STEPS[currentStep]?.description || '正在初始化...'}
          </p>

          <div className="space-y-2">
            <Progress 
              value={progress} 
              className="h-2"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{Math.round(progress)}%</span>
              <span>{GRADING_STEPS[currentStep]?.progressText || '處理中...'}</span>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            {GRADING_STEPS.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center space-y-2",
                  index <= currentStep ? "text-blue-600" : "text-gray-400"
                )}
              >
                <step.icon className="w-5 h-5" />
                <span className="text-xs text-center">{step.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
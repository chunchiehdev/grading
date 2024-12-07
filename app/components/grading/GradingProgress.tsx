// app/components/grading/GradingProgress.tsx
import { useState, useEffect } from "react";
import * as Progress from "@radix-ui/react-progress";
import { 
  MagnifyingGlassIcon, 
  Pencil2Icon, 
  CheckCircledIcon 
} from "@radix-ui/react-icons";

const GRADING_STEPS = [
  {
    label: "檢查輸入",
    icon: MagnifyingGlassIcon,
    description: "正在檢查作業格式與內容完整性...",
    progressText: "檢查中...",
  },
  {
    label: "批改作業",
    icon: Pencil2Icon,
    description: "正在進行作業評分與分析...",
    progressText: "批改中...",
  },
  {
    label: "檢查過程",
    icon: CheckCircledIcon,
    description: "正在驗證評分結果...",
    progressText: "驗證中...",
  },
] as const;

export function GradingProgress() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        const newProgress = oldProgress + Math.random() * 10;
        if (newProgress >= 100) {
          if (currentStep < GRADING_STEPS.length - 1) {
            setCurrentStep(step => step + 1);
            return 0;
          }
          clearInterval(timer);
          return 100;
        }
        return newProgress;
      });
    }, 500);

    return () => clearInterval(timer);
  }, [currentStep]);

  const StepIcon = GRADING_STEPS[currentStep].icon;

  return (
    <div className="w-full p-6">
      <div className="flex items-center mb-4">
        <StepIcon className="w-6 h-6 text-blue-600 mr-3" />
        <h3 className="text-lg font-semibold">
          {GRADING_STEPS[currentStep].label}
        </h3>
      </div>

      <p className="text-gray-600 mb-4">
        {GRADING_STEPS[currentStep].description}
      </p>

      <Progress.Root
        className="relative overflow-hidden bg-gray-200 rounded-full w-full h-2"
        style={{ transform: 'translateZ(0)' }}
        value={progress}
      >
        <Progress.Indicator
          className="bg-blue-600 w-full h-full transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${100 - progress}%)` }}
        />
      </Progress.Root>

      <p className="text-sm text-gray-500 text-center mt-2">
        {GRADING_STEPS[currentStep].progressText}
      </p>
    </div>
  );
}
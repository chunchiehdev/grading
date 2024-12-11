import { cn } from "~/lib/utils";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

interface Step {
  label: string;
  completed: boolean;
  status: 'waiting' | 'processing' | 'completed' | 'error';
  description: string;
  errorMessage?: string;
}

interface GradingStepperProps {
  steps: Step[];  // 改為必需
  activeStep: number;
  className?: string;
  showDetails?: boolean;
}

type StepStyleConfig = {
  icon: JSX.Element | string;
  containerStyle: string;
  connectorStyle: string;
};


export function GradingStepper({ 
  steps,
  activeStep,
  className,
  showDetails = false,
}: GradingStepperProps) {
  // 獲取步驟狀態的樣式配置
  const getStepConfig = (step: Step, index: number): StepStyleConfig => {
    const configs: Record<Step['status'], (isActive: boolean) => StepStyleConfig> = {
      error: () => ({
        icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
        containerStyle: "border-red-500 bg-red-50 text-red-500",
        connectorStyle: "bg-red-500"
      }),
      completed: () => ({
        icon: <Check className="w-5 h-5" />,
        containerStyle: "border-emerald-600 bg-emerald-50 text-emerald-600",
        connectorStyle: "bg-emerald-600"
      }),
      processing: (isActive) => ({
        icon: isActive ? <Loader2 className="w-5 h-5 animate-spin" /> : String(index + 1),
        containerStyle: isActive 
          ? "border-slate-800 bg-slate-800 text-white"
          : "border-slate-200 bg-white text-slate-400",
        connectorStyle: isActive ? "bg-slate-800" : "bg-slate-200"
      }),
      waiting: (isActive) => ({
        icon: String(index + 1),
        containerStyle: isActive 
          ? "border-slate-800 bg-slate-800 text-white"
          : "border-slate-200 bg-white text-slate-400",
        connectorStyle: isActive ? "bg-slate-800" : "bg-slate-200"
      })
    };

    const isActive = index === activeStep;
    return configs[step.status](isActive);
  };

  return (
    <div className={cn("px-4 font-serif", className)}>
      <ol className="flex items-center w-full justify-between">
        {steps.map((step, index) => {
          const config = getStepConfig(step, index);
          
          return (
            <li
              key={step.label}
              className={cn(
                "flex items-center",
                index < steps.length - 1 ? "flex-1" : "flex-initial"
              )}
            >
              <div className="flex flex-col items-center relative">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                          config.containerStyle
                        )}
                        role="status"
                        aria-current={index === activeStep ? "step" : undefined}
                      >
                        {typeof config.icon === 'string' 
                          ? <span className="italic">{config.icon}</span>
                          : config.icon}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{step.description}</p>
                      {step.status === 'error' && step.errorMessage && (
                        <p className="text-red-500">{step.errorMessage}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="mt-3 space-y-1">
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors duration-300 whitespace-nowrap",
                      index <= activeStep ? "text-slate-800" : "text-slate-400"
                    )}
                  >
                    {step.label}
                  </span>
                  {showDetails && (
                    <p className="text-xs text-slate-500">{step.description}</p>
                  )}
                </div>
              </div>

              {index < steps.length - 1 && (
                <div 
                  className="flex-1 mx-4"
                  role="presentation"
                >
                  <div
                    className={cn(
                      "h-[2px] transition-all duration-300",
                      config.connectorStyle
                    )}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
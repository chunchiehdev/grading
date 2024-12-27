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
  status: "waiting" | "processing" | "completed" | "error";
  description: string;
  errorMessage?: string;
}

interface GradingStepperProps {
  steps: Step[];
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
  const getStepConfig = (step: Step, index: number): StepStyleConfig => {
    const configs: Record<
      Step["status"],
      (isActive: boolean) => StepStyleConfig
    > = {
      error: () => ({
        icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
        containerStyle:
          "border-red-500 bg-red-50 text-red-500 shadow-sm shadow-red-100",
        connectorStyle: "bg-red-500",
      }),
      completed: () => ({
        icon: <Check className="w-5 h-5" />,
        containerStyle:
          "border-emerald-600 bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-100",
        connectorStyle: "bg-emerald-600",
      }),
      processing: (isActive) => ({
        icon: (
          <div
            className="relative flex items-center justify-center h-10 w-10"
            role="status"
            aria-busy="true"
          >
            <span className="absolute inset-0 animate-ping rounded-full bg-blue-300 opacity-50" />
            <span className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-pulse" />
            <Loader2 className="relative h-5 w-5 animate-spin text-blue-500" />
          </div>
        ),
        containerStyle: isActive
          ? "border-blue-600 bg-blue-100 text-blue-800 ring-4 ring-blue-50"
          : "border-gray-300 bg-gray-50 text-gray-500",
        connectorStyle: isActive ? "bg-blue-600" : "bg-gray-300",
      }),
      waiting: (isActive) => ({
        icon: String(index + 1),
        containerStyle: isActive
          ? "border-slate-800 bg-slate-800 text-white ring-2 ring-slate-100"
          : "border-slate-200 bg-white text-slate-400",
        connectorStyle: isActive ? "bg-slate-800" : "bg-slate-200",
      }),
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
                        {typeof config.icon === "string" ? (
                          <span className="italic">{config.icon}</span>
                        ) : (
                          config.icon
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{step.description}</p>
                      {step.status === "error" && step.errorMessage && (
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
                <div className="flex-1 mx-4" role="presentation">
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

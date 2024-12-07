import { cn } from "~/lib/utils";
import { Check } from "lucide-react";

const MAIN_STEPS = ["輸入作業", "評分中", "查看結果"];

interface GradingStepperProps {
  activeStep: number;
}

export function GradingStepper({ activeStep }: GradingStepperProps) {
  return (
    <div className="mb-12 px-4 font-serif">
      <ol className="flex items-center w-full justify-between">
        {MAIN_STEPS.map((step, index) => (
          <li
            key={step}
            className={cn(
              "flex items-center",
              index < MAIN_STEPS.length - 1 ? "flex-1" : "flex-initial"
            )}
          >
            <div className="flex flex-col items-center relative">
              <span
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                  index < activeStep
                    ? "border-emerald-600 bg-emerald-50 text-emerald-600"
                    : index === activeStep
                    ? "border-slate-800 bg-slate-800 text-white"
                    : "border-slate-200 bg-white text-slate-400"
                )}
              >
                {index < activeStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="italic">{index + 1}</span>
                )}
              </span>
              <span
                className={cn(
                  "mt-3 text-sm font-medium transition-colors duration-300 whitespace-nowrap",
                  index <= activeStep ? "text-slate-800" : "text-slate-400"
                )}
              >
                {step}
              </span>
            </div>
            {index < MAIN_STEPS.length - 1 && (
              <div className="flex-1 mx-4">
                <div
                  className={cn(
                    "h-[2px] transition-all duration-300",
                    index < activeStep
                      ? "bg-emerald-600"
                      : index === activeStep
                      ? "bg-slate-800"
                      : "bg-slate-200"
                  )}
                />
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

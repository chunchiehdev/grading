import { cn } from '@/lib/utils';
import { Check, Loader2, AlertTriangle } from 'lucide-react';
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Step {
  label: string;
  completed: boolean;
  status: 'waiting' | 'processing' | 'completed' | 'error';
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
  icon: React.ReactNode | string;
  containerStyle: string;
  connectorStyle: string;
};

export function GradingStepper({ steps, activeStep, className, showDetails = false }: GradingStepperProps) {
  const getStepConfig = (step: Step, index: number): StepStyleConfig => {
    const configs: Record<Step['status'], (isActive: boolean) => StepStyleConfig> = {
      error: () => ({
        icon: <AlertTriangle className="w-5 h-5 text-destructive" />,
        containerStyle: 'border-destructive bg-destructive/10 text-destructive-foreground shadow-sm shadow-red-100',
        connectorStyle: 'bg-destructive',
      }),
      completed: () => ({
        icon: <Check className="w-5 h-5" />,
        containerStyle: 'border-emerald-600 bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-100',
        connectorStyle: 'bg-emerald-600',
      }),
      processing: (isActive) => ({
        icon: (
          <div className="relative flex items-center justify-center h-10 w-10" role="status" aria-busy="true">
            <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-50" />
            <span className="absolute inset-0 rounded-full bg-accent opacity-30 animate-pulse" />
            <Loader2 className="relative h-5 w-5 animate-spin text-accent-foreground" />
          </div>
        ),
        containerStyle: isActive
          ? cn('border-accent bg-accent/20 text-accent-foreground ring-4 ring-accent/20')
          : cn('border-muted bg-muted text-muted-foreground'),
        connectorStyle: isActive ? 'bg-accent' : 'bg-muted',
      }),
      waiting: (isActive) => ({
        icon: String(index + 1),
        containerStyle: isActive
          ? cn('border-secondary bg-secondary text-secondary-foreground ring-2 ring-secondary/50')
          : cn('border-border bg-background text-muted-foreground'),
        connectorStyle: isActive ? 'bg-secondary' : 'bg-border',
      }),
    };

    const isActive = index === activeStep;
    return configs[step.status](isActive);
  };

  return (
    <div className={cn('px-4 font-serif', className)}>
      <ol className="flex items-center w-full justify-between">
        {steps.map((step, index) => {
          const config = getStepConfig(step, index);

          return (
            <li
              key={step.label}
              className={cn('flex items-center', index < steps.length - 1 ? 'flex-1' : 'flex-initial')}
            >
              <div className="flex flex-col items-center relative">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300',
                          config.containerStyle
                        )}
                        role="status"
                        aria-current={index === activeStep ? 'step' : undefined}
                      >
                        {typeof config.icon === 'string' ? <span className="italic">{config.icon}</span> : config.icon}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover text-popover-foreground border-border">
                      <p>{step.description}</p>
                      {step.status === 'error' && step.errorMessage && (
                        <p className="text-destructive">{step.errorMessage}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="mt-3 space-y-1">
                  <span
                    className={cn(
                      'text-sm font-medium transition-colors duration-300 whitespace-nowrap',
                      index <= activeStep ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                  {showDetails && <p className="text-xs text-muted-foreground">{step.description}</p>}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4" role="presentation">
                  <div className={cn('h-[2px] transition-all duration-300', config.connectorStyle)} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

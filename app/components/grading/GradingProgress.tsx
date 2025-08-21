// GradingProgress.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import { Search, PenLine, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { GradingStatus, GradingProgress as GradingProgressType } from '@/types/rubric';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface GradingProgressProps {
  phase: 'check' | 'grade' | 'verify' | 'completed' | 'error';
  className?: string;
  initialProgress?: number; 
  message?: string; 

  onStepComplete?: (step: number) => void;
  onProgressUpdate?: (progress: GradingProgressType) => void;
}

interface GradingStep {
  id: string;
  label: string;
  icon: typeof Search;
  description: string;
  progressText: string;
  estimatedTime: number;
}


export function GradingProgress({
  initialProgress = 0,
  phase = 'check',
  message,
  // Add translation hook
}) {
  const { t } = useTranslation('grading');
  
  const GRADING_STEPS: GradingStep[] = [
    {
      id: 'check',
      label: t('gradingProgress.phases.check.title'),
      icon: Search,
      description: t('gradingProgress.phases.check.description'),
      progressText: t('gradingProgress.phases.check.status'),
      estimatedTime: 3,
    },
    {
      id: 'grade',
      label: t('gradingProgress.phases.grade.title'),
      icon: PenLine,
      description: t('gradingProgress.phases.grade.description'),
      progressText: t('gradingProgress.phases.grade.status'),
      estimatedTime: 10,
    },
    {
      id: 'verify',
      label: t('gradingProgress.phases.verify.title'),
      icon: CheckCircle2,
      description: t('gradingProgress.phases.verify.description'),
      progressText: t('gradingProgress.phases.verify.status'),
      estimatedTime: 2,
    },
  ];

  className,
  onStepComplete,
  onProgressUpdate,
}: GradingProgressProps) {
  const [currentStep, setCurrentStep] = useState(() => {
    return GRADING_STEPS.findIndex((step) => step.id === phase) || 0;
  });
  const [error, setError] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);

  const springProgress = useSpring(0, {
    stiffness: 120,
    damping: 14,
  });

  useEffect(() => {
    if (phase === 'check' || phase === 'grade' || phase === 'verify') {
      springProgress.set(initialProgress);

      const unsubscribe = springProgress.onChange((value) => {
        setCurrentProgress(value);

        const totalTime = GRADING_STEPS.reduce((acc, step) => acc + step.estimatedTime, 0);
        const remaining = Math.ceil(totalTime * (1 - value / 100));

        if (onProgressUpdate) {
          onProgressUpdate({
            phase: phase as 'check' | 'grade' | 'verify' | 'completed' | 'error',
            progress: value,
            message: GRADING_STEPS[currentStep].label,
          });
        }
      });

      return unsubscribe;
    }
  }, [phase, initialProgress, springProgress, currentStep, onProgressUpdate]);

  useEffect(() => {
    if (phase === 'check' || phase === 'grade' || phase === 'verify') {
      const newStepIndex = GRADING_STEPS.findIndex((step) => step.id === phase);
      if (newStepIndex !== -1 && newStepIndex !== currentStep) {
        setCurrentStep(newStepIndex);
        if (onStepComplete) {
          onStepComplete(newStepIndex);
        }
      }
    }
  }, [phase, currentStep, onStepComplete]);

  useEffect(() => {
    if (phase === 'error') {
      setError(t('gradingProgress.error'));
    } else {
      setError(null);
    }
  }, [phase]);

  const CurrentStepIcon = GRADING_STEPS[currentStep]?.icon || Search;

  const timeRemaining =
    phase === 'check' || phase === 'grade' || phase === 'verify'
      ? Math.ceil(GRADING_STEPS.reduce((acc, step) => acc + step.estimatedTime, 0) * (1 - currentProgress / 100))
      : null;

  return (
    <motion.div className={cn('w-full p-6', className)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <AnimatePresence mode="wait">
        {error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center space-y-4"
          >
            <AlertTriangle className="w-12 h-12 text-destructive-foreground" />
            <p className="text-destructive-foreground font-medium">{error}</p>
          </motion.div>
        ) : (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-4">
              <motion.div className="flex items-center space-x-3" initial={false} animate={{ x: 0 }} key={currentStep}>
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CurrentStepIcon className="w-6 h-6 text-gray-600" />
                  </motion.div>
                  {phase === 'check' || phase === 'grade' || phase === 'verify' ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-0 left-0">
                      <Loader2 className="w-6 h-6 text-gray-600 animate-spin opacity-50" />
                    </motion.div>
                  ) : null}
                </div>
                <motion.h3
                  className="text-lg font-semibold"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={GRADING_STEPS[currentStep]?.label}
                >
                  {GRADING_STEPS[currentStep]?.label || t('gradingProgress.defaultTitle')}
                </motion.h3>
              </motion.div>
              {timeRemaining !== null && (
                <motion.span className="text-sm text-gray-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {t('gradingProgress.timeRemaining', { seconds: timeRemaining })}
                </motion.span>
              )}
            </div>

            <motion.p
              className="text-gray-600 mb-4"
              key={message || GRADING_STEPS[currentStep]?.description}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {message || GRADING_STEPS[currentStep]?.description || '正在初始化...'}
            </motion.p>

            <div className="space-y-2">
              <Progress value={currentProgress} className="h-2" />
              <motion.div
                className="flex justify-between text-sm text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <span>{Math.round(currentProgress)}%</span>
                <span>{GRADING_STEPS[currentStep]?.progressText || '處理中...'}</span>
              </motion.div>
            </div>

            <div className="mt-6 flex justify-between">
              {GRADING_STEPS.map((step, index) => (
                <motion.div
                  key={step.id}
                  className={cn(
                    'flex flex-col items-center space-y-2',
                    index <= currentStep ? 'text-gray-600' : 'text-gray-400'
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: index === currentStep ? 1.1 : 1,
                  }}
                  transition={{ delay: index * 0.1 }}
                >
                  <step.icon className="w-5 h-5" />
                  <span className="text-xs text-center">{step.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

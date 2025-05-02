import { useEffect, useState } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type SnackbarSeverity = 'success' | 'error' | 'info' | 'warning';

interface StatusSnackbarProps {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
  onClose: () => void;
  autoHideDuration?: number;
  className?: string;
  action?: React.ReactNode;
  enableProgress?: boolean;
}

const snackbarVariants = cva('flex items-center px-4 py-3 rounded-lg shadow-lg border relative overflow-hidden', {
  variants: {
    severity: {
      success: 'bg-green-50 text-green-800 border-green-200',
      error: 'bg-red-50 text-red-800 border-red-200',
      info: 'bg-blue-50 text-blue-800 border-blue-200',
      warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    },
  },
  defaultVariants: {
    severity: 'info',
  },
});

const ICON_MAP: Record<SnackbarSeverity, React.ElementType> = {
  success: Check,
  error: X,
  info: Info,
  warning: AlertCircle,
};

const PROGRESS_VARIANTS: Record<SnackbarSeverity, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  warning: 'bg-yellow-500',
};

const ANIMATION_CONFIG = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export function StatusSnackbar({
  open,
  message,
  severity = 'info',
  onClose,
  autoHideDuration = 6000,
  className,
  action,
  enableProgress = true,
}: StatusSnackbarProps) {
  const [progress, setProgress] = useState<number>(100);
  const Icon = ICON_MAP[severity];

  useEffect(() => {
    setProgress(100);
  }, [message]);

  useEffect(() => {
    if (!open) {
      setProgress(100);
      return;
    }

    let startTime: number;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;

      const elapsed = timestamp - startTime;
      const remaining = Math.max(0, 100 - (elapsed / autoHideDuration) * 100);

      setProgress(remaining);

      if (remaining > 0) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        onClose();
      }
    };

    if (enableProgress) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      const timer = setTimeout(onClose, autoHideDuration);
      return () => clearTimeout(timer);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [open, autoHideDuration, onClose, enableProgress]);

  const getFocusRingColor = (severity: SnackbarSeverity): string => {
    const colors = {
      success: 'focus:ring-green-500',
      error: 'focus:ring-red-500',
      info: 'focus:ring-blue-500',
      warning: 'focus:ring-yellow-500',
    };
    return colors[severity];
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50" role="alert" aria-live="polite">
          <motion.div {...ANIMATION_CONFIG} className={cn(snackbarVariants({ severity }), className)}>
            {enableProgress && (
              <div
                className={cn('absolute bottom-0 left-0 h-1 transition-all duration-100', PROGRESS_VARIANTS[severity])}
                style={{ width: `${progress}%` }}
              />
            )}

            <Icon className="w-5 h-5 mr-2 flex-shrink-0" aria-hidden="true" />

            <span className="text-sm font-medium mr-2 flex-grow">{message}</span>

            {action && <div className="flex-shrink-0 mx-2">{action}</div>}

            <button
              onClick={onClose}
              className={cn(
                'p-1 rounded-full transition-colors duration-200',
                'hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2',
                getFocusRingColor(severity)
              )}
              aria-label="關閉通知"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useRef } from 'react';

interface EmptyGradingStateProps {
  onRetry?: () => void;
}

export function EmptyGradingState({}: EmptyGradingStateProps) {
  const { t } = useTranslation('grading');
  const containerRef = useRef<HTMLDivElement>(null);
  const mainIconRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  // Simple entrance animation with accessibility support
  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      gsap.set([containerRef.current, mainIconRef.current], {
        opacity: 1,
        y: 0
      });
    } else {
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8"
    >
      {/* Main Icon */}
      <div
        ref={mainIconRef}
        className="text-muted-foreground mb-2"
      >
        <Sparkles className="w-12 h-12" />
      </div>

      {/* Title & Description */}
      <div ref={stepsRef}>
        <h3 className="text-lg font-medium text-foreground mb-2">
          {t('grading:feedbackUi.empty.title')}
        </h3>
        <p className="text-muted-foreground">
          {t('grading:feedbackUi.empty.subtitle')}
        </p>
      </div>
    </div>
  );
}

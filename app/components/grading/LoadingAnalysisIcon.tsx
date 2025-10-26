import { useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { useTranslation } from 'react-i18next';

interface LoadingAnalysisIconProps {
  isLoading?: boolean;
}

/**
 * LoadingAnalysisIcon - Animated icon for AI analysis phase
 * Uses GSAP for smooth, performant animations
 *
 * Features:
 * - Rotating sparkle icon (primary animation)
 * - Pulsing glow effect around icon
 * - Subtle scale breathing animation
 * - Responsive to prefers-reduced-motion
 */
export function LoadingAnalysisIcon({ isLoading = true }: LoadingAnalysisIconProps) {
  const { t } = useTranslation('grading');
  const iconRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!isLoading || prefersReducedMotion) {
        // Stop animations if not loading or user prefers reduced motion
        gsap.to([iconRef.current, glowRef.current], { duration: 0.3, opacity: 1 });
        return;
      }

      // Create a timeline for coordinated animations
      const tl = gsap.timeline({ repeat: -1 });

      // 1. Rotating sparkle icon (continuous smooth rotation)
      tl.to(
        iconRef.current,
        {
          rotation: 360,
          duration: 3,
          ease: 'linear',
        },
        0 // Start at the beginning of timeline
      );

      // 2. Pulsing glow effect (synchronized with rotation)
      tl.to(
        glowRef.current,
        {
          boxShadow: [
            '0 0 20px rgba(59, 130, 246, 0.4)',
            '0 0 40px rgba(59, 130, 246, 0.6)',
            '0 0 20px rgba(59, 130, 246, 0.4)',
          ],
          duration: 2,
          ease: 'sine.inOut',
        },
        0 // Start at the same time as rotation
      );

      // 3. Subtle scale breathing (icon gets slightly larger/smaller)
      tl.to(
        iconRef.current,
        {
          scale: [1, 1.1, 1],
          duration: 2,
          ease: 'sine.inOut',
        },
        0 // Start at the same time
      );
    },
    { dependencies: [isLoading] }
  );

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center p-8 text-center">
      {/* Loading Icon with Glow */}
      <div className="relative mb-6">
        {/* Glow effect background */}
        <div
          ref={glowRef}
          className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400/20 to-blue-600/10"
          style={{
            width: '80px',
            height: '80px',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
          }}
        />

        {/* Rotating icon */}
        <div ref={iconRef} className="relative z-10">
          <Sparkles className="w-16 h-16 text-blue-500" strokeWidth={1.5} />
        </div>
      </div>

      {/* Loading text with ellipsis animation */}
      <h3 className="text-lg font-medium text-foreground mb-2">
        {t('grading:ai.analyzing')}
      </h3>

      {/* Animated ellipsis */}
      <div className="flex items-center justify-center h-6">
        <style>{`
          @keyframes ellipsis {
            0%, 20% { content: '.'; }
            40% { content: '..'; }
            60%, 100% { content: '...'; }
          }
          .ellipsis::after {
            content: '.';
            animation: ellipsis 1.5s steps(4, end) infinite;
            min-width: 1.25rem;
            text-align: center;
          }
        `}</style>
        <p className="text-sm text-muted-foreground ellipsis" />
      </div>

      {/* Loading tips */}
      <p className="text-xs text-muted-foreground mt-4 max-w-xs">
        {t('grading:ai.processingTip')}
      </p>
    </div>
  );
}

import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

interface LoadingAnalysisIconProps {
  isLoading?: boolean;
}

/**
 * LoadingAnalysisIcon - Three bouncing dots loading animation
 * Design Philosophy: Simple bouncing motion, no text
 *
 * Animation: Three dots jump up and down in sequence
 */
export function LoadingAnalysisIcon({ isLoading = true }: LoadingAnalysisIconProps) {
  const dot1Ref = useRef<HTMLDivElement>(null);
  const dot2Ref = useRef<HTMLDivElement>(null);
  const dot3Ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!isLoading || prefersReducedMotion) {
        return;
      }

      // Dot 1 bounces
      gsap.to(dot1Ref.current, {
        y: -10,
        duration: 0.6,
        ease: 'power2.inOut',
        repeat: -1,
        yoyo: true,
        delay: 0,
      });

      // Dot 2 bounces with delay
      gsap.to(dot2Ref.current, {
        y: -10,
        duration: 0.6,
        ease: 'power2.inOut',
        repeat: -1,
        yoyo: true,
        delay: 0.2,
      });

      // Dot 3 bounces with more delay
      gsap.to(dot3Ref.current, {
        y: -10,
        duration: 0.6,
        ease: 'power2.inOut',
        repeat: -1,
        yoyo: true,
        delay: 0.4,
      });
    },
    { dependencies: [isLoading] }
  );

  return (
    <div className="flex items-center justify-center h-full w-full gap-2">
      {/* Dot 1 - Amber */}
      <div
        ref={dot1Ref}
        className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-300 to-amber-500"
      />

      {/* Dot 2 - Orange */}
      <div
        ref={dot2Ref}
        className="w-3 h-3 rounded-full bg-gradient-to-br from-orange-300 to-orange-500"
      />

      {/* Dot 3 - Red */}
      <div
        ref={dot3Ref}
        className="w-3 h-3 rounded-full bg-gradient-to-br from-red-300 to-red-500"
      />
    </div>
  );
}

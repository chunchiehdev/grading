import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);
  const [percent, setPercent] = useState(0);

  useGSAP(() => {
    const container = containerRef.current;
    const logo = logoRef.current;
    const percentElement = percentRef.current;

    if (!container || !logo || !percentElement) return;

    // 初始狀態
    gsap.set(container, { opacity: 1 });
    gsap.set(logo, {
      scale: 0.8,
      opacity: 0,
      y: 50
    });
    gsap.set(percentElement, {
      opacity: 0,
      y: 30
    });

    // 創建時間軸
    const tl = gsap.timeline();

    // Logo 進入動畫
    tl.to(logo, {
      scale: 1,
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "elastic.out(1, 0.5)"
    })
    // 百分比數字進入
    .to(percentElement, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power3.out"
    }, "-=0.3")
    // 數字從 1% 到 100% 的動畫
    .to({}, {
      duration: 3,
      ease: "power2.inOut",
      onUpdate: function() {
        const progress = this.progress();
        const currentPercent = Math.round(progress * 100);
        setPercent(currentPercent);
      }
    })
    // 完成後的動畫
    .to(logo, {
      scale: 1.1,
      duration: 0.3,
      ease: "power2.out"
    })
    .to(logo, {
      scale: 1,
      duration: 0.3,
      ease: "power2.out"
    })
    // 淡出整個載入畫面
    .to(container, {
      opacity: 0,
      duration: 0.8,
      ease: "power2.inOut",
      onComplete: () => {
        onComplete();
      }
    }, "+=0.5");

  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#FAF0E6' }}
    >
      {/* Logo */}
      <div className="mb-12">
        <img
          ref={logoRef}
          src="/grade.png"
          alt="Loading"
          className="w-32 h-32 object-contain drop-shadow-lg"
        />
      </div>

      {/* 百分比數字 */}
      <div className="text-center">
        <span
          ref={percentRef}
          className="text-4xl font-light text-slate-700 tracking-wider"
        >
          {percent}%
        </span>
      </div>

      {/* 進度條 (可選) */}
      <div className="mt-8 w-64 h-1 bg-slate-300 rounded-full overflow-hidden">
        <div
          className="h-full bg-slate-600 transition-all duration-100 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
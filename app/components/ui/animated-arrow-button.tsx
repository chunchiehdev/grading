import { useRef } from 'react';
import { Link } from 'react-router';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface AnimatedArrowButtonProps {
  to: string;
  className?: string;
  children?: React.ReactNode;
}

export function AnimatedArrowButton({ to, className = '', children }: AnimatedArrowButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const button = buttonRef.current;
    const arrow = arrowRef.current;
    const container = containerRef.current;

    if (!button || !arrow || !container) return;

    gsap.fromTo(
      button,
      {
        scale: 0.8,
        opacity: 0,
      },
      {
        scale: 1,
        opacity: 1,
        duration: 0.6,
        ease: 'back.out(1.7)',
      }
    );

    const createPetal = () => {
      const petal = document.createElement('div');
      const colors = ['#ff6b9d', '#a7c957', '#7209b7', '#f72585', '#4cc9f0', '#ffd60a', '#fb8500', '#8338ec'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      petal.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        width: 10px;
        height: 20px;
        background: ${randomColor};
        border-radius: 50% 50% 50% 0;
        transform: rotate(45deg) translate(-50%, -50%);
        pointer-events: none;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        z-index: 1000;
      `;

      container.appendChild(petal);
      return petal;
    };

    const handleMouseEnter = () => {
      gsap.to(arrow, {
        rotation: 15,
        scale: 1.3,
        y: 0, // 確保 y 位置重置
        duration: 0.4,
        ease: 'elastic.out(1, 0.3)',
      });

      gsap.to(button, {
        boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
        scale: 1.02,
        duration: 0.3,
        ease: 'power2.out',
      });

      const tl = gsap.timeline();

      for (let i = 0; i < 8; i++) {
        const petal = createPetal();

        const angle = (i * 45 * Math.PI) / 180;
        const distance = 50 + Math.random() * 30;

        gsap.set(petal, {
          scale: 0,
          rotation: (angle * 180) / Math.PI,
        });

        tl.to(
          petal,
          {
            scale: 1,
            duration: 0.2,
            ease: 'back.out(2)',
          },
          i * 0.05
        ).to(
          petal,
          {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            rotation: (angle * 180) / Math.PI + 360,
            scale: 0,
            opacity: 0,
            duration: 1.2,
            ease: 'power2.out',
            onComplete: () => {
              petal.remove();
            },
          },
          i * 0.05 + 0.1
        );
      }
    };

    const handleMouseLeave = () => {
      gsap.to(arrow, {
        rotation: 0,
        scale: 1,
        y: -2, // 回到浮動位置
        duration: 0.4,
        ease: 'elastic.out(1, 0.3)',
      });

      gsap.to(button, {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    };

    const handleClick = () => {
      // 箭頭瘋狂旋轉動畫
      gsap.to(arrow, {
        rotation: 720,
        scale: 1.5,
        duration: 0.6,
        ease: 'back.out(2)',
      });

      gsap.to(button, {
        scale: 0.9,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut',
      });

      const explodeTl = gsap.timeline();

      for (let i = 0; i < 12; i++) {
        const petal = createPetal();
        const angle = (i * 30 * Math.PI) / 180;
        const distance = 100 + Math.random() * 50;

        gsap.set(petal, {
          scale: 0.5,
          rotation: (angle * 180) / Math.PI,
        });

        explodeTl
          .to(
            petal,
            {
              scale: 1.5,
              duration: 0.1,
              ease: 'power2.out',
            },
            i * 0.02
          )
          .to(
            petal,
            {
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              rotation: (angle * 180) / Math.PI + 720,
              scale: 0,
              opacity: 0,
              duration: 1.8,
              ease: 'power3.out',
              onComplete: () => {
                petal.remove();
              },
            },
            i * 0.02 + 0.05
          );
      }
    };

    gsap.to(arrow, {
      y: -2,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    button.addEventListener('mouseenter', handleMouseEnter);
    button.addEventListener('mouseleave', handleMouseLeave);
    button.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      button.removeEventListener('mouseenter', handleMouseEnter);
      button.removeEventListener('mouseleave', handleMouseLeave);
      button.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block overflow-visible">
      <div ref={buttonRef} className="relative">
        <Button
          asChild
          size="lg"
          className={`bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 border border-primary/20 ${className}`}
        >
          <Link to={to} className="flex items-center justify-center gap-2">
            {children}
            <ArrowRight ref={arrowRef} className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

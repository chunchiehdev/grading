import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

interface AnimatedTitleProps {
  text: string;
  className?: string;
}

export function AnimatedTitle({ text, className = "" }: AnimatedTitleProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    const container = containerRef.current;
    if (!container) return;

    const letters = container.querySelectorAll('.letter');

    // 初始狀態：所有字母都隱藏但保持對齊
    gsap.set(letters, {
      opacity: 0,
      y: 0,
      x: 0,
      scale: 1,
      rotation: 0
    });

    // 創建主時間軸
    const tl = gsap.timeline({ delay: 0.5 });

    letters.forEach((letter, index) => {
      const char = letter.textContent?.toLowerCase();

      switch (char) {
        case 'l':
          // L 從左邊滑進來
          gsap.set(letter, { x: -100 });
          tl.to(letter, {
            x: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out"
          }, index * 0.1);
          break;

        case 'u':
          // u 從天而降
          gsap.set(letter, { y: -100 });
          tl.to(letter, {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: "bounce.out"
          }, index * 0.1);
          break;

        case 'm':
          // m 直接出現（無動畫）
          tl.to(letter, {
            opacity: 1,
            duration: 0.3
          }, index * 0.1);
          break;

        case 'o':
          // o 彈跳出現並持續彈跳
          gsap.set(letter, { scale: 0 });
          tl.to(letter, {
            scale: 1,
            opacity: 1,
            duration: 0.6,
            ease: "elastic.out(1, 0.5)"
          }, index * 0.1);

          // 持續彈跳動畫（延遲啟動，確保回到基線）
          tl.to(letter, {
            y: -15,
            duration: 0.8,
            ease: "power2.inOut",
            yoyo: true,
            repeat: -1
          }, index * 0.1 + 1.5);
          break;

        case 's':
          // s 旋轉進入
          gsap.set(letter, { rotation: 360, scale: 0 });
          tl.to(letter, {
            rotation: 0,
            scale: 1,
            opacity: 1,
            duration: 0.8,
            ease: "back.out(2)"
          }, index * 0.1);
          break;

        case 'g':
          // G 從右邊滑進來
          gsap.set(letter, { x: 100 });
          tl.to(letter, {
            x: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out"
          }, index * 0.1);
          break;

        case 'r':
          // r 翻轉進入
          gsap.set(letter, { rotationY: 180, scale: 0.5 });
          tl.to(letter, {
            rotationY: 0,
            scale: 1,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out"
          }, index * 0.1);
          break;

        case 'a':
          // a 放大進入
          gsap.set(letter, { scale: 3 });
          tl.to(letter, {
            scale: 1,
            opacity: 1,
            duration: 0.6,
            ease: "power3.out"
          }, index * 0.1);
          break;

        case 'd':
          // d 搖擺進入
          gsap.set(letter, { rotation: -45, scale: 0 });
          tl.to(letter, {
            rotation: 0,
            scale: 1,
            opacity: 1,
            duration: 0.8,
            ease: "elastic.out(1, 0.3)"
          }, index * 0.1);
          break;

        case 'e':
          // e 簡單淡入
          tl.to(letter, {
            opacity: 1,
            duration: 0.5,
            ease: "power2.out"
          }, index * 0.1);
          break;

        case ' ':
          // 空格：直接顯示
          tl.to(letter, {
            opacity: 1,
            duration: 0.1
          }, index * 0.1);
          break;

        default:
          // 其他字母：預設動畫
          tl.to(letter, {
            opacity: 1,
            duration: 0.5,
            ease: "power2.out"
          }, index * 0.1);
      }
    });

  }, [text]);

  // 將文字拆分成字母
  const renderLetters = () => {
    return text.split('').map((char, index) => (
      <span
        key={index}
        className="letter inline-block"
        style={{ transformOrigin: 'center' }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  return (
    <h1 ref={containerRef} className={className}>
      {renderLetters()}
    </h1>
  );
}
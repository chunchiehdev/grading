import { useState } from 'react';
import { HeroSection } from '@/components/landing/HeroSection';

/**
 * Landing page with loading screen
 */
export default function WabiSabiLanding() {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  return (
    <>
      {/* {isLoading && <LoadingScreen onComplete={handleLoadingComplete} />} */}
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="w-full">
          <HeroSection />
        </div>
      </div>
    </>
  );
}

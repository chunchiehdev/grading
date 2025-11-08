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
      <HeroSection />
    </>
  );
}

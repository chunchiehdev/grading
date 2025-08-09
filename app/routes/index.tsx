import { HeroSection } from '@/components/landing/HeroSection';

// Not needed for our simple i18next setup

/**
 * Landing page
 */
export default function WabiSabiLanding() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-white">
      <div className="w-full">
        <HeroSection />
      </div>
    </div>
  );
}

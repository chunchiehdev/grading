import { HeroSection } from '@/components/landing/HeroSection';

/**
 * Landing page
 */
export default function WabiSabiLanding() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white">
      <div className="w-full">
        <HeroSection />
      </div>
    </div>
  );
}

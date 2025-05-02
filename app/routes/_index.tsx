import { HeroSection } from '@/components/landing/HeroSection';

/**
 * Landing page
 */
export default function WabiSabiLanding() {
  // Render the landing page without requiring loader data since this is a public page
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="w-full">
        <HeroSection />
      </div>
    </div>
  );
}

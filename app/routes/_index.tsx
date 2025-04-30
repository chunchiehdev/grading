// import { useLoaderData } from "react-router";
// import { loader } from "@/root";
import { HeroSection } from "@/components/landing/HeroSection";

const WabiSabiLanding = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="w-full">
        <HeroSection />
      </div>
    </div>
  );
};

export default WabiSabiLanding;

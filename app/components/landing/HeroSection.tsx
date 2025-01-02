import { Link } from "@remix-run/react";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <div className="relative w-full min-h-[700px] overflow-hidden rounded-lg transform-gpu transition-transform duration-300 hover:scale-[1.005]">
      <div className="absolute inset-0 transform-gpu will-change-transform">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/someone.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
      </div>

      <Link
        to="/assignments/grade"
        className="group absolute bottom-12 right-12 z-10"
        aria-label="開始使用"
      >
        <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-white transform-gpu transition-all duration-500 hover:scale-110 cursor-pointer">
          <div className="absolute w-full h-full rounded-full bg-white/30 animate-ping" />

          <div className="absolute w-full h-full rounded-full bg-white opacity-75 group-hover:scale-105 transition-transform duration-300" />

          <ArrowRight className="relative w-8 h-8 text-black transform transition-transform duration-500 group-hover:translate-x-1" />
        </div>
      </Link>
    </div>
  );
};

export { HeroSection };

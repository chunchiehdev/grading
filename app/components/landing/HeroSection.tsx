import { useNavigate } from "react-router";
import { ArrowRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const HeroSection = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.onerror = () => {
        console.error("Video failed to load");
        setVideoError(true);
      };
    }
  }, []);

  const handleCreateNewGrading = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/create-grading", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source: "hero-section" }),
      });

      if (!response.ok) {
        throw new Error("Failed to create grading task");
      }

      const { id } = await response.json();
      navigate(`/assignments/grade/${id}`);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-[500px] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="absolute inset-0 transform-gpu will-change-transform">
        {!videoError ? (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            poster="/someone.jpg"
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setVideoError(true)}
          >
            <source src="/desk.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <p className="text-white text-xl">無法載入視頻，使用備用背景</p>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
      </div>

      <div className="relative z-10 p-8 flex flex-col h-full justify-end">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          教育評分系統
        </h2>
        <p className="text-xl text-white/80 mb-8 max-w-2xl">
          使用現代科技輔助教學評量，提升教學效能
        </p>
        
        <button
          onClick={handleCreateNewGrading}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-full hover:bg-gray-100 transition-colors w-fit"
        >
          {isLoading ? "處理中..." : "開始使用"}
          {!isLoading && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export { HeroSection };

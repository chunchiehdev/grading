import { useNavigate, useSearchParams } from 'react-router';
import { useUser } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';

/**
 * Modern Minimal Landing Page - Full screen width
 */
const HeroSection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: user, isLoading } = useUser();
  const isLoggedIn = Boolean(user);
  const [showLogoutMessage, setShowLogoutMessage] = useState(false);

  // Check for logout success parameter
  useEffect(() => {
    if (searchParams.get('logout') === 'success') {
      setShowLogoutMessage(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShowLogoutMessage(false);
        // Clean up URL parameter
        navigate('/', { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, navigate]);

  const handleGetStarted = () => {
    if (isLoggedIn) {
      navigate('/dashboard');
    } else {
      navigate('/auth/login');
    }
  };

  return (
    <section className="min-h-screen">
      <div className="w-full px-6 lg:px-12 xl:px-20 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 lg:gap-16 items-center min-h-[80vh]">
          
          {/* Text Content */}
          <div className="lg:col-span-7 space-y-10 order-2 lg:order-1">
            <div className="space-y-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extralight text-gray-900 leading-[1.1] tracking-tight">
                <span className="font-light">評分</span>系統
              </h1>
              
              <div className="w-20 h-px bg-gray-300"></div>
              
              <p className="text-lg lg:text-xl text-gray-600 font-light leading-relaxed max-w-lg">
                為現代教育工作者設計的直觀評分工具，讓評分過程更加高效且準確。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pt-6">
              <button 
                onClick={handleGetStarted}
                disabled={isLoading}
                className="group bg-gray-900 text-white px-8 py-4 text-sm font-light tracking-wide transition-all duration-300 hover:bg-gray-800"
              >
                <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">
                  {isLoggedIn ? '進入系統' : '開始使用'}
                </span>
              </button>
              
              <button 
                onClick={() => navigate('/auth/login')}
                className="text-gray-700 hover:text-gray-900 px-8 py-4 text-sm font-light tracking-wide border border-gray-200 transition-all duration-300 hover:border-gray-300"
              >
                {showLogoutMessage ? '重新登入' : '了解更多'}
              </button>
            </div>
          </div>

          {/* Visual Element */}
          <div className="lg:col-span-5 flex items-center justify-center order-1 lg:order-2 mb-8 lg:mb-0">
            <div className="relative w-full max-w-lg">
              {/* Main Image */}
              <div className="relative overflow-hidden">
                <img 
                  src="/writing_rm_background.png" 
                  alt="評分系統示意圖" 
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export { HeroSection };
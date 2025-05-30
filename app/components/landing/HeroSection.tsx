import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useAuth';

/**
 * Modern Minimal Landing Page - Full screen width
 */
const HeroSection = () => {
  const navigate = useNavigate();
  const { data: user, isLoading } = useUser();
  const isLoggedIn = Boolean(user);

  const handleGetStarted = () => {
    if (isLoggedIn) {
      navigate('/dashboard');
    } else {
      navigate('/auth/login');
    }
  };

  return (
    <section className="min-h-screen bg-white">
      <div className="w-full px-6 lg:px-12 xl:px-20 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center min-h-[80vh]">
          
          {/* Text Content */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extralight text-gray-900 leading-[1.1] tracking-tight">
                <br />
                <span className="font-light">評分</span>
                <br />
                系統
              </h1>
              
              <div className="w-24 h-px bg-gray-300"></div>
              
              <p className="text-lg lg:text-xl text-gray-600 font-light leading-relaxed max-w-lg">
                為現代教育工作者設計的直觀評分工具，讓評分過程更加高效且準確。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 pt-8">
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
                了解更多
              </button>
            </div>
          </div>

          {/* Visual Element */}
          <div className="lg:col-span-5">
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-sm"></div>
              <div className="absolute top-8 left-8 w-16 h-16 bg-gray-900 rounded-sm opacity-90"></div>
              <div className="absolute bottom-8 right-8 w-24 h-24 bg-gray-200 rounded-sm"></div>
            </div>
          </div>
          
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-20 border-t border-gray-100 mt-20">
          <div className="text-center space-y-2">
            <div className="text-2xl font-light text-gray-900">500+</div>
            <div className="text-sm text-gray-600 font-light tracking-wide">教師用戶</div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-2xl font-light text-gray-900">50K+</div>
            <div className="text-sm text-gray-600 font-light tracking-wide">評分作業</div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-2xl font-light text-gray-900">95%</div>
            <div className="text-sm text-gray-600 font-light tracking-wide">時間節省</div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-2xl font-light text-gray-900">4.9</div>
            <div className="text-sm text-gray-600 font-light tracking-wide">用戶評分</div>
          </div>
        </div>
        
      </div>
    </section>
  );
};

export { HeroSection };
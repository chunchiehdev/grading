import { useNavigate, useSearchParams } from 'react-router';
import { useUser } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getRoleBasedDashboard } from '@/root';
/**
 * Modern Minimal Landing Page - Full screen width
 */
const HeroSection = () => {
  const { t } = useTranslation(['common', 'auth', 'landing']);
  const navigate = useNavigate();
  const { data, isLoading } = useUser();
  const user = data?.user;
  const isLoggedIn = Boolean(user);

  const handleGetStarted = () => {
    if (user && user.role) {
      navigate(getRoleBasedDashboard(user.role));
    } else if (user) {
      navigate('/auth/select-role');
    } else {
      navigate('/auth/login');
    }
  };

  return (
    <section className="h-full flex flex-col justify-center">
      <div className="w-full px-6 lg:px-12 xl:px-20 py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 lg:gap-16 items-center ">
          {/* Text Content */}
          <div className="lg:col-span-7 space-y-10 order-2 lg:order-1">
            <div className="space-y-8 min-h-[180px] sm:min-h-[200px] ">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extralight text-gray-900 leading-[1.1] tracking-tight">
                {t('landing:hero.title')}
              </h1>

              <div className="w-20 h-px bg-gray-300"></div>

              <p className="text-lg lg:text-xl text-gray-600 font-light leading-relaxed max-w-lg">
                {t('landing:hero.subtitle')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pt-6">
              <button
                onClick={handleGetStarted}
                disabled={isLoading}
                className="group bg-gray-900 text-white px-8 py-4 text-sm font-light tracking-wide transition-all duration-300 hover:bg-gray-800 min-w-[180px] text-center"
              >
                <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">
                  {isLoggedIn ? t('landing:hero.enterSystem') : t('landing:hero.getStarted')}
                </span>
              </button>

              <button
                onClick={() => navigate('/auth/login')}
                className="text-gray-700 hover:text-gray-900 px-8 py-4 text-sm font-light tracking-wide border border-gray-200 transition-all duration-300 hover:border-gray-300"
              >
                {t('landing:hero.learnMore')}
              </button>
            </div>
          </div>

          {/* Visual Element */}
          <div className="lg:col-span-5 flex items-center justify-center order-1 lg:order-2 mb-8 lg:mb-0">
            <div className="relative w-full max-w-lg">
              {/* Main Image */}
              <div className="relative overflow-hidden">
                <img src="/writing_rm_background.png" alt="grading_picture" className="w-full h-auto object-cover" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { HeroSection };

import { Link, useLoaderData } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getRoleBasedDashboard, type User } from '@/root';
import { AnimatedTitle } from '@/components/ui/animated-title';
import { useMemo } from 'react';

interface LoaderData {
  user: User | null;
  isPublicPath: boolean;
  [key: string]: any;
}
/**
 * Modern Minimal Landing Page - Full screen width
 */
const HeroSection = () => {
  const { t } = useTranslation(['common', 'auth', 'landing']);
  const loaderData = useLoaderData() as LoaderData | undefined;
  const user = loaderData?.user || null;
  const isLoggedIn = Boolean(user);

  // Calculate target route for primary CTA button
  const primaryButtonTarget = useMemo(() => {
    if (user && user.role) {
      return getRoleBasedDashboard(user.role);
    } else if (user) {
      return '/auth/select-role';
    } else {
      return '/auth/login';
    }
  }, [user]);

  return (
    <section className="h-full flex flex-col justify-center">
      <div className="w-full px-6 lg:px-12 xl:px-20 py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 lg:gap-16 items-center ">
          {/* Text Content */}
          <div className="lg:col-span-7 space-y-10 order-2 lg:order-1">
            <div className="space-y-8 min-h-[180px] sm:min-h-[200px] ">
              <AnimatedTitle
                text={t('landing:hero.title')}
                className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl 2xl:text-8xl 4xl:text-9xl font-extralight text-foreground leading-[1.1] tracking-tight"
              />

              <div className="w-20 h-px bg-border"></div>

              <p className="text-lg lg:text-xl text-muted-foreground font-light leading-relaxed max-w-lg">
                {t('landing:hero.subtitle')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pt-6">
              <Link
                to={primaryButtonTarget}
                prefetch="viewport"
                className="group bg-primary text-primary-foreground px-8 py-4 text-sm font-light tracking-wide transition-all duration-300 hover:bg-primary/90 min-w-[180px] text-center"
              >
                <span className="group-hover:translate-x-1 transition-transform duration-300 inline-block">
                  {isLoggedIn ? t('landing:hero.enterSystem') : t('landing:hero.getStarted')}
                </span>
              </Link>

              <Link
                to="/agent-playground"
                prefetch="viewport"
                className="text-primary hover:text-primary/80 px-8 py-4 text-sm font-light tracking-wide border border-primary transition-all duration-300 hover:bg-primary/5 min-w-[180px] text-center"
              >
                Try AI Agent
              </Link>
            </div>
          </div>

          {/* Visual Element */}
          <div className="lg:col-span-5 flex items-center justify-center order-1 lg:order-2 mb-8 lg:mb-0">
            <div className="relative w-full max-w-lg xl:max-w-xl 2xl:max-w-2xl">
              {/* Main Image */}
              <div className="relative overflow-hidden">
                <img
                  src="/writing_rm_background.png"
                  alt="grading_picture"
                  className="w-full h-auto object-cover xl:scale-110 2xl:scale-125"
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

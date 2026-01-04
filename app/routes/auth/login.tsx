import { useRouteError, isRouteErrorResponse, redirect } from 'react-router';
import { ErrorPage } from '@/components/errors/ErrorPage';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { Route } from './+types/login';
import { getUser } from '@/services/auth.server';

/**
 * Redirect already logged-in users to their dashboard
 */
export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUser(request);
  
  if (user) {
    // User is already logged in, redirect to appropriate dashboard
    if (user.role === 'ADMIN' || user.role === 'TEACHER') {
      throw redirect('/teacher');
    } else {
      throw redirect('/student');
    }
  }
  
  return null;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('auth');

  const error = searchParams.get('error');
  const redirectTo = searchParams.get('redirectTo');
  const googleError =
    error === 'google-auth-unavailable'
      ? t('loginPage.errors.googleAuthUnavailable')
      : error === 'google-auth-failed'
        ? t('loginPage.errors.googleAuthFailed')
        : null;

  return (
    <div className="h-full w-full bg-white relative">
      {/* Background Elements - Clipped */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 1. Beaker - Grid Position 1 */}
        <div
          className="absolute w-6 h-8 animate-float opacity-40"
          style={{
            top: '8%',
            left: '12%',
            transform: 'translateX(5px) translateY(3px)',
          }}
        >
          <div className="w-full h-full bg-[#254D70] relative rounded-b-lg">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-[#EFE4D2] rounded-full"></div>
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-1 h-2 bg-[#131D4F]"></div>
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-3 bg-[#954C2E] rounded opacity-40"></div>
          </div>
        </div>

        {/* 2. Atom - Grid Position 2 */}
        <div
          className="absolute w-8 h-8 animate-spin-slow opacity-40"
          style={{
            top: '15%',
            left: '78%',
            transform: 'translateX(-8px) translateY(12px)',
          }}
        >
          <div className="w-full h-full relative">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#254D70] rounded-full"></div>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-px bg-[#954C2E] origin-center"></div>
            <div className="absolute top-1/2 left-0 transform -translate-y-1/2 w-full h-px bg-[#954C2E] origin-center rotate-60"></div>
            <div className="absolute top-1/2 left-0 transform -translate-y-1/2 w-full h-px bg-[#954C2E] origin-center -rotate-60"></div>
            <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-[#131D4F] rounded-full"></div>
            <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#131D4F] rounded-full"></div>
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-[#131D4F] rounded-full"></div>
          </div>
        </div>

        {/* 3. Test Tube - Grid Position 3 */}
        <div
          className="absolute w-3 h-12 animate-float-slow opacity-40"
          style={{
            top: '25%',
            left: '35%',
            transform: 'translateX(15px) translateY(-5px)',
          }}
        >
          <div className="w-full h-full bg-[#254D70] relative rounded-b-full">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#131D4F] rounded-t"></div>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-2 h-6 bg-[#954C2E] rounded opacity-40"></div>
          </div>
        </div>

        {/* 4. Magnifying Glass - Grid Position 4 */}
        <div
          className="absolute w-8 h-8 animate-float opacity-40"
          style={{
            top: '32%',
            left: '85%',
            transform: 'translateX(-12px) translateY(8px)',
          }}
        >
          <div className="w-full h-full relative">
            <div className="absolute top-0 left-0 w-5 h-5 border-2 border-[#254D70] rounded-full"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#131D4F] transform rotate-45 rounded-sm"></div>
          </div>
        </div>

        {/* 5. Flask - Grid Position 5 */}
        <div
          className="absolute w-6 h-9 animate-float-slow opacity-40"
          style={{
            top: '42%',
            left: '8%',
            transform: 'translateX(10px) translateY(-8px)',
          }}
        >
          <div className="w-full h-full relative">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-3 bg-[#131D4F]"></div>
            <div className="absolute bottom-0 left-0 w-full h-6 bg-[#254D70] rounded-b-lg"></div>
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-3 bg-[#954C2E] rounded opacity-40"></div>
          </div>
        </div>

        {/* 6. Gear - Grid Position 6 */}
        <div
          className="absolute w-7 h-7 animate-spin-slow opacity-40"
          style={{
            top: '48%',
            left: '62%',
            transform: 'translateX(6px) translateY(15px)',
          }}
        >
          <div className="w-full h-full relative">
            <div className="absolute inset-1 bg-[#131D4F] rounded-full"></div>
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-2 bg-[#254D70]"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-2 bg-[#254D70]"></div>
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-2 h-1 bg-[#254D70]"></div>
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-1 bg-[#254D70]"></div>
          </div>
        </div>

        {/* 7. Compass - Grid Position 7 */}
        <div
          className="absolute w-6 h-6 animate-spin-slow opacity-40"
          style={{
            top: '55%',
            left: '28%',
            transform: 'translateX(-8px) translateY(12px)',
          }}
        >
          <div className="w-full h-full relative">
            <div className="absolute inset-0 border-2 border-[#254D70] rounded-full"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-3 bg-[#954C2E]"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-1 bg-[#131D4F]"></div>
          </div>
        </div>

        {/* 8. Telescope - Grid Position 8 */}
        <div
          className="absolute w-10 h-4 animate-float opacity-40"
          style={{
            top: '62%',
            left: '88%',
            transform: 'translateX(-15px) translateY(-3px)',
          }}
        >
          <div className="w-full h-full relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-6 h-3 bg-[#131D4F] rounded-l-full"></div>
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-2 bg-[#254D70] rounded-r-full"></div>
            <div className="absolute left-5 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-[#954C2E]"></div>
          </div>
        </div>

        {/* 9. Thermometer - Grid Position 9 */}
        <div
          className="absolute w-2 h-12 animate-float-slow opacity-40"
          style={{
            top: '68%',
            left: '15%',
            transform: 'translateX(12px) translateY(-10px)',
          }}
        >
          <div className="w-full h-full relative">
            <div className="absolute top-0 left-0 w-full h-8 bg-[#EFE4D2] rounded-t-full border border-[#254D70]"></div>
            <div className="absolute bottom-0 left-0 w-full h-4 bg-[#954C2E] rounded-full"></div>
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-px h-4 bg-[#131D4F]"></div>
          </div>
        </div>

        {/* 10. Scale - Grid Position 10 */}
        <div
          className="absolute w-8 h-6 animate-float opacity-40"
          style={{
            top: '75%',
            left: '45%',
            transform: 'translateX(-5px) translateY(8px)',
          }}
        >
          <div className="w-full h-full relative">
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-4 bg-[#131D4F]"></div>
            <div className="absolute top-0 left-0 w-3 h-2 bg-[#254D70] rounded"></div>
            <div className="absolute top-0 right-0 w-3 h-2 bg-[#954C2E] rounded"></div>
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-4 h-px bg-[#131D4F]"></div>
          </div>
        </div>

        {/* 11. Prism - Grid Position 11 */}
        <div
          className="absolute w-6 h-4 animate-float-slow opacity-40"
          style={{
            top: '82%',
            left: '72%',
            transform: 'translateX(8px) translateY(-12px)',
          }}
        >
          <div className="w-full h-full relative">
            <div className="absolute inset-0 bg-[#EFE4D2] transform skew-x-12 border border-[#254D70]"></div>
            <div className="absolute top-1 left-1 w-1 h-1 bg-[#954C2E] rounded-full"></div>
            <div className="absolute bottom-1 right-1 w-1 h-1 bg-[#131D4F] rounded-full"></div>
          </div>
        </div>

        {/* 12. Hourglass - Grid Position 12 */}
        <div
          className="absolute w-4 h-8 animate-float opacity-40"
          style={{
            top: '88%',
            left: '22%',
            transform: 'translateX(-10px) translateY(-8px)',
          }}
        >
          <div className="w-full h-full relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#131D4F] rounded-t"></div>
            <div className="absolute bottom-0 left-0 w-full h-2 bg-[#131D4F] rounded-b"></div>
            <div
              className="absolute top-2 left-1/2 transform -translate-x-1/2 w-2 h-4 bg-[#EFE4D2] border-l-2 border-r-2 border-[#254D70]"
              style={{ clipPath: 'polygon(0 0, 100% 0, 50% 50%, 100% 100%, 0 100%, 50% 50%)' }}
            ></div>
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-3 h-1 bg-[#954C2E] opacity-40"></div>
          </div>
        </div>

        {/* 13. Crystal - Grid Position 13 */}
        <div
          className="absolute w-5 h-7 animate-float opacity-40"
          style={{
            top: '5%',
            left: '52%',
            transform: 'translateX(12px) translateY(18px)',
          }}
        >
          <div className="w-full h-full relative">
            <div
              className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-2 bg-[#EFE4D2] border border-[#254D70]"
              style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
            ></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-[#EFE4D2] border border-[#254D70]"></div>
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-1 h-3 bg-[#954C2E] opacity-40"></div>
          </div>
        </div>

        {/* 14. Satellite - Grid Position 14 */}
        <div
          className="absolute w-8 h-6 animate-float-slow opacity-40"
          style={{
            top: '18%',
            left: '5%',
            transform: 'translateX(8px) translateY(-5px)',
          }}
        >
          <div className="w-full h-full relative">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-3 bg-[#131D4F] rounded"></div>
            <div className="absolute top-0 left-0 w-2 h-1 bg-[#254D70]"></div>
            <div className="absolute top-0 right-0 w-2 h-1 bg-[#254D70]"></div>
            <div className="absolute bottom-0 left-1/4 w-1 h-2 bg-[#954C2E]"></div>
            <div className="absolute bottom-0 right-1/4 w-1 h-2 bg-[#954C2E]"></div>
          </div>
        </div>

        {/* 15. Rocket - Grid Position 15 */}
        <div
          className="absolute w-4 h-10 animate-float-slow opacity-40"
          style={{
            top: '92%',
            left: '58%',
            transform: 'translateX(-8px) translateY(-15px)',
          }}
        >
          <div className="w-full h-full relative">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-[#254D70] rounded-t-full"></div>
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-4 h-5 bg-[#EFE4D2] border border-[#131D4F]"></div>
            <div className="absolute bottom-0 left-0 w-1 h-2 bg-[#954C2E]"></div>
            <div className="absolute bottom-0 right-0 w-1 h-2 bg-[#954C2E]"></div>
            <div className="absolute top-5 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-[#131D4F] rounded-full"></div>
          </div>
        </div>

        {/* 16. Planet - Grid Position 16 */}
        <div
          className="absolute w-9 h-9 animate-spin-slow opacity-40"
          style={{
            top: '38%',
            left: '92%',
            transform: 'translateX(-18px) translateY(5px)',
          }}
        >
          <div className="w-full h-full relative">
            <div className="absolute inset-0 bg-[#254D70] rounded-full"></div>
            <div className="absolute top-1 left-1 w-2 h-2 bg-[#954C2E] rounded-full opacity-40"></div>
            <div className="absolute bottom-2 right-2 w-1 h-1 bg-[#EFE4D2] rounded-full"></div>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-[#131D4F] transform -rotate-12"></div>
          </div>
        </div>
      </div>

      {/* Content Container - Scrollable */}
      <div className="h-full w-full overflow-y-auto">
        <div className="min-h-full flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            {/* Section */}

            {/* Sign In Section */}
            <div className="space-y-8">
            {/* Google Sign-in Button */}

            <button
              onClick={() => {
                const url = redirectTo ? `/auth/google?redirectTo=${encodeURIComponent(redirectTo)}` : '/auth/google';
                navigate(url);
              }}
              className="w-full bg-black text-white font-medium py-4 px-6 rounded-xl transition-all duration-200 hover:bg-gray-900 active:scale-[0.98] flex items-center justify-center space-x-3"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>{t('loginPage.signInWithGoogle')}</span>
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">{t('loginPage.orDivider')}</span>
              </div>
            </div>

            {/* Alternative Sign In Options */}
            <div className="space-y-3">
              <button
                disabled
                className="w-full bg-gray-100 text-gray-400 font-medium py-4 px-6 rounded-xl cursor-not-allowed flex items-center justify-center space-x-3"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span>{t('loginPage.appleIdButton')}</span>
              </button>

              <button
                disabled
                className="w-full bg-gray-100 text-gray-400 font-medium py-4 px-6 rounded-xl cursor-not-allowed flex items-center justify-center space-x-3"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span>{t('loginPage.microsoftButton')}</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 text-center">
            <div className="flex items-center justify-center space-x-6 text-xs text-gray-400">
              <a href="#" className="hover:text-gray-600 transition-colors">
                {t('loginPage.footer.privacyPolicy')}
              </a>
              <a href="#" className="hover:text-gray-600 transition-colors">
                {t('loginPage.footer.termsOfService')}
              </a>
              <a href="#" className="hover:text-gray-600 transition-colors">
                {t('loginPage.footer.support')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 401) {
    return <ErrorPage statusCode={401} messageKey="errors.generic.message" returnTo="/" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/" />;
}

import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const error = searchParams.get('error');
  const googleError =
    error === 'google-auth-unavailable'
      ? 'Google 登入服務暫時無法使用'
      : error === 'google-auth-failed'
        ? 'Google 登入失敗，請稍後再試'
        : null;

  return (
    <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 max-w-4xl mx-auto">
      {/* Login Form */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full lg:w-96 space-y-6"
      >
        <div className="text-center lg:text-left space-y-3">
          <h1 className="text-3xl font-bold text-slate-900">歡迎回來</h1>
        </div>

        {googleError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center text-red-700 text-sm">
            {googleError}
          </div>
        )}

        <Button
          size="lg"
          className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 shadow-sm"
          onClick={() => navigate('/auth/google')}
        >
          <img src="/google.svg" alt="Google" className="w-5 h-5 mr-3" />
          使用 Google 登入
        </Button>

        <p className="text-xs text-slate-500 text-center lg:text-left">
          繼續即表示您同意我們的服務條款
        </p>
      </motion.div>

      {/* Animation */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex flex-col items-center space-y-4"
      >
        <div 
          dangerouslySetInnerHTML={{
            __html: `<dotlottie-player src="https://lottie.host/bcc5236c-6c82-41fe-b3d3-b5b56788dba4/zMc5oNJZGX.lottie" background="transparent" speed="1" style="width: 300px; height: 300px" loop autoplay></dotlottie-player>`
          }}
        />
        
      </motion.div>
    </div>
  );
}

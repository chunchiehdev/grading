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
    <div className="flex flex-col items-center justify-center min-h-screen w-full px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center gap-8 max-w-md w-full"
      >
        {/* App Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            GradSystem
          </h1>
          <p className="text-lg text-muted-foreground">
            智能作業評分系統
          </p>
        </motion.div>

        {/* Error Message */}
        {googleError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full rounded-2xl bg-red-50 border border-red-200 p-4 text-center text-red-700 dark:bg-red-950/20 dark:border-red-900/20 dark:text-red-400"
          >
            {googleError}
          </motion.div>
        )}

        {/* Login Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-full"
        >
          <Button
            size="lg"
            className="w-full h-14 text-lg font-medium rounded-2xl bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] dark:bg-gray-900 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800"
            onClick={() => navigate('/auth/google')}
          >
            <img src="/google.svg" alt="Google" className="w-6 h-6 mr-3" />
            使用 Google 登入
          </Button>
        </motion.div>

        {/* Footer Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-sm text-muted-foreground text-center"
        >
          安全登入，開始您的智能評分之旅
        </motion.p>
      </motion.div>
    </div>
  );
}

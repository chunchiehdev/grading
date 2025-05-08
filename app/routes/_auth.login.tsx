import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';

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
    <div className="flex flex-col items-center gap-5">
      {googleError && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{googleError}</div>}
      <Button
        variant="outline"
        className="inline-flex items-center justify-center gap-2 h-11 rounded-xl px-5 font-medium bg-background hover:bg-white dark:bg-secondary dark:hover:bg-secondary/80 border border-border hover:border-gray-300 transition-all"
        onClick={() => navigate('/auth/google')}
      >
        <img src="/google.svg" alt="" className="w-4 h-4" />
        使用 Google 登入
      </Button>
    </div>
  );
}

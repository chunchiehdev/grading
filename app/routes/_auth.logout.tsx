import { useLogout } from '@/hooks/useAuth';
import { useEffect } from 'react';

export default function LogoutPage() {
  const logout = useLogout();

  useEffect(() => {
    logout.mutateAsync();
  }, [logout]);

  return null;
}

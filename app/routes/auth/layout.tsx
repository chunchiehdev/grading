import { Outlet } from 'react-router';
import Background from '@/components/landing/Background';

export default function AuthLayout() {
  return (
    <>
      <Background />
      <Outlet />
    </>
  );
}

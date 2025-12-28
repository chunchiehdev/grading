/**
 * 登出頁面 - 現在登出邏輯已移到 API 端點
 * 這個路由保留作為備用,直接重定向到首頁
 */
import { useRouteError, isRouteErrorResponse, redirect } from 'react-router';
import { ErrorPage } from '@/components/errors/ErrorPage';
export async function loader() {
  // 如果有人直接訪問這個路由，重定向到首頁
  return Response.redirect('/?logout=direct', 302);
}

export default function LogoutPage() {
  // 這個組件不會被渲染，因為 loader 會重定向
  return null;
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 401) {
    return <ErrorPage statusCode={401} messageKey="errors.generic.message" returnTo="/" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/" />;
}

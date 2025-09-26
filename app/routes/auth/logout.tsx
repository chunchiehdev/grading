/**
 * 登出頁面 - 現在登出邏輯已移到 API 端點
 * 這個路由保留作為備用，直接重定向到首頁
 */
export async function loader() {
  // 如果有人直接訪問這個路由，重定向到首頁
  return Response.redirect('/?logout=direct', 302);
}

export default function LogoutPage() {
  // 這個組件不會被渲染，因為 loader 會重定向
  return null;
}

import { Link } from "react-router";
import { requireUserId } from "@/services/auth.server";
import { Button } from "@/components/ui/button";

// 確保用戶必須登入才能訪問此頁面
export async function loader({ request }: { request: Request }) {
  return await requireUserId(request);
}

export default function Dashboard() {
  return (
    <div className="container py-10 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">儀表板</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard 
          title="批改作業" 
          description="開始批改新的作業或查看已批改的作業"
          linkTo="/assignments/grading-with-rubric"
        />
        
        <DashboardCard 
          title="評分歷史" 
          description="檢視過去的評分記錄和統計數據"
          linkTo="/grading-history"
        />
        
        <DashboardCard 
          title="評分標準" 
          description="管理和編輯評分標準"
          linkTo="/rubrics"
        />
      </div>
    </div>
  );
}

function DashboardCard({ 
  title, 
  description, 
  linkTo 
}: { 
  title: string; 
  description: string; 
  linkTo: string 
}) {
  return (
    <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">{description}</p>
      <Link to={linkTo}>
        <Button variant="outline" className="w-full">前往</Button>
      </Link>
    </div>
  );
} 
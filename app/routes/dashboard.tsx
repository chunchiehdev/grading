import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { GraduationCap, BarChart3, Settings, Clock, FileText } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">
          儀表板
        </h1>
        <p className="text-slate-600">
          歡迎回來！今天是個開始評分的好日子
        </p>
      </div>

      {/* Asymmetric Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Action - 2/3 width */}
        <div className="lg:col-span-2">
          <PrimaryCard />
        </div>

        {/* Secondary Functions - 1/3 width, stacked */}
        <div>
          <SecondaryCard 
            title="評分歷史" 
            count="127 份已完成"
            description="查看過往評分記錄"
            linkTo="/grading-history"
            icon={BarChart3}
          />
          <div className="mt-6">
            <SecondaryCard 
              title="評分標準" 
              count="5 套標準"
              description="管理評分準則"
              linkTo="/rubrics"
              icon={Settings}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PrimaryCard() {
  const recentFiles = [
    { name: "期中考試卷", subject: "數學", date: "2 小時前" },
    { name: "作文習作", subject: "國文", date: "昨天" },
    { name: "實驗報告", subject: "物理", date: "3 天前" }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">開始批改</h2>
            <p className="text-sm text-slate-600">3 份作業待批改</p>
          </div>
        </div>
        <Link to="/grading-with-rubric">
          <Button className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg">
            立即開始
          </Button>
        </Link>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-sm font-medium text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" strokeWidth={1.5} />
          最近上傳的作業
        </h3>
        <div className="space-y-3">
          {recentFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-600">{file.subject}</p>
                </div>
              </div>
              <span className="text-xs text-slate-500">{file.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
        <div className="text-center">
          <p className="text-2xl font-semibold text-slate-900">24</p>
          <p className="text-xs text-slate-600">本週已批改</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-semibold text-slate-900">4.2</p>
          <p className="text-xs text-slate-600">平均分數</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-semibold text-slate-900">15分</p>
          <p className="text-xs text-slate-600">平均批改時間</p>
        </div>
      </div> */}
    </div>
  );
}

function SecondaryCard({ 
  title, 
  count, 
  description, 
  linkTo, 
  icon: Icon 
}: { 
  title: string; 
  count: string; 
  description: string; 
  linkTo: string; 
  icon: any; 
}) {
  return (
    <Link to={linkTo}>
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 group">
        <div className="flex items-start justify-between mb-4">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-slate-200 transition-colors">
            <Icon className="w-4 h-4 text-slate-600 group-hover:text-slate-700" strokeWidth={1.5} />
          </div>
        </div>
        
        <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
        <p className="text-sm text-slate-700 font-medium mb-2">{count}</p>
        <p className="text-xs text-slate-600">{description}</p>
      </div>
    </Link>
  );
}

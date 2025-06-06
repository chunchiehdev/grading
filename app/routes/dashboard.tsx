import { Link, useLoaderData } from 'react-router';
import { Button } from '@/components/ui/button';
import { GraduationCap, BarChart3, Settings, Clock, FileText } from 'lucide-react';

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 60) {
    return `${diffInMinutes} 分鐘前`;
  } else if (diffInHours < 24) {
    return `${diffInHours} 小時前`;
  } else if (diffInDays === 1) {
    return '昨天';
  } else if (diffInDays < 7) {
    return `${diffInDays} 天前`;
  } else {
    return date.toLocaleDateString('zh-TW');
  }
}

export const loader = async ({ request }: { request: Request }) => {
  console.log('Fetching dashboard data in loader...');
  
  try {
    // Get user ID from session
    const { getUserId } = await import('@/services/auth.server');
    const userId = await getUserId(request);
    
    if (!userId) {
      throw new Response('Unauthorized', { status: 401 });
    }

    // Import all needed services
    const { listGradingSessions } = await import('@/services/grading-session.server');
    const { listRubrics } = await import('@/services/rubric.server');
    const { getUserFiles } = await import('@/services/uploaded-file.server');
    const { db } = await import('@/lib/db.server');

    // Fetch all data in parallel
    const [
      { sessions: allSessions, error: sessionsError },
      { rubrics: allRubrics, error: rubricsError },
      { files: recentFiles, error: filesError },
      pendingCount
    ] = await Promise.all([
      listGradingSessions(userId, 100, 0), // Get more sessions to count completed ones
      listRubrics(userId),
      getUserFiles(userId, { limit: 3, parseStatus: 'COMPLETED' }),
      // Count pending grading results directly from database
      db.gradingResult.count({
        where: {
          gradingSession: { userId },
          status: 'PENDING'
        }
      })
    ]);

    console.log('Dashboard data response:', {
      sessionsCount: allSessions?.length,
      rubricsCount: allRubrics?.length,
      recentFilesCount: recentFiles?.length,
      pendingCount
    });

    // Check for errors
    if (sessionsError || rubricsError || filesError) {
      const error = sessionsError || rubricsError || filesError;
      console.error('Error loading dashboard data:', error);
      return {
        completedGradingSessionsCount: 0,
        activeRubricsCount: 0,
        pendingAssignmentsCount: 0,
        recentUploadedFiles: [],
        error
      };
    }

    // Calculate completed sessions count
    const completedSessionsCount = allSessions?.filter(session => 
      session.status === 'COMPLETED'
    ).length || 0;

    // Active rubrics count (already filtered by listRubrics)
    const activeRubricsCount = allRubrics?.length || 0;

    // Format recent files for display
    const formattedRecentFiles = recentFiles?.map(file => ({
      id: file.id,
      fileName: file.originalFileName || file.fileName,
      createdAt: file.createdAt.toISOString()
    })) || [];

    return {
      completedGradingSessionsCount: completedSessionsCount,
      activeRubricsCount: activeRubricsCount,
      pendingAssignmentsCount: pendingCount,
      recentUploadedFiles: formattedRecentFiles,
      error: null
    };
  } catch (error) {
    console.error('Dashboard loader error:', error);
    
    if (error instanceof Response) {
      throw error;
    }
    
    return {
      completedGradingSessionsCount: 0,
      activeRubricsCount: 0,
      pendingAssignmentsCount: 0,
      recentUploadedFiles: [],
      error: 'Failed to load dashboard data'
    };
  }
};

export default function Dashboard() {
  const {
    completedGradingSessionsCount,
    activeRubricsCount,
    pendingAssignmentsCount,
    recentUploadedFiles,
    error
  } = useLoaderData<typeof loader>();

  console.log('Dashboard component state:', {
    completedGradingSessionsCount,
    activeRubricsCount,
    pendingAssignmentsCount,
    recentUploadedFiles,
    error
  });

  if (error) {
    console.error('Error in dashboard component:', error);
    return (
      <div className="w-full max-w-7xl mx-auto">
        <div className="text-center">
          <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg p-6 max-w-md mx-auto">
            <h3 className="font-semibold mb-2">載入失敗</h3>
            <p className="text-sm">{typeof error === 'string' ? error : '無法載入儀表板資料'}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              重新載入
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="lg:col-span-2 ">
          <PrimaryCard 
            pendingAssignmentsCount={pendingAssignmentsCount}
            recentUploadedFiles={recentUploadedFiles}
          />
        </div>

        {/* Secondary Functions - 1/3 width, stacked */}
        <div>
          <SecondaryCard 
            title="評分歷史" 
            countText={`${completedGradingSessionsCount} 份已完成`}
            description="查看過往評分記錄"
            linkTo="/grading-history"
            icon={BarChart3}
          />
          <div className="mt-6">
            <SecondaryCard 
              title="評分標準" 
              countText={`${activeRubricsCount} 套標準`}
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

function PrimaryCard({ 
  pendingAssignmentsCount, 
  recentUploadedFiles 
}: { 
  pendingAssignmentsCount: number;
  recentUploadedFiles: Array<{
    id: string;
    fileName: string;
    createdAt: string;
  }>;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[350px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">開始批改</h2>
            <p className="text-sm text-slate-600">{pendingAssignmentsCount} 份作業待批改</p>
          </div>
        </div>
        <Link to="/grading-with-rubric">
          <Button className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg">
            立即開始
          </Button>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="flex-1 flex flex-col min-h-0">
        {recentUploadedFiles.length > 0 ? (
          <>
            <h3 className="text-sm font-medium text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" strokeWidth={1.5} />
              最近上傳的作業
            </h3>
            <div className="space-y-3">
              {recentUploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{file.fileName}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatRelativeTime(new Date(file.createdAt))}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-slate-400" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-slate-500">還沒有上傳的作業</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SecondaryCard({ 
  title, 
  countText, 
  description, 
  linkTo, 
  icon: Icon 
}: { 
  title: string; 
  countText: string; 
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
        <p className="text-sm text-slate-700 font-medium mb-2">{countText}</p>
        <p className="text-xs text-slate-600">{description}</p>
      </div>
    </Link>
  );
}

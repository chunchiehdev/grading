import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  AlertCircle, 
  FileText, 
  File, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Loader2,
  Eye,
  Calendar,
  BarChart3,
  Users,
  User,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { type GradingSession, type GradingResult } from '@/types/database';

type SessionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
type GradingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
type ViewMode = 'my' | 'all';

interface GradingSessionWithResults extends GradingSession {
  user?: {
    id: string;
    email: string;
  };
  gradingResults: (GradingResult & {
    uploadedFile: {
      fileName: string;
      originalFileName: string;
    };
    rubric: {
      name: string;
    };
  })[];
}

export default function GradingHistoryPage() {
  const [sessions, setSessions] = useState<GradingSessionWithResults[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(20);
  const [viewMode, setViewMode] = useState<ViewMode>('my');

  // Load grading sessions
  const loadSessions = useCallback(async (currentOffset = 0, mode: ViewMode = viewMode) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/grading/session?view=${mode}&limit=${limit}&offset=${currentOffset}`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        setSessions(data.data || []);
        setTotal(data.meta?.total || 0);
        setOffset(currentOffset);
      } else {
        setError(data.error || 'Failed to load grading sessions');
        setSessions([]);
      }
    } catch (err) {
      setError('Failed to load grading sessions');
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit, viewMode]);

  // Handle view mode change
  const handleViewModeChange = useCallback((newMode: ViewMode) => {
    setViewMode(newMode);
    setOffset(0);
    loadSessions(0, newMode);
  }, [loadSessions]);

  // Get session status display
  const getSessionStatusDisplay = (status: SessionStatus) => {
    switch (status) {
      case 'PENDING':
        return { icon: Clock, color: 'text-yellow-500', text: '等待開始', variant: 'secondary' as const };
      case 'PROCESSING':
        return { icon: Loader2, color: 'text-blue-500', text: '評分中', variant: 'default' as const };
      case 'COMPLETED':
        return { icon: CheckCircle, color: 'text-green-500', text: '已完成', variant: 'default' as const };
      case 'FAILED':
        return { icon: AlertTriangle, color: 'text-red-500', text: '失敗', variant: 'destructive' as const };
      case 'CANCELLED':
        return { icon: AlertCircle, color: 'text-gray-500', text: '已取消', variant: 'secondary' as const };
      default:
        return { icon: Clock, color: 'text-gray-500', text: '未知', variant: 'secondary' as const };
    }
  };

  // Get grading status display
  const getGradingStatusDisplay = (status: GradingStatus) => {
    switch (status) {
      case 'PENDING':
        return { icon: Clock, color: 'text-yellow-500', text: '等待評分' };
      case 'PROCESSING':
        return { icon: Loader2, color: 'text-blue-500', text: '評分中' };
      case 'COMPLETED':
        return { icon: CheckCircle, color: 'text-green-500', text: '評分完成' };
      case 'FAILED':
        return { icon: AlertTriangle, color: 'text-red-500', text: '評分失敗' };
      case 'SKIPPED':
        return { icon: AlertCircle, color: 'text-gray-500', text: '已跳過' };
      default:
        return { icon: Clock, color: 'text-gray-500', text: '未知狀態' };
    }
  };

  // Calculate session statistics
  const getSessionStats = (session: GradingSessionWithResults) => {
    const totalTasks = session.gradingResults.length;
    const completedTasks = session.gradingResults.filter(r => r.status === 'COMPLETED').length;
    const failedTasks = session.gradingResults.filter(r => r.status === 'FAILED').length;
    const processingTasks = session.gradingResults.filter(r => r.status === 'PROCESSING').length;
    
    return {
      totalTasks,
      completedTasks,
      failedTasks,
      processingTasks,
      successRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };
  };

  // Load sessions on component mount
  useEffect(() => {
    loadSessions(0);
  }, [loadSessions]);

  // Auto-refresh processing sessions
  useEffect(() => {
    const processingCount = sessions.filter(s => s.status === 'PROCESSING').length;
    
    if (processingCount > 0) {
      const interval = setInterval(() => {
        loadSessions(offset, viewMode);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [sessions, offset, viewMode, loadSessions]);

  const hasNextPage = offset + limit < total;
  const hasPrevPage = offset > 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">評分歷史</h1>
          <p className="text-muted-foreground">
            查看{viewMode === 'my' ? '您的' : '所有用戶的'}評分會話記錄和結果
          </p>
        </div>
        <div className="flex gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-md border border-input bg-background">
            <Button
              variant={viewMode === 'my' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('my')}
              className="rounded-r-none"
            >
              <User className="h-3 w-3 mr-1" />
              我的評分
            </Button>
            <Button
              variant={viewMode === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('all')}
              className="rounded-l-none"
            >
              <Users className="h-3 w-3 mr-1" />
              所有評分
            </Button>
          </div>
          <Button asChild>
            <Link to="/student/assignments">
              前往作業
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 border border-red-300 bg-red-50 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
            <p className="text-red-800">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-auto"
              onClick={() => setError(null)}
            >
              關閉
            </Button>
          </div>
        </div>
      )}

      {isLoading && sessions.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          title={viewMode === 'my' ? "還沒有評分記錄" : "還沒有任何評分記錄"}
          description={viewMode === 'my' ? "開始您的第一次評分，記錄將會出現在這裡。" : "目前系統中還沒有任何評分記錄。"}
          actionText="開始評分"
          actionLink="/grading-with-rubric"
          icon={<BarChart3 className="h-12 w-12" />}
        />
      ) : (
        <div className="space-y-6">
          {/* Session List */}
          <div className="space-y-4">
            {sessions.map((session) => {
              const statusDisplay = getSessionStatusDisplay(session.status);
              const StatusIcon = statusDisplay.icon;
              const stats = getSessionStats(session);
              
              return (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <StatusIcon className={`h-5 w-5 ${statusDisplay.color} ${statusDisplay.icon === Loader2 ? 'animate-spin' : ''}`} />
                          <CardTitle className="text-lg">
                            評分會話 #{session.id.slice(-8)}
                          </CardTitle>
                          <Badge variant={statusDisplay.variant}>
                            {statusDisplay.text}
                          </Badge>
                          {viewMode === 'all' && session.user && (
                            <Badge variant="outline" className="text-xs">
                              <User className="h-2 w-2 mr-1" />
                              {session.user.email}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>建立於 {format(new Date(session.createdAt), 'yyyy/MM/dd HH:mm', { locale: zhTW })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <File className="h-3 w-3" />
                            <span>{stats.totalTasks} 個評分任務</span>
                          </div>
                        </div>
                      </div>
                      {/* <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {session.progress}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          完成進度
                        </div>
                      </div> */}
                    </div>
                    
                    {/* Progress Bar */}
                    <Progress value={session.progress} className="mt-3" />
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      {/* Statistics */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                          <div className="text-lg font-semibold text-green-600">
                            {stats.completedTasks}
                          </div>
                          <div className="text-xs text-muted-foreground">已完成</div>
                        </div>
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                          <div className="text-lg font-semibold text-blue-600">
                            {stats.processingTasks}
                          </div>
                          <div className="text-xs text-muted-foreground">進行中</div>
                        </div>
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                          <div className="text-lg font-semibold text-red-600">
                            {stats.failedTasks}
                          </div>
                          <div className="text-xs text-muted-foreground">失敗</div>
                        </div>
                        {/* <div className="text-center p-3 bg-muted/30 rounded-lg">
                          <div className="text-lg font-semibold text-primary">
                            {stats.successRate}%
                          </div>
                          <div className="text-xs text-muted-foreground">成功率</div>
                        </div> */}
                      </div>

                      {/* Recent Results Preview */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">評分任務預覽 (前3項)</h4>
                        <div className="space-y-2">
                          {session.gradingResults.slice(0, 3).map((result) => {
                            const resultStatusDisplay = getGradingStatusDisplay(result.status);
                            const ResultIcon = resultStatusDisplay.icon;
                            
                            return (
                              <div key={result.id} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                                <div className="flex items-center gap-2">
                                  <File className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm font-medium">
                                    {result.uploadedFile.originalFileName}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    • {result.rubric.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ResultIcon className={`h-3 w-3 ${resultStatusDisplay.color} ${resultStatusDisplay.icon === Loader2 ? 'animate-spin' : ''}`} />
                                  <span className="text-xs">{resultStatusDisplay.text}</span>
                                </div>
                              </div>
                            );
                          })}
                          {session.gradingResults.length > 3 && (
                            <div className="text-xs text-muted-foreground text-center py-1">
                              還有 {session.gradingResults.length - 3} 個任務...
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" asChild>
                          <Link 
                            to={`/grading-history/${session.id}${viewMode === 'all' ? '?access=any' : ''}`}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            查看詳情
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {(hasNextPage || hasPrevPage) && (
            <div className="flex justify-between items-center pt-6">
              <Button 
                variant="outline" 
                onClick={() => loadSessions(offset - limit)}
                disabled={!hasPrevPage || isLoading}
              >
                上一頁
              </Button>
              <span className="text-sm text-muted-foreground">
                顯示 {offset + 1} - {Math.min(offset + limit, total)} / {total} 個會話
                {viewMode === 'all' && <span className="ml-1">(所有用戶)</span>}
              </span>
              <Button 
                variant="outline" 
                onClick={() => loadSessions(offset + limit)}
                disabled={!hasNextPage || isLoading}
              >
                下一頁
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertCircle, 
  FileText, 
  File, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Loader2,
  ArrowLeft,
  Eye,
  Calendar,
  BarChart3,
  Star,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { type GradingSession, type GradingResult } from '@/types/database';
import { type GradingResultData } from '@/types/grading';

type SessionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
type GradingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

interface GradingResultWithRelations {
  id: string;
  status: GradingStatus;
  progress: number;
  result: any; // JSON from database
  errorMessage?: string;
  uploadedFile: {
    fileName: string;
    originalFileName: string;
  };
  rubric: {
    name: string;
  };
}

interface GradingSessionDetails extends GradingSession {
  user?: {
    id: string;
    email: string;
  };
  gradingResults: GradingResultWithRelations[];
}

export default function GradingSessionDetailPage() {
  const { sessionId } = useParams();
  const [session, setSession] = useState<GradingSessionDetails | null>(null);
  const [selectedResult, setSelectedResult] = useState<GradingResultWithRelations | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load session data
  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) {
        setError('Session ID is required');
        setIsLoading(false);
        return;
      }

      try {
        // Check URL parameters to determine access mode
        const urlParams = new URLSearchParams(window.location.search);
        const accessMode = urlParams.get('access') || 'my';
        
        const response = await fetch(`/api/grading/session/${sessionId}?access=${accessMode}`, {
          credentials: 'include',
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          setError(data.error || 'Session not found');
          return;
        }
        
        setSession(data.session);
      } catch (err) {
        console.error('Failed to load session details:', err);
        setError('Failed to load session details');
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">載入中...</span>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">載入失敗</h1>
          <p className="text-muted-foreground mb-4">{error || 'Session not found'}</p>
          <Button asChild>
            <Link to="/grading-history">返回歷史記錄</Link>
          </Button>
        </div>
      </div>
    );
  }

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
  const getSessionStats = () => {
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

  const statusDisplay = getSessionStatusDisplay(session.status);
  const StatusIcon = statusDisplay.icon;
  const stats = getSessionStats();

  // Handle viewing detailed result
  const handleViewResult = (result: GradingResultWithRelations) => {
    setSelectedResult(result);
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link to="/grading-history">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回歷史記錄
          </Link>
        </Button>
        <div className="space-y-1">
          {/* <h1 className="text-3xl font-bold">評分會話詳情</h1> */}
          {/* <p className="text-muted-foreground">
            會話 ID: {session.id}
          </p> */}
        </div>
      </div>

      {/* Session Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <StatusIcon className={`h-6 w-6 ${statusDisplay.color} ${statusDisplay.icon === Loader2 ? 'animate-spin' : ''}`} />
                <CardTitle className="text-xl">
                  評分會話 #{session.id.slice(-8)}
                </CardTitle>
                <Badge variant={statusDisplay.variant}>
                  {statusDisplay.text}
                </Badge>
                {session.user && (
                  <Badge variant="outline" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    {session.user.email}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>建立於 {format(new Date(session.createdAt), 'yyyy/MM/dd HH:mm', { locale: zhTW })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <File className="h-4 w-4" />
                  <span>{stats.totalTasks} 個評分任務</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {session.progress}%
              </div>
              <div className="text-sm text-muted-foreground">
                完成進度
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <Progress value={session.progress} className="mt-4" />
        </CardHeader>
        
        <CardContent>
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.completedTasks}
              </div>
              <div className="text-sm text-muted-foreground">已完成</div>
            </div>
            <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.processingTasks}
              </div>
              <div className="text-sm text-muted-foreground">進行中</div>
            </div>
            <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {stats.failedTasks}
              </div>
              <div className="text-sm text-muted-foreground">失敗</div>
            </div>
            <div className="text-center p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {stats.successRate}%
              </div>
              <div className="text-sm text-muted-foreground">成功率</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grading Results List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            評分結果列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {session.gradingResults.map((result) => {
              const resultStatusDisplay = getGradingStatusDisplay(result.status);
              const ResultIcon = resultStatusDisplay.icon;
              
              return (
                <Card key={result.id} className="border-l-4 border-l-slate-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <File className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h4 className="font-semibold">
                              {result.uploadedFile.originalFileName}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              評分標準: {result.rubric.name}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <ResultIcon className={`h-4 w-4 ${resultStatusDisplay.color} ${resultStatusDisplay.icon === Loader2 ? 'animate-spin' : ''}`} />
                            <Badge variant={result.status === 'COMPLETED' ? 'default' : 'secondary'}>
                              {resultStatusDisplay.text}
                            </Badge>
                          </div>
                          
                          {result.status === 'COMPLETED' && result.result && (
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              <span className="font-medium">
                                {((result.result as any)?.totalScore) || 0} / {((result.result as any)?.maxScore) || 100} 分
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {result.progress > 0 && result.status === 'PROCESSING' && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>進度</span>
                              <span>{result.progress}%</span>
                            </div>
                            <Progress value={result.progress} className="h-2" />
                          </div>
                        )}
                        
                        {result.errorMessage && (
                          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                            錯誤: {result.errorMessage}
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4">
                        {result.status === 'COMPLETED' && result.result ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewResult(result)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            查看完整報告
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            無可用報告
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {session.gradingResults.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">此會話沒有評分任務</p>
                <p className="text-muted-foreground">這個評分會話可能遇到了問題</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Result Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedResult?.uploadedFile.originalFileName} - 評分報告
            </DialogTitle>
          </DialogHeader>
          
          {selectedResult?.result && (
            <GradingResultDisplay 
              result={selectedResult.result as unknown as GradingResultData}
              className="mt-4"
            />
          )}
          
          {!selectedResult?.result && (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">無法載入評分結果</p>
              <p className="text-muted-foreground">評分資料可能不完整或已損壞</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 
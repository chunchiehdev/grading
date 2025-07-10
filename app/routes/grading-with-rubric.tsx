import { useState, useCallback, useEffect } from 'react';
import { CompactFileUpload } from '@/components/grading/CompactFileUpload';
import { type GradingResultData } from '@/types/grading';
import { ResultCardList } from '@/components/grading/ResultCardList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertCircle, 
  FileText, 
  File, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Loader2,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { type Rubric } from '@/types/rubric';
import { type UploadedFile, type GradingSession, type GradingResult } from '@/types/database';

type ParseStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type GradingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

interface FileSelection {
  fileId: string;
  fileName: string;
  parseStatus: ParseStatus;
  selected: boolean;
}

interface RubricSelection {
  rubricId: string;
  rubricName: string;
  selected: boolean;
}

interface GradingSessionDetails extends GradingSession {
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

export default function GradingWithRubricPage() {
  const [step, setStep] = useState<'upload' | 'configure' | 'grading' | 'results'>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [fileSelections, setFileSelections] = useState<FileSelection[]>([]);
  const [rubricSelections, setRubricSelections] = useState<RubricSelection[]>([]);
  const [gradingSession, setGradingSession] = useState<GradingSessionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isLoadingRubrics, setIsLoadingRubrics] = useState(false);
  const [filePairings, setFilePairings] = useState<Record<string, string>>({});

  // Load user's uploaded files
  const loadUserFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch('/api/files/user-files?parseStatus=COMPLETED', {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        setUploadedFiles(data.files || []);
        setFileSelections(data.files?.map((file: UploadedFile) => ({
          fileId: file.id,
          fileName: file.originalFileName || file.fileName,
          parseStatus: file.parseStatus,
          selected: false
        })) || []);
      } else {
        setError(data.error || 'Failed to load files');
        setUploadedFiles([]);
        setFileSelections([]);
      }
    } catch (err) {
      setError('Failed to load files');
      setUploadedFiles([]);
      setFileSelections([]);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  // Load rubrics
  const loadRubrics = useCallback(async () => {
    setIsLoadingRubrics(true);
    try {
      const response = await fetch('/api/rubrics', {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        setRubrics(data.rubrics || []);
        setRubricSelections(data.rubrics?.map((rubric: Rubric) => ({
          rubricId: rubric.id,
          rubricName: rubric.name,
          selected: false
        })) || []);
      } else {
        setError(data.error || 'Failed to load rubrics');
        setRubrics([]);
        setRubricSelections([]);
      }
    } catch (err) {
      setError('Failed to load rubrics');
      setRubrics([]);
      setRubricSelections([]);
    } finally {
      setIsLoadingRubrics(false);
    }
  }, []);

  // Handle file upload completion
  const handleFilesChange = useCallback((files: File[]) => {
    // Immediately reload to get the uploaded files
    loadUserFiles();
    
    // Set up polling to check for parsing completion
    const pollForParsingCompletion = () => {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch('/api/files/user-files', {
            credentials: 'include',
          });
          const data = await response.json();
          
          if (data.success) {
            const allParsed = data.files.every((file: any) => 
              file.parseStatus === 'COMPLETED' || file.parseStatus === 'FAILED'
            );
            
            if (allParsed) {
              clearInterval(pollInterval);
              loadUserFiles(); // Final reload
              setStep('configure'); // Auto advance to next step
            } else {
              // Update state with current parsing status
              setUploadedFiles(data.files || []);
              setFileSelections(data.files?.map((file: any) => ({
                fileId: file.id,
                fileName: file.originalFileName || file.fileName,
                parseStatus: file.parseStatus,
                selected: false
              })) || []);
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2000); // Poll every 2 seconds
      
      // Stop polling after 60 seconds to prevent infinite polling
      setTimeout(() => {
        clearInterval(pollInterval);
      }, 60000);
    };
    
    // Start polling after a short delay
    setTimeout(pollForParsingCompletion, 1000);
  }, [loadUserFiles]);

  // Toggle file selection
  const toggleFileSelection = useCallback((fileId: string) => {
    setFileSelections(prev => 
      prev.map(selection => 
        selection.fileId === fileId 
          ? { ...selection, selected: !selection.selected }
          : selection
      )
    );
  }, []);

  // Toggle rubric selection
  const toggleRubricSelection = useCallback((rubricId: string) => {
    setRubricSelections(prev => 
      prev.map(selection => 
        selection.rubricId === rubricId 
          ? { ...selection, selected: !selection.selected }
          : selection
      )
    );
  }, []);

  // Load grading session details
  const loadGradingSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/grading/session/${sessionId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        setGradingSession(data.session);
      } else {
        setError(data.error || 'Failed to load grading session');
      }
    } catch (err) {
      setError('Failed to load grading session');
    }
  }, []);

  // Create grading session
  const createGradingSession = useCallback(async () => {
    const pairedFiles = Object.entries(filePairings)
      .filter(([fileId, rubricId]) => fileId && rubricId);
    
    if (pairedFiles.length === 0) {
      setError('請為至少一個檔案選擇評分標準');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      const fileIds = pairedFiles.map(([fileId]) => fileId);
      const rubricIds = pairedFiles.map(([, rubricId]) => rubricId);
      
      formData.append('fileIds', JSON.stringify(fileIds));
      formData.append('rubricIds', JSON.stringify(rubricIds));

      const response = await fetch('/api/grading/session', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        // Load the created session
        await loadGradingSession(data.sessionId);
        setStep('grading');
      } else {
        setError(data.error || 'Failed to create grading session');
      }
    } catch (err) {
      setError('Failed to create grading session');
    } finally {
      setIsLoading(false);
    }
  }, [filePairings, loadGradingSession]);

  // Start grading process
  const startGrading = useCallback(async () => {
    if (!gradingSession) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('action', 'start');

      const response = await fetch(`/api/grading/session/${gradingSession.id}`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        // Reload session to get updated status
        await loadGradingSession(gradingSession.id);
      } else {
        setError(data.error || 'Failed to start grading');
      }
    } catch (err) {
      setError('Failed to start grading');
    } finally {
      setIsLoading(false);
    }
  }, [gradingSession, loadGradingSession]);

  // Get parse status display
  const getParseStatusDisplay = (status: ParseStatus) => {
    switch (status) {
      case 'PENDING':
        return { icon: Clock, color: 'text-yellow-500', text: '等待解析' };
      case 'PROCESSING':
        return { icon: Loader2, color: 'text-blue-500', text: '解析中' };
      case 'COMPLETED':
        return { icon: CheckCircle, color: 'text-green-500', text: '解析完成' };
      case 'FAILED':
        return { icon: AlertTriangle, color: 'text-red-500', text: '解析失敗' };
      default:
        return { icon: Clock, color: 'text-gray-500', text: '未知狀態' };
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

  // Load data on component mount
  useEffect(() => {
    loadUserFiles();
    loadRubrics();
  }, [loadUserFiles, loadRubrics]);

  // Auto-refresh grading session if in progress
  useEffect(() => {
    if (gradingSession && gradingSession.status === 'PROCESSING') {
      const interval = setInterval(() => {
        loadGradingSession(gradingSession.id);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [gradingSession, loadGradingSession]);

  const selectedFilesCount = fileSelections.filter(s => s.selected).length;
  const selectedRubricsCount = rubricSelections.filter(s => s.selected).length;
  const totalGradingTasks = selectedFilesCount * selectedRubricsCount;

  // Delete file function (smart delete: hard/soft based on usage)
  const deleteFile = useCallback(async (fileId: string) => {
    if (!window.confirm('確定要刪除這個檔案嗎？')) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('fileId', fileId);

      const response = await fetch('/api/files', {
        method: 'DELETE',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        // Remove from local state
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        setFileSelections(prev => prev.filter(f => f.fileId !== fileId));
        
        // Remove from pairings
        setFilePairings(prev => {
          const updated = { ...prev };
          delete updated[fileId];
          return updated;
        });
        
        // Show success message based on deletion type
        if (data.deletionType === 'soft') {
          console.log('✅ 檔案已隱藏（因為已用於評分，保留資料完整性）');
        } else {
          console.log('✅ 檔案已永久刪除');
        }
      } else {
        setError(data.error || 'Failed to delete file');
      }
    } catch (err) {
      setError('刪除檔案時發生網路錯誤');
    }
  }, []);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 space-y-6">

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

      <Tabs value={step} className="">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" >1. 上傳文件</TabsTrigger>
          <TabsTrigger value="configure" disabled={uploadedFiles.length === 0} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            2. 選擇評分標準 
          </TabsTrigger>
          <TabsTrigger value="grading" disabled={!gradingSession} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            3. 執行評分
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!gradingSession || gradingSession.status !== 'COMPLETED'} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            4. 查看結果
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>上傳作業文件</CardTitle>
              <p className="text-sm text-muted-foreground">
                支援 PDF 格式，文件將自動解析以準備評分
              </p>
            </CardHeader>
            <CardContent>
              <CompactFileUpload
                maxFiles={10}
                maxFileSize={50 * 1024 * 1024}
                acceptedFileTypes={['.pdf']}
                onFilesChange={handleFilesChange}
                onError={setError}
              />
              
              {uploadedFiles.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">已上傳的文件 ({uploadedFiles.length})</h3>
                    <Button onClick={() => setStep('configure')} variant="outline">
                      配置評分
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {uploadedFiles.map((file) => {
                      const parseDisplay = getParseStatusDisplay(file.parseStatus);
                      const ParseIcon = parseDisplay.icon;
                      
                      return (
                        <div key={file.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <File className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{file.originalFileName || file.fileName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <ParseIcon className={`h-4 w-4 ${parseDisplay.color} ${parseDisplay.icon === Loader2 ? 'animate-spin' : ''}`} />
                              <Badge variant={file.parseStatus === 'COMPLETED' ? 'default' : 'secondary'}>
                                {parseDisplay.text}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteFile(file.id)}
                                className="ml-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {file.parseError && (
                            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                              錯誤: {file.parseError}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configure" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>選擇檔案與評分標準</CardTitle>
              <p className="text-sm text-muted-foreground">
                為每個檔案選擇一個評分標準，總共 {fileSelections.filter(f => f.parseStatus === 'COMPLETED').length} 個檔案待配對
              </p>
            </CardHeader>
            <CardContent>
              {rubrics.length === 0 ? (
                <EmptyState
                  title="沒有評分標準"
                  description="您需要先創建評分標準才能進行評分。"
                  actionText="創建評分標準"
                  actionLink="/rubrics/new"
                  icon={<AlertCircle className="h-10 w-10" />}
                />
              ) : (
                <div className="space-y-4">
                  {fileSelections
                    .filter(file => file.parseStatus === 'COMPLETED')
                    .map((fileSelection) => {
                      const parseDisplay = getParseStatusDisplay(fileSelection.parseStatus);
                      const ParseIcon = parseDisplay.icon;
                      const selectedRubric = rubrics.find(r => r.id === (filePairings[fileSelection.fileId] || ''));
                      
                      return (
                        <div key={fileSelection.fileId} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            {/* File info */}
                            <div className="flex items-center gap-3 flex-1">
                              <File className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{fileSelection.fileName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <ParseIcon className={`h-3 w-3 ${parseDisplay.color}`} />
                                  <span className="text-xs text-muted-foreground">{parseDisplay.text}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Arrow */}
                            <ArrowRight className="h-4 w-4 text-muted-foreground mx-4" />
                            
                            {/* Rubric selector */}
                            <div className="flex-1">
                              <Select
                                value={filePairings[fileSelection.fileId] || ''}
                                onValueChange={(value) => setFilePairings(prev => ({
                                  ...prev,
                                  [fileSelection.fileId]: value
                                }))}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="選擇評分標準..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {rubrics.map((rubric) => (
                                    <SelectItem key={rubric.id} value={rubric.id}>
                                      {rubric.name} 
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                            </div>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between items-center pt-6">
            <Button variant="outline" onClick={() => setStep('upload')}>
              返回上傳
            </Button>
            
            <Button 
              onClick={createGradingSession} 
              disabled={Object.keys(filePairings).length === 0 || isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              評分
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="grading" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                評分進行中
                {gradingSession && (
                  <Badge variant={gradingSession.status === 'PROCESSING' ? 'default' : 'secondary'}>
                    {gradingSession.status}
                  </Badge>
                )}
              </CardTitle>
              {gradingSession && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span></span>
                    <span></span>
                  </div>
                  <Progress value={gradingSession.progress} />
                </div>
              )}
            </CardHeader>
            <CardContent>
              {gradingSession ? (
                <div className="space-y-6">
                  <div className="flex gap-2">
                    {gradingSession.status === 'PENDING' && (
                      <Button onClick={startGrading} disabled={isLoading}>
                        <Play className="h-4 w-4 mr-2" />
                        開始評分
                      </Button>
                    )}
                    {gradingSession.status === 'PROCESSING' && (
                      <Button variant="outline" disabled>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        評分中...
                      </Button>
                    )}
                    {gradingSession.status === 'COMPLETED' && (
                      <Button onClick={() => setStep('results')}>
                        查看結果
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">評分任務 ({gradingSession.gradingResults.length})</h3>
                    {gradingSession.gradingResults.map((result) => {
                      const statusDisplay = getGradingStatusDisplay(result.status);
                      const StatusIcon = statusDisplay.icon;
                      
                      return (
                        <div key={result.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <File className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">
                                  {result.uploadedFile.originalFileName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  評分標準: {result.rubric.name}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusIcon className={`h-4 w-4 ${statusDisplay.color} ${statusDisplay.icon === Loader2 ? 'animate-spin' : ''}`} />
                              <Badge variant={result.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                {statusDisplay.text}
                              </Badge>
                            </div>
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
                            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                              錯誤: {result.errorMessage}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">沒有評分對話</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>評分結果</CardTitle>
            </CardHeader>
            <CardContent>
              {gradingSession && (() => {
                const completedResults = gradingSession.gradingResults.filter(r => r.status === 'COMPLETED' && r.result);
                
                if (completedResults.length === 0) {
                  return <p className="text-muted-foreground text-center py-8">尚無評分結果</p>;
                }

                const cardListResults = completedResults
                  .filter(result => result.result)
                  .map((result) => ({
                    id: result.id,
                    title: `${result.uploadedFile.originalFileName} - ${result.rubric.name}`,
                    fileName: result.uploadedFile.originalFileName,
                    rubricName: result.rubric.name,
                    result: result.result as unknown as GradingResultData
                  }));

                return cardListResults.length > 0 
                  ? <ResultCardList results={cardListResults} />
                  : <p className="text-muted-foreground text-center py-8">評分結果資料不完整</p>;
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
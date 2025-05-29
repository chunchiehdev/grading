import { useState, useCallback, useEffect } from 'react';
import type { LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { CompactFileUpload } from '@/components/grading/CompactFileUpload';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GradingProgress } from '@/components/grading/GradingProgress';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';

import { AlertCircle, FileText, File, CheckCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import type { Rubric, RubricCriteria } from '@/types/grading';
import type { UploadedFileInfo } from '@/types/files';
import { listRubrics } from '@/services/rubric.server';
import { useUiStore } from '@/stores/uiStore';
import { useGrading } from '@/hooks/useGrading';
import { useGradingStore, useHasHydrated } from '@/stores/gradingStore';
import { useFetcher } from '@remix-run/react';

export async function loader({ request }: LoaderFunctionArgs) {
  const { rubrics, error } = await listRubrics();

  return Response.json({
    rubrics: rubrics || [],
    error,
  });
}

// Helper component while hydrating
function HydrationWaiting() {
  return (
    <div className="flex flex-col items-center justify-center h-40">
      <p className="text-muted-foreground mb-2">正在載入資料...</p>
    </div>
  );
}

type ParseStatus = 'pending' | 'processing' | 'success' | 'failed';
type GradingStatus = 'not_started' | 'processing' | 'completed' | 'failed';

interface UploadedFileData {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  parseStatus: ParseStatus;
  parsedContent?: string;
  parseError?: string;
  selectedRubricId?: string;
  selectedRubric?: Rubric;
  gradingStatus: GradingStatus;
  gradingResult?: any;
}

interface FileRubricSelection {
  fileId: string;
  fileName: string;
  parseStatus: ParseStatus;
  selectedRubricId?: string;
  selectedRubric?: Rubric;
}

export default function GradingWithRubricRoute() {
  const hasHydrated = useHasHydrated();
  const { rubrics = [], error } = useLoaderData<{ rubrics: Rubric[]; error?: string }>();
  const { currentStep, canProceed, setStep, resetUI } = useUiStore();
  const { gradeWithRubric, isGrading, error: gradingError, gradingProgress, subscribeToProgress } = useGrading();
  const {
    result: feedback,
    setResult: setFeedback,
    uploadedFiles,
    selectedRubricId,
    setUploadedFiles,
    addUploadedFiles,
    setSelectedRubricId,
    reset: resetGrading,
  } = useGradingStore();

  const [storageChecked, setStorageChecked] = useState(false);
  const [step, setStepState] = useState<'upload' | 'select-rubrics' | 'grading'>('upload');
  const [uploadedFilesData, setUploadedFilesData] = useState<UploadedFileData[]>([]);
  const [rubricsData, setRubricsData] = useState<Rubric[]>([]);
  const [fileRubricSelections, setFileRubricSelections] = useState<FileRubricSelection[]>([]);

  const filesFetcher = useFetcher();
  const rubricUpdateFetcher = useFetcher();

  // Initialize session storage check
  useEffect(() => {
    try {
      // Only run once after hydration
      if (hasHydrated && !storageChecked) {
        const storedData = localStorage.getItem('grading-store');
        console.log('Checking localStorage data:', storedData);
        
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          console.log('Parsed localStorage data:', parsedData);
          
          // If we have result data and we're on the upload page, redirect to results
          if (parsedData.state?.result && currentStep === 'upload') {
            console.log('Found previous result, redirecting to result tab');
            setStep('result');
          }
        }
        
        setStorageChecked(true);
      }
    } catch (error) {
      console.error('Error checking localStorage:', error);
      setStorageChecked(true);
    }
  }, [hasHydrated, currentStep, setStep, storageChecked]);

  
  // Safeguard: If we have result but missing context data, reset and go to upload
  useEffect(() => {
    if (hasHydrated && feedback && currentStep === 'result') {
      if (!uploadedFiles?.length || !selectedRubricId) {
        console.warn('⚠️ Data integrity issue: Have feedback but missing uploadedFiles or selectedRubricId');
        resetUI();
        resetGrading();
        setStep('upload');
      }
    }
  }, [feedback, currentStep, uploadedFiles, selectedRubricId, resetUI, resetGrading, setStep, hasHydrated]);

  useEffect(() => {
    if (hasHydrated && !isGrading && feedback && currentStep !== 'result') {
      console.log('💡 Auto-navigating to result tab');
      setStep('result');
    }
  }, [isGrading, feedback, currentStep, setStep, hasHydrated]);

  useEffect(() => {
    if (hasHydrated && !isGrading && (currentStep === 'result' || currentStep === 'grading')) {
      if (!feedback) {
        resetUI();
        resetGrading();
      }
    }
  }, [isGrading, currentStep, feedback, hasHydrated, resetUI, resetGrading]);

  const handleFilesUploaded = (files: UploadedFileInfo[]) => {
    console.log('上傳檔案完成:', files);
    addUploadedFiles(files);
  };

  const handleRubricSelected = (value: string) => {
    setSelectedRubricId(value);
  };

  const startGrading = async () => {
    if (!selectedRubricId || uploadedFiles.length === 0) {
      return;
    }
    const res = await fetch('/api/grade/init', { method: 'POST' });
    const { gradingId } = await res.json();
    if (!gradingId) return;
    subscribeToProgress(gradingId); 
    gradeWithRubric({
      fileKey: uploadedFiles[0].key,
      rubricId: selectedRubricId,
      gradingId,
    });
  };

  // Find selected rubric data from the loaded rubrics
  const selectedRubricData = rubrics.find((r: Rubric) => r.id === selectedRubricId);

  // Load user's uploaded files
  const loadUserFiles = useCallback(async () => {
    try {
      const response = await fetch('/api/files/user-files', {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        setUploadedFilesData(data.files);
        // Initialize file-rubric selections
        setFileRubricSelections(data.files.map((file: UploadedFileData) => ({
          fileId: file.id,
          fileName: file.fileName,
          parseStatus: file.parseStatus,
          selectedRubricId: file.selectedRubricId,
          selectedRubric: file.selectedRubric,
        })));
      } else {
        setError(data.error || 'Failed to load files');
      }
    } catch (err) {
      setError('Failed to load files');
    }
  }, []);

  // Load rubrics
  const loadRubrics = useCallback(async () => {
    if (rubrics.length > 0) return; // Already loaded
    
    setIsLoadingRubrics(true);
    try {
      const response = await fetch('/api/rubrics', {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        setRubricsData(data.rubrics);
      } else {
        setError(data.error || 'Failed to load rubrics');
      }
    } catch (err) {
      setError('Failed to load rubrics');
    } finally {
      setIsLoadingRubrics(false);
    }
  }, [rubrics.length]);

  // Handle file upload completion
  const handleUploadComplete = useCallback(() => {
    loadUserFiles();
    setStep('select-rubrics');
  }, [loadUserFiles]);

  // Handle rubric selection for a specific file
  const handleFileRubricChange = useCallback(async (fileId: string, rubricId: string) => {
    try {
      const response = await fetch('/api/files/update-rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fileId, rubricId }),
      });

      const data = await response.json();
      if (data.success) {
        // Update local state
        setFileRubricSelections(prev => 
          prev.map(selection => 
            selection.fileId === fileId 
              ? { 
                  ...selection, 
                  selectedRubricId: rubricId,
                  selectedRubric: data.file.selectedRubric 
                }
              : selection
          )
        );
        
        // Also update uploaded files
        setUploadedFilesData(prev => 
          prev.map(file => 
            file.id === fileId 
              ? { ...file, selectedRubricId: rubricId, selectedRubric: data.file.selectedRubric }
              : file
          )
        );
      } else {
        setError(data.error || 'Failed to update rubric selection');
      }
    } catch (err) {
      setError('Failed to update rubric selection');
    }
  }, []);

  // Check if all files are ready for grading
  const allFilesReady = fileRubricSelections.every(selection => 
    selection.parseStatus === 'success' && selection.selectedRubricId
  );

  // Get parse status icon and color
  const getParseStatusDisplay = (status: ParseStatus) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-yellow-500', text: '等待解析' };
      case 'processing':
        return { icon: Loader2, color: 'text-blue-500', text: '解析中' };
      case 'success':
        return { icon: CheckCircle, color: 'text-green-500', text: '解析完成' };
      case 'failed':
        return { icon: AlertTriangle, color: 'text-red-500', text: '解析失敗' };
    }
  };

  // Start grading process
  const startGradingProcess = useCallback(() => {
    const readyFiles = fileRubricSelections.filter(selection => 
      selection.parseStatus === 'success' && selection.selectedRubricId
    );
    
    if (readyFiles.length === 0) {
      setError('沒有可以評分的檔案');
      return;
    }
    
    setStep('grading');
    // TODO: Implement grading logic
  }, [fileRubricSelections]);

  // Load data on component mount
  useEffect(() => {
    loadUserFiles();
    loadRubrics();
  }, [loadUserFiles, loadRubrics]);

  // Show loading while store is hydrating
  if (!hasHydrated) {
    return <HydrationWaiting />;
  }

  // Early return if we're on the result tab but missing necessary data
  if (currentStep === 'result' && (!uploadedFiles?.length || !selectedRubricId)) {
    return (
      <div className="flex flex-col items-center w-full">
        <div className="container py-8 max-w-5xl w-full">
          <div className="mb-6 p-4 border border-red-300 bg-red-50 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
              <p className="text-red-800">
                很抱歉，評分資料出現問題。請重新上傳檔案並進行評分。
              </p>
            </div>
          </div>
          <Button onClick={() => {
            resetUI();
            resetGrading();
            setStep('upload');
          }}>
            返回上傳頁面
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="container py-8 max-w-5xl w-full">
        <Tabs value={step} onValueChange={(value) => setStepState(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload" disabled={isGrading}>
              上傳文件
            </TabsTrigger>
            <TabsTrigger value="select-rubrics" disabled={isGrading || (!canProceed && uploadedFiles.length === 0)}>
              選擇評分標準
            </TabsTrigger>
            <TabsTrigger value="grading" disabled={!allFilesReady}>
              評分進行中
            </TabsTrigger>
            <TabsTrigger value="result" disabled={!feedback}>
              評分結果
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="pt-6">
            <Card>
              <CardHeader>
                <CardTitle>上傳需要評分的文件</CardTitle>
              </CardHeader>
              <CardContent>
                <CompactFileUpload
                  onUploadComplete={handleUploadComplete}
                  acceptedFileTypes={['.pdf', '.docx']}
                  maxFiles={2}
                />

                {uploadedFilesData.length > 0 && (
                  <div className="mt-4 space-y-4">
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-3">已上傳的檔案：</h3>
                      <ul className="space-y-2">
                        {uploadedFilesData.map((file, index) => {
                          const parseDisplay = getParseStatusDisplay(file.parseStatus);
                          const ParseIcon = parseDisplay.icon;
                          
                          return (
                            <li key={index} className="flex items-center gap-2 text-sm">
                              <File className="h-4 w-4 text-green-500" />
                              <span>{file.fileName}</span>
                              <span className="text-xs text-muted-foreground">(上傳成功)</span>
                              <div className="flex items-center gap-2">
                                <ParseIcon className={`h-4 w-4 ${parseDisplay.color} ${parseDisplay.icon === Loader2 ? 'animate-spin' : ''}`} />
                                <Badge variant={file.parseStatus === 'success' ? 'default' : 'secondary'}>
                                  {parseDisplay.text}
                                </Badge>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <Button onClick={() => setStep('select-rubrics')}>下一步: 選擇評分標準</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="select-rubrics" className="pt-6">
            <Card>
              <CardHeader>
                <CardTitle>選擇評分標準</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 border rounded-lg p-3 bg-muted/30">
                  <p className="text-sm font-medium mb-2">已上傳的文件：</p>
                  <div className="space-y-2">
                    {uploadedFilesData.map((file, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <File className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{file.fileName}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {rubricsData.length === 0 ? (
                  <EmptyState
                    title="沒有找到評分標準"
                    description="您需要先創建評分標準才能進行評分。"
                    actionText="創建評分標準"
                    actionLink="/rubrics/new"
                    icon={<AlertCircle className="h-10 w-10" />}
                  />
                ) : error ? (
                  <div className="p-4 border border-red-300 bg-red-50 rounded-md">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
                      <p className="text-red-800">{error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="rubric-select">選擇評分標準</Label>
                      <Select value={selectedRubricId || ''} onValueChange={handleRubricSelected}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="選擇評分標準" />
                        </SelectTrigger>
                        <SelectContent>
                          {rubricsData.map((rubric: Rubric) => (
                            <SelectItem key={rubric.id} value={rubric.id}>
                              {rubric.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedRubricData && (
                      <div className="border rounded-lg p-4">
                        <h3 className="font-medium mb-2">{selectedRubricData.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{selectedRubricData.description}</p>
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">評分項目:</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {selectedRubricData.criteria.map((criteria: RubricCriteria) => (
                              <li key={criteria.id} className="text-sm">
                                {criteria.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setStep('upload')}>
                        返回
                      </Button>
                      <Button onClick={startGradingProcess} disabled={!selectedRubricId}>
                        開始評分
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grading" className="pt-6">
            <Card>
              <CardHeader>
                <CardTitle>評分中</CardTitle>
              </CardHeader>
              <CardContent>
                {uploadedFilesData.length > 0 && selectedRubricData && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="border rounded-lg p-3 bg-muted/30 flex-1">
                        <p className="text-sm font-medium mb-2">已上傳的文件：</p>
                        <div className="space-y-2">
                          {uploadedFilesData.map((file, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <File className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{file.fileName}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border rounded-lg p-3 bg-muted/30 flex-1">
                        <p className="text-sm font-medium mb-2">選擇的評分標準：</p>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">{selectedRubricData.name}</span>
                        </div>
                      </div>
                    </div>

                    <GradingProgress
                      phase={gradingProgress.phase}
                      initialProgress={gradingProgress.progress}
                      message={gradingProgress.message}
                    />

                    <div className="flex justify-center">
                      <Button variant="outline" onClick={() => setStep('select-rubrics')}>
                        返回
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="result" className="pt-6">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>評分結果</CardTitle>
              </CardHeader>
              <CardContent>
                {uploadedFilesData.length > 0 && selectedRubricData && feedback ? (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="border rounded-lg p-3 bg-muted/30 flex-1">
                        <p className="text-sm font-medium mb-2">已評分的文件：</p>
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{uploadedFilesData[0]?.fileName}</span>
                        </div>
                      </div>

                      <div className="border rounded-lg p-3 bg-muted/30 flex-1">
                        <p className="text-sm font-medium mb-2">使用的評分標準：</p>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">{selectedRubricData.name}</span>
                        </div>
                      </div>
                    </div>

                    <GradingResultDisplay
                      result={feedback}
                      onRetry={() => {
                        setStep('upload');
                        useGradingStore.getState().reset();
                      }}
                    />

                    <div className="mt-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setStep('upload');
                          useGradingStore.getState().reset();
                        }}
                      >
                        重新開始
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="mb-4 p-4 border border-blue-300 bg-blue-50 rounded-md">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 text-blue-600" />
                        <p className="text-blue-800">正在加載評分結果，請稍候...</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStep('upload');
                        resetGrading();
                      }}
                    >
                      返回上傳頁面
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

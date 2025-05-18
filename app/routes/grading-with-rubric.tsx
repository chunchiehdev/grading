import { useState, useEffect } from 'react';
import type { LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { CompactFileUpload } from '@/components/grading/CompactFileUpload';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GradingProgress } from '@/components/grading/GradingProgress';
import { EmptyState } from '@/components/ui/empty-state';

import { AlertCircle, FileText, File } from 'lucide-react';
import type { Rubric, RubricCriteria } from '@/types/grading';
import type { UploadedFileInfo } from '@/types/files';
import { listRubrics } from '@/services/rubric.server';
import { useUiStore } from '@/stores/uiStore';
import { useGrading } from '@/hooks/useGrading';
import { useGradingStore, useHasHydrated } from '@/stores/gradingStore';

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

  // Initialize session storage check
  const [storageChecked, setStorageChecked] = useState(false);
  
  // Check localStorage to see if we have data from a previous session
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

  // Debug: Log component rendering and current state
  useEffect(() => {
    if (hasHydrated) {
      console.log('🛠️ Current state:', { 
        currentStep, 
        isGrading, 
        feedback: feedback ? 'Present' : 'Null', 
        uploadedFiles: uploadedFiles.length,
        selectedRubricId,
        hasHydrated
      });
    }
  }, [currentStep, isGrading, feedback, uploadedFiles, selectedRubricId, hasHydrated]);

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
  
  useEffect(() => {
    if (hasHydrated) {
      const selectedRubricData = rubrics.find(r => r.id === selectedRubricId);
    
      console.log(
        'uploadedFiles:', uploadedFiles,
        'selectedRubricData:', selectedRubricData,
        'feedback:', feedback
      );
    
      if (!uploadedFiles?.length) console.warn('❌ uploadedFiles is falsy or empty');
      if (!selectedRubricData && selectedRubricId) console.warn('❌ selectedRubricData is falsy but has ID:', selectedRubricId);
      if (!feedback && currentStep === 'result') console.warn('❌ feedback is falsy but on result tab');
    }
  }, [uploadedFiles, selectedRubricId, feedback, rubrics, hasHydrated, currentStep]);

  // Show loading while store is hydrating
  if (!hasHydrated) {
    return <HydrationWaiting />;
  }

  // Early return if we're on the result tab but missing necessary data
  if (currentStep === 'result' && (!uploadedFiles?.length || !selectedRubricId)) {
    return (
      <div className="flex flex-col items-center w-full">
        <div className="container py-8 max-w-5xl w-full">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>
              很抱歉，評分資料出現問題。請重新上傳檔案並進行評分。
            </AlertDescription>
          </Alert>
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
        <Tabs value={currentStep} onValueChange={(value) => setStep(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload" disabled={isGrading}>
              上傳文件
            </TabsTrigger>
            <TabsTrigger value="select-rubric" disabled={isGrading || (!canProceed && uploadedFiles.length === 0)}>
              選擇評分標準
            </TabsTrigger>
            <TabsTrigger value="grading" disabled={!isGrading}>
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
                  onUploadComplete={handleFilesUploaded}
                  acceptedFileTypes={['.pdf', '.docx']}
                  maxFiles={2}
                />

                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-4">
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-3">已上傳的檔案：</h3>
                      <ul className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <File className="h-4 w-4 text-green-500" />
                            <span>{file.name}</span>
                            <span className="text-xs text-muted-foreground">(上傳成功)</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button onClick={() => setStep('select-rubric')}>下一步: 選擇評分標準</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="select-rubric" className="pt-6">
            <Card>
              <CardHeader>
                <CardTitle>選擇評分標準</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 border rounded-lg p-3 bg-muted/30">
                  <p className="text-sm font-medium mb-2">已上傳的文件：</p>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <File className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {rubrics.length === 0 ? (
                  <EmptyState
                    title="沒有找到評分標準"
                    description="您需要先創建評分標準才能進行評分。"
                    actionText="創建評分標準"
                    actionLink="/rubrics/new"
                    icon={<AlertCircle className="h-10 w-10" />}
                  />
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="rubric-select">選擇評分標準</Label>
                      <Select value={selectedRubricId || ''} onValueChange={handleRubricSelected}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="選擇評分標準" />
                        </SelectTrigger>
                        <SelectContent>
                          {rubrics.map((rubric: Rubric) => (
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
                                {criteria.name} ({criteria.weight}%)
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
                      <Button onClick={startGrading} disabled={!selectedRubricId}>
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
                {uploadedFiles.length > 0 && selectedRubricData && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="border rounded-lg p-3 bg-muted/30 flex-1">
                        <p className="text-sm font-medium mb-2">已上傳的文件：</p>
                        <div className="space-y-2">
                          {uploadedFiles.map((file, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <File className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{file.name}</span>
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
                      <Button variant="outline" onClick={() => setStep('select-rubric')}>
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
                {uploadedFiles.length > 0 && selectedRubricData && feedback ? (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="border rounded-lg p-3 bg-muted/30 flex-1">
                        <p className="text-sm font-medium mb-2">已評分的文件：</p>
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{uploadedFiles[0]?.name}</span>
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
                    <Alert className="mb-4">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <AlertDescription>正在加載評分結果，請稍候...</AlertDescription>
                    </Alert>
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

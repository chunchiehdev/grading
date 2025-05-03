import { useState, useEffect } from 'react';
import type { LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useFetcher } from 'react-router';
import { CompactFileUpload } from '@/components/grading/CompactFileUpload';
import { GradingResultDisplay, GradingResultData } from '@/components/grading/GradingResultDisplay';
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

export async function loader({ request }: LoaderFunctionArgs) {
  const { rubrics, error } = await listRubrics();

  return Response.json({
    rubrics: rubrics || [],
    error,
  });
}

export default function GradingWithRubricRoute() {
  const { rubrics = [], error } = useLoaderData<{ rubrics: Rubric[]; error?: string }>();
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [step, setStep] = useState<'upload' | 'select-rubric' | 'grading' | 'result'>('upload');
  const [isGrading, setIsGrading] = useState(false);
  const [gradingProgress, setGradingProgress] = useState(0);
  const [feedback, setFeedback] = useState<GradingResultData | null>(null);
  const [gradingError, setGradingError] = useState<string | null>(null);

  const gradingFetcher = useFetcher();

  const handleFilesUploaded = (files: UploadedFileInfo[]) => {
    console.log('上傳檔案完成:', files);
    setUploadedFiles(files);
    if (files.length > 0) {
      setTimeout(() => {
        setStep('select-rubric');
      }, 1500);
    }
  };

  // 處理評分標準選擇
  const handleRubricSelected = (value: string) => {
    setSelectedRubricId(value);
  };

  // 開始評分過程
  const startGrading = () => {
    if (!selectedRubricId || uploadedFiles.length === 0) {
      setGradingError('請先上傳文件並選擇評分標準');
      return;
    }

    console.log('開始評分流程', { fileKey: uploadedFiles[0].key, rubricId: selectedRubricId });

    setIsGrading(true);
    setStep('grading');
    setGradingProgress(10); // 初始進度

    // 模擬評分進度更新
    const progressInterval = setInterval(() => {
      setGradingProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 2000);

    // 發送評分請求
    try {
      gradingFetcher.submit(
        {
          fileKey: uploadedFiles[0].key,
          rubricId: selectedRubricId,
        },
        { method: 'post', action: '/api/grade-with-rubric' }
      );
      console.log('評分請求已發送');
    } catch (err) {
      console.error('發送評分請求時出現錯誤:', err);
      setGradingError('發送評分請求失敗');
    }
  };

  // 處理評分結果
  useEffect(() => {
    console.log('GradingFetcher 狀態:', {
      state: gradingFetcher.state,
      data: gradingFetcher.data,
      formData: gradingFetcher.formData,
    });

    if (gradingFetcher.data && gradingFetcher.state === 'idle') {
      // 評分完成
      console.log('收到評分結果:', gradingFetcher.data);
      setGradingProgress(100);
      setIsGrading(false);

      const data = gradingFetcher.data as {
        success: boolean;
        data?: { success: boolean; feedback?: any; error?: string };
      };

      if (data.success && data.data?.success && data.data.feedback) {
        console.log('評分成功, 設置反饋數據');

        // 確保數據符合 GradingResultData 的格式
        const gradingResult: GradingResultData = {
          score: data.data.feedback.score || 0,
          imageUnderstanding: data.data.feedback.imageUnderstanding,
          analysis: data.data.feedback.analysis || '',
          criteriaScores: data.data.feedback.criteriaScores || [],
          strengths: data.data.feedback.strengths || [],
          improvements: data.data.feedback.improvements || [],
          overallSuggestions: data.data.feedback.overallSuggestions,
          createdAt: data.data.feedback.createdAt || new Date(),
          gradingDuration: data.data.feedback.gradingDuration,
        };

        setFeedback(gradingResult);
        setStep('result');
      } else {
        console.error('評分失敗:', data.data?.error || '未知錯誤');
        setGradingError(data.data?.error || '評分過程中發生錯誤');
      }
    } else if (gradingFetcher.state === 'submitting') {
      console.log('正在提交評分請求...');
    } else if (gradingFetcher.state === 'loading') {
      console.log('正在加載評分結果...');
    }
  }, [gradingFetcher.data, gradingFetcher.state]);

  const selectedRubricData = rubrics.find((r: Rubric) => r.id === selectedRubricId);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="container py-8 max-w-5xl w-full">
        <Tabs defaultValue="upload" value={step} onValueChange={(value) => setStep(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload" disabled={isGrading}>
              上傳文件
            </TabsTrigger>
            <TabsTrigger value="select-rubric" disabled={isGrading || uploadedFiles.length === 0}>
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
                  maxFiles={1}
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
                {uploadedFiles.length > 0 && (
                  <div className="mb-4 border rounded-lg p-3 bg-muted/30">
                    <p className="text-sm font-medium mb-2">已上傳的文件：</p>
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{uploadedFiles[0]?.name}</span>
                    </div>
                  </div>
                )}

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
                          <h4 className="text-sm font-medium">評分條目:</h4>
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
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{uploadedFiles[0]?.name}</span>
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
                      status={isGrading ? 'processing' : 'completed'}
                      initialProgress={gradingProgress}
                      phase="grade"
                      message="分析文件內容並根據評分標準評分"
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
                {uploadedFiles.length > 0 && selectedRubricData && feedback && (
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
                        setUploadedFiles([]);
                        setSelectedRubricId(null);
                        setFeedback(null);
                      }}
                    />

                    <div className="mt-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setStep('upload');
                          setUploadedFiles([]);
                          setSelectedRubricId(null);
                          setFeedback(null);
                        }}
                      >
                        重新開始
                      </Button>
                    </div>
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

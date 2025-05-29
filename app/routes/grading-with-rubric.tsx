import { useState, useCallback, useEffect } from 'react';
import { CompactFileUpload } from '@/components/grading/CompactFileUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertCircle, File, CheckCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import type { Rubric } from '@/types/grading';

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
  createdAt: string;
}

interface FileRubricSelection {
  fileId: string;
  fileName: string;
  parseStatus: ParseStatus;
  selectedRubricId?: string;
  selectedRubric?: Rubric;
}

export default function GradingWithRubricPage() {
  const [step, setStep] = useState<'upload' | 'select-rubrics' | 'grading'>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileData[]>([]);
  const [fileRubricSelections, setFileRubricSelections] = useState<FileRubricSelection[]>([]);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isLoadingRubrics, setIsLoadingRubrics] = useState(false);

  // Load rubrics from API
  const loadRubrics = useCallback(async () => {
    setIsLoadingRubrics(true);
    try {
      const response = await fetch('/api/rubrics', {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        setRubrics(data.rubrics);
      } else {
        setError(data.error || 'Failed to load rubrics');
      }
    } catch (err) {
      setError('Failed to load rubrics');
    } finally {
      setIsLoadingRubrics(false);
    }
  }, []);

  // Load user's uploaded files
  const loadUserFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch('/api/files/user-files', {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        setUploadedFiles(data.files || []);  // 確保不會是 undefined
        // Initialize file-rubric selections
        setFileRubricSelections((data.files || []).map((file: UploadedFileData) => ({
          fileId: file.id,
          fileName: file.fileName,
          parseStatus: file.parseStatus,
          selectedRubricId: file.selectedRubricId,
          selectedRubric: file.selectedRubric,
        })));
      } else {
        setError(data.error || 'Failed to load files');
        setUploadedFiles([]);  // 確保設置為空數組
        setFileRubricSelections([]);
      }
    } catch (err) {
      setError('Failed to load files');
      setUploadedFiles([]);  // 確保設置為空數組
      setFileRubricSelections([]);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

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
        setUploadedFiles(prev => 
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

  const readyFilesCount = fileRubricSelections.filter(selection => 
    selection.parseStatus === 'success' && selection.selectedRubricId
  ).length;

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
  const startGrading = useCallback(() => {
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
    loadRubrics();  // 載入評分標準
  }, [loadUserFiles, loadRubrics]);

  // Auto-refresh parsing status every 5 seconds if files are still parsing
  useEffect(() => {
    const hasParsingFiles = fileRubricSelections.some(
      selection => selection.parseStatus === 'pending' || selection.parseStatus === 'processing'
    );

    if (hasParsingFiles) {
      const interval = setInterval(() => {
        loadUserFiles();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [fileRubricSelections, loadUserFiles]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">智能評分系統 (每檔案獨立評分)</h1>
        <p className="text-muted-foreground">
          上傳您的作業文件，為每個檔案選擇評分標準，然後開始智能評分
        </p>
      </div>

      {error && (
        <div className="p-4 border border-red-300 bg-red-50 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      <Tabs value={step} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">1. 上傳文件</TabsTrigger>
          <TabsTrigger value="select-rubrics" disabled={uploadedFiles.length === 0}>
            2. 選擇評分標準
          </TabsTrigger>
          <TabsTrigger value="grading" disabled={!allFilesReady}>
            3. 評分 ({readyFilesCount}/{fileRubricSelections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>上傳作業文件</CardTitle>
            </CardHeader>
            <CardContent>
              <CompactFileUpload
                maxFiles={10}
                maxFileSize={50 * 1024 * 1024}
                acceptedFileTypes={['.pdf']}
                onUploadComplete={handleUploadComplete}
                onError={setError}
              />
              
              {uploadedFiles.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">已上傳的文件 ({uploadedFiles.length})</h3>
                    <Button onClick={() => setStep('select-rubrics')} variant="outline">
                      繼續選擇評分標準
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
                                <p className="font-medium">{file.fileName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {(file.fileSize / 1024 / 1024).toFixed(2)} MB • {file.mimeType}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <ParseIcon className={`h-4 w-4 ${parseDisplay.color} ${parseDisplay.icon === Loader2 ? 'animate-spin' : ''}`} />
                              <Badge variant={file.parseStatus === 'success' ? 'default' : 'secondary'}>
                                {parseDisplay.text}
                              </Badge>
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

        <TabsContent value="select-rubrics" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>為每個檔案選擇評分標準</CardTitle>
              <p className="text-sm text-muted-foreground">
                每個檔案可以有不同的評分標準，請為每個檔案選擇適合的評分標準
              </p>
            </CardHeader>
            <CardContent>
              {rubrics.length === 0 ? (
                <EmptyState
                  title="沒有找到評分標準"
                  description="您需要先創建評分標準才能進行評分。"
                  actionText="創建評分標準"
                  actionLink="/rubrics/new"
                  icon={<AlertCircle className="h-10 w-10" />}
                />
              ) : (
                <div className="space-y-6">
                  {fileRubricSelections.map((selection, index) => {
                    const parseDisplay = getParseStatusDisplay(selection.parseStatus);
                    const ParseIcon = parseDisplay.icon;
                    const isFileReady = selection.parseStatus === 'success';
                    
                    return (
                      <div key={selection.fileId} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <File className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{selection.fileName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <ParseIcon className={`h-3 w-3 ${parseDisplay.color} ${parseDisplay.icon === Loader2 ? 'animate-spin' : ''}`} />
                                <span className="text-xs text-muted-foreground">{parseDisplay.text}</span>
                              </div>
                            </div>
                          </div>
                          {selection.selectedRubric && (
                            <Badge variant="outline">
                              {selection.selectedRubric.name}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor={`rubric-select-${index}`}>選擇評分標準</Label>
                          <Select 
                            value={selection.selectedRubricId || ''} 
                            onValueChange={(value) => handleFileRubricChange(selection.fileId, value)}
                            disabled={!isFileReady}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={
                                isFileReady 
                                  ? "選擇評分標準" 
                                  : "等待檔案解析完成..."
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {rubrics.map((rubric: Rubric) => (
                                <SelectItem key={rubric.id} value={rubric.id}>
                                  {rubric.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {selection.selectedRubric && (
                            <div className="border rounded-lg p-3 bg-muted/30">
                              <h4 className="font-medium mb-2">{selection.selectedRubric.name}</h4>
                              <p className="text-sm text-muted-foreground mb-3">
                                {selection.selectedRubric.description}
                              </p>
                              <div className="space-y-2">
                                <h5 className="text-sm font-medium">評分項目:</h5>
                                <ul className="list-disc pl-5 space-y-1">
                                  {selection.selectedRubric.criteria?.map((criteria: any) => (
                                    <li key={criteria.id} className="text-sm">
                                      {criteria.name}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex justify-between items-center pt-4">
                    <Button variant="outline" onClick={() => setStep('upload')}>
                      返回上傳
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      {readyFilesCount} / {fileRubricSelections.length} 個檔案已準備就緒
                    </div>
                    <Button 
                      onClick={startGrading} 
                      disabled={!allFilesReady || readyFilesCount === 0}
                    >
                      開始評分 ({readyFilesCount} 個檔案)
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
              <CardTitle>評分進行中</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {fileRubricSelections
                  .filter(selection => selection.parseStatus === 'success' && selection.selectedRubricId)
                  .map((selection) => (
                    <div key={selection.fileId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <File className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium">{selection.fileName}</p>
                            <p className="text-sm text-muted-foreground">
                              評分標準: {selection.selectedRubric?.name}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">準備評分</Badge>
                      </div>
                      
                      {/* TODO: 添加評分進度和結果顯示 */}
                      <div className="bg-muted/30 p-3 rounded">
                        <p className="text-sm text-muted-foreground">
                          評分功能開發中...
                        </p>
                      </div>
                    </div>
                  ))
                }
                
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => setStep('select-rubrics')}>
                    返回選擇評分標準
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
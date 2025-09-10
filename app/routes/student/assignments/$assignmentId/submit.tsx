import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { useEffect, useState } from 'react';
import { requireStudent } from '@/services/auth.server';
import { getAssignmentAreaForSubmission, getDraftSubmission } from '@/services/submission.server';
import { CompactFileUpload } from '@/components/grading/CompactFileUpload';
import { FilePreview } from '@/components/grading/FilePreview';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FullScreenPdfViewer } from '@/components/grading/FullScreenPdfViewer';
// Replaced resizable panels with Framer Motion animations
import { AnimatePresence, motion } from 'framer-motion';
// import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Loader2, ArrowLeft, Eye } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useTranslation } from 'react-i18next';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const student = await requireStudent(request);
  const { assignmentId } = params;

  if (!assignmentId) throw new Response('Assignment not found', { status: 404 });

  const assignment = await getAssignmentAreaForSubmission(assignmentId, student.id);
  if (!assignment) throw new Response('Assignment not found', { status: 404 });

  // Check for existing draft/submission to restore state
  const draftSubmission = await getDraftSubmission(assignmentId, student.id);

  return { student, assignment, draftSubmission };
}

type State = 'idle' | 'ready' | 'grading' | 'completed' | 'error';

export default function SubmitAssignment() {
  const { t } = useTranslation(['assignment', 'grading', 'common']);
  const { assignment, draftSubmission } = useLoaderData<typeof loader>();

  // Initialize state from draft submission if available
  const [state, setState] = useState<State>(() => {
    if (draftSubmission?.lastState) return draftSubmission.lastState;
    return 'idle';
  });
  
  const [fileId, setFileId] = useState<string | null>(() => {
    return draftSubmission?.fileMetadata?.fileId || null;
  });
  
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return draftSubmission?.sessionId || null;
  });
  
  const [uploadedMeta, setUploadedMeta] = useState<{ fileId: string; fileName: string; fileSize: number; mimeType: string } | null>(() => {
    return draftSubmission?.fileMetadata || null;
  });
  
  const [localFile, setLocalFile] = useState<File | null>(null);
  
  const [result, setResult] = useState<any>(() => {
    return draftSubmission?.aiAnalysisResult || null;
  });
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Auto-save draft submission when important state changes
  const saveDraftSubmission = async (updates: {
    fileMetadata?: typeof uploadedMeta;
    sessionId?: string | null;
    aiAnalysisResult?: any;
    lastState?: State;
  }) => {
    try {
      await fetch(`/api/student/assignments/${assignment.id}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileMetadata: updates.fileMetadata !== undefined ? updates.fileMetadata : uploadedMeta,
          sessionId: updates.sessionId !== undefined ? updates.sessionId : sessionId,
          aiAnalysisResult: updates.aiAnalysisResult !== undefined ? updates.aiAnalysisResult : result,
          lastState: updates.lastState !== undefined ? updates.lastState : state,
        }),
      });
    } catch (e) {
      console.warn('Failed to save draft submission:', e);
    }
  };

  // Resolve file URL for server-side files
  const resolveFileUrl = async (fileId: string): Promise<string | null> => {
    try {
      // Return the download URL for server-side files
      return `/api/files/${fileId}/download`;
    } catch (e) {
      console.warn('Failed to resolve file URL:', e);
      return null;
    }
  };

  const pollSession = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/grading/session/${id}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        const { status, gradingResults } = data.data;
        // Consider session completed if status is COMPLETED
        if (status === 'COMPLETED' && gradingResults?.length) {
          const first = gradingResults.find((r: any) => r.result) || gradingResults[0];
          if (first?.result) {
            setResult(first.result);
            setState('completed');
            // Auto-save AI result
            saveDraftSubmission({
              aiAnalysisResult: first.result,
              lastState: 'completed'
            });
          }
          return true;
        }
        // Fallback: if any result is completed with result payload, treat as done
        const completed = Array.isArray(gradingResults)
          ? gradingResults.find((r: any) => r.status === 'COMPLETED' && r.result)
          : null;
        if (completed) {
          setResult(completed.result);
          setState('completed');
          // Auto-save AI result
          saveDraftSubmission({
            aiAnalysisResult: completed.result,
            lastState: 'completed'
          });
          return true;
        }
        if (status === 'FAILED') {
          setError(t('grading:messages.gradingFailed'));
          setState('error');
          return true;
        }
      }
      return false;
    } catch {
      setError(t('assignment:submit.errors.failedToCheckStatus'));
      setState('error');
      return true;
    }
  };

  useEffect(() => {
    if (state === 'grading' && sessionId) {
      const interval = setInterval(async () => {
        if (await pollSession(sessionId)) clearInterval(interval);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [state, sessionId]);

  const onUploadComplete = (files: any[]) => {
    console.log('📁 Upload completed, received files:', files);
    if (files[0]) {
      console.log('✅ Setting file metadata:', {
        fileId: files[0].fileId,
        fileName: files[0].fileName,
        fileSize: files[0].fileSize,
        mimeType: files[0].mimeType
      });
      setFileId(files[0].fileId);
      setUploadedMeta(files[0]);
      setState('ready');
      setError(null);
      
      // Auto-save file upload
      saveDraftSubmission({
        fileMetadata: files[0],
        lastState: 'ready'
      });
    }
  };
  const onLocalFilesChange = (files: File[]) => {
    if (files && files[0]) {
      setLocalFile(files[0]);
    }
  };

  const waitForParse = async (
    fid: string,
    maxAttempts = 60,
    intervalMs = 2000
  ): Promise<'completed' | 'failed' | 'timeout'> => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch('/api/files?limit=100');
        const payload = await res.json();
        const files = Array.isArray(payload?.data) ? payload.data : [];
        const file = files.find((f: any) => f.id === fid);
        const status = file?.parseStatus;
        if (status === 'COMPLETED') return 'completed';
        if (status === 'FAILED') return 'failed';
      } catch {}
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return 'timeout';
  };

  const getAIFeedback = async (currentFileId?: string) => {
    const fileToGrade = currentFileId || fileId;
    if (!fileToGrade || !assignment.rubric?.id) return setError(t('assignment:submit.errors.noFileOrRubric'));
    
    setState('grading');
    setError(null);

    try {
      // Ensure server-side PDF/text parsing is done before grading
      const parseStatus = await waitForParse(fileToGrade);
      if (parseStatus === 'failed') {
        throw new Error(t('assignment:submit.errors.parsingFailed'));
      }
      if (parseStatus === 'timeout') {
        throw new Error(t('assignment:submit.errors.parsingTimeout'));
      }

      const form = new FormData();
      form.append('fileIds', JSON.stringify([fileToGrade]));
      form.append('rubricIds', JSON.stringify([assignment.rubric.id]));

      const sessionRes = await fetch('/api/grading/session', { method: 'POST', body: form });
      const sessionData = await sessionRes.json();
      if (!sessionData.success) throw new Error(sessionData.error);

      const id = sessionData.data.sessionId;
      setSessionId(id);
      
      // Auto-save session ID
      saveDraftSubmission({
        sessionId: id,
        lastState: 'grading'
      });

      const startForm = new FormData();
      startForm.append('action', 'start');
      const startRes = await fetch(`/api/grading/session/${id}`, { method: 'POST', body: startForm });
      const startData = await startRes.json();
      if (!startData.success) throw new Error(startData.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('assignment:submit.errors.failedToStartGrading'));
      setState('error');
    }
  };

  const submitFinal = async () => {
    if (!fileId || !sessionId) return setError(t('assignment:submit.errors.noFileUploaded'));

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/student/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: assignment.id, uploadedFileId: fileId, sessionId: sessionId }),
      });

      const data = await res.json();
      if (data.success && data.submissionId) window.location.href = `/student/submissions/${data.submissionId}`;
      else throw new Error(data.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('assignment:submit.errors.failedToSubmit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setState('idle');
    setFileId(null);
    setSessionId(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="bg-background min-h-screen flex flex-col">
      <PageHeader
        title={assignment.name}
        subtitle={`${assignment.course.name} • ${assignment.course.teacher.email}`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <a href="/student/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common:backToDashboard')}
              </a>
            </Button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 flex-1 flex flex-col w-full min-h-0">
        {/* Desktop layout (>= xl): flexible two-panel */}
        <div className="hidden xl:flex gap-6 flex-1 min-h-0">
          {/* Left panel: file upload/preview, flexible width with min/max constraints */}
          <div className="min-w-[400px] max-w-[600px] w-[45%] flex-shrink-0 flex flex-col min-h-0">
            <AnimatePresence mode="wait" initial={false}>
              {state === 'idle' ? (
                <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('assignment:submit.uploadAssignment')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CompactFileUpload maxFiles={1} onUploadComplete={onUploadComplete} onFilesChange={onLocalFilesChange} />
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div key="preview" className="h-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <Card className="h-full flex flex-col min-h-0">
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                      <CardTitle className="truncate text-base">
                        {uploadedMeta?.fileName || t('common:preview')}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
                          <Eye className="w-4 h-4 mr-2" /> {t('common:preview')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => reset()}>{t('assignment:submit.replaceFile')}</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0">
                      <div className="h-full">
                        {(() => {
                          console.log('🔍 Submit page - FilePreview props:', {
                            uploadedMeta,
                            localFile: localFile ? { name: localFile.name, type: localFile.type } : null,
                            fileId: uploadedMeta?.fileId,
                            state
                          });
                          return null;
                        })()}
                        <FilePreview 
                          file={uploadedMeta || undefined} 
                          localFile={localFile} 
                          fileId={uploadedMeta?.fileId}
                          resolveFileUrl={resolveFileUrl}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Inline error under left panel */}
            <AnimatePresence>
              {error && (
                <motion.div key="left-error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-3">
                  <Card className="border-destructive/30">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-destructive">{error}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right panel: instructions/progress/results */}
          <div className="flex-1 min-w-0 min-h-0 overflow-auto">
            <AnimatePresence mode="wait" initial={false}>
              {state === 'error' ? (
                <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Card className="border-destructive/30">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-destructive">{error}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : state === 'grading' ? (
                <motion.div key="grading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="text-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">{t('grading:ai.analyzing')}</p>
                  </div>
                </motion.div>
              ) : state === 'completed' ? (
                <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <GradingResultDisplay result={result} />
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  {/* empty/instructions state */}
                  {/* Using EmptyGradingState via GradingResultDisplay when no result and no grading */}
                  <GradingResultDisplay />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions under right panel content */}
            <AnimatePresence>
              {state !== 'grading' && (
                <motion.div 
                  key="desktop-actions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 flex gap-2"
                >
                  <Button onClick={() => getAIFeedback()} disabled={!fileId}>
                    {state === 'completed' || state === 'error' ? (
                      t('assignment:submit.rerunAiFeedback')
                    ) : (
                      t('assignment:submit.getAiFeedback')
                    )}
                  </Button>
                  {state === 'completed' && (
                    <Button onClick={submitFinal} disabled={!fileId || isSubmitting} className="bg-green-600 hover:bg-green-700">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('assignment:submit.submitting')}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" /> {t('assignment:submit.submitAssignment')}
                        </>
                      )}
                    </Button>
                  )}
                  {state !== 'idle' && (
                    <Button variant="outline" onClick={reset}>{t('assignment:submit.reselectFile')}</Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Tablet layout (lg-xl): side-by-side with adjusted proportions */}
        <div className="hidden lg:xl:hidden lg:flex gap-4 flex-1 min-h-0">
          {/* Left panel: file upload/preview */}
          <div className="w-[50%] flex flex-col min-h-0">
            <AnimatePresence mode="wait" initial={false}>
              {state === 'idle' ? (
                <motion.div key="t-upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('assignment:submit.uploadAssignment')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CompactFileUpload maxFiles={1} onUploadComplete={onUploadComplete} onFilesChange={onLocalFilesChange} />
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div key="t-preview" className="h-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <Card className="h-full flex flex-col min-h-0">
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                      <CardTitle className="truncate text-base">
                        {uploadedMeta?.fileName || t('common:preview')}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
                          <Eye className="w-4 h-4 mr-2" /> {t('common:preview')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => reset()}>{t('assignment:submit.replaceFile')}</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0">
                      <div className="h-full">
                        {(() => {
                          console.log('🔍 Submit page - FilePreview props:', {
                            uploadedMeta,
                            localFile: localFile ? { name: localFile.name, type: localFile.type } : null,
                            fileId: uploadedMeta?.fileId,
                            state
                          });
                          return null;
                        })()}
                        <FilePreview 
                          file={uploadedMeta || undefined} 
                          localFile={localFile} 
                          fileId={uploadedMeta?.fileId}
                          resolveFileUrl={resolveFileUrl}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right panel: instructions/progress/results */}
          <div className="flex-1 min-w-0 min-h-0 overflow-auto">
            <AnimatePresence mode="wait" initial={false}>
              {state === 'error' ? (
                <motion.div key="t-error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Card className="border-destructive/30">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-destructive">{error}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : state === 'grading' ? (
                <motion.div key="t-grading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="text-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">{t('grading:ai.analyzing')}</p>
                  </div>
                </motion.div>
              ) : state === 'completed' ? (
                <motion.div key="t-results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <GradingResultDisplay result={result} />
                </motion.div>
              ) : (
                <motion.div key="t-empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <GradingResultDisplay />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions under right panel content */}
            <AnimatePresence>
              {state !== 'grading' && (
                <motion.div 
                  key="tablet-actions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 flex gap-2"
                >
                  <Button onClick={() => getAIFeedback()} disabled={!fileId}>
                    {state === 'completed' || state === 'error' ? (
                      t('assignment:submit.rerunAiFeedback')
                    ) : (
                      t('assignment:submit.getAiFeedback')
                    )}
                  </Button>
                  {state === 'completed' && (
                    <Button onClick={submitFinal} disabled={!fileId || isSubmitting} className="bg-green-600 hover:bg-green-700">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('assignment:submit.submitting')}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" /> {t('assignment:submit.submitAssignment')}
                        </>
                      )}
                    </Button>
                  )}
                  {state !== 'idle' && (
                    <Button variant="outline" onClick={reset}>{t('assignment:submit.reselectFile')}</Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile: stacked layout */}
        <div className="lg:hidden flex-1 min-h-0 flex flex-col gap-3">
          <AnimatePresence mode="wait" initial={false}>
            {state === 'idle' ? (
              <motion.div key="m-upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <Card>
                  <CardHeader>
                    <CardTitle>{t('assignment:submit.uploadAssignment')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CompactFileUpload maxFiles={1} onUploadComplete={onUploadComplete} onFilesChange={onLocalFilesChange} />
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="m-preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle className="truncate text-base">{uploadedMeta?.fileName || t('common:preview')}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
                        <Eye className="w-4 h-4 mr-2" /> 預覽
                      </Button>
                      <Button size="sm" variant="ghost" onClick={reset}>更換檔案</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FilePreview file={uploadedMeta || undefined} localFile={localFile} fileId={uploadedMeta?.fileId} resolveFileUrl={resolveFileUrl} />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
            {state === 'error' ? (
              <motion.div key="m-error-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Card className="border-destructive/30">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-destructive">{error}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : state === 'grading' ? (
              <motion.div key="m-grading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">{t('grading:ai.analyzing')}</p>
                </div>
              </motion.div>
            ) : state === 'completed' ? (
              <motion.div key="m-results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <GradingResultDisplay result={result} />
              </motion.div>
            ) : (
              <motion.div key="m-empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <GradingResultDisplay />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <AnimatePresence>
            {state !== 'grading' && (
              <motion.div 
                key="mobile-actions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex gap-2"
              >
                <Button onClick={() => getAIFeedback()} disabled={!fileId} className="flex-1">
                  {state === 'completed' || state === 'error' ? (
                    t('assignment:submit.rerunAiFeedback')
                  ) : (
                    t('assignment:submit.getAiFeedback')
                  )}
                </Button>
                {state === 'completed' && (
                  <Button onClick={submitFinal} disabled={!fileId || isSubmitting} className="bg-green-600 hover:bg-green-700 flex-1">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('assignment:submit.submitting')}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" /> {t('assignment:submit.submitAssignment')}
                      </>
                    )}
                  </Button>
                )}
                {state !== 'idle' && (
                  <Button variant="outline" onClick={reset}>{t('assignment:submit.reselectFile')}</Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </main>

      {/* Full-screen preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-screen h-screen max-w-none bg-background ">
            <DialogTitle className="sr-only">{t('assignment:submit.pdfPreview')}</DialogTitle>
            <FullScreenPdfViewer 
              file={localFile || undefined} 
              fileUrl={uploadedMeta?.fileId ? `/api/files/${uploadedMeta.fileId}/download` : undefined}
              fileName={uploadedMeta?.fileName} 
            />
          
        </DialogContent>
      </Dialog>
    </div>
  );
}

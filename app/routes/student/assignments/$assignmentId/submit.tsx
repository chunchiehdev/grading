import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { useEffect, useState } from 'react';
import { requireStudent } from '@/services/auth.server';
import { getAssignmentAreaForSubmission } from '@/services/submission.server';
// import { CompactFileUpload } from '@/components/grading/CompactFileUpload';
import { CircularUpload } from '@/components/grading/CircularUpload';
import { FilePreview } from '@/components/grading/FilePreview';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
// import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Loader2, ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const student = await requireStudent(request);
  const { assignmentId } = params;

  if (!assignmentId) throw new Response('Assignment not found', { status: 404 });

  const assignment = await getAssignmentAreaForSubmission(assignmentId, student.id);
  if (!assignment) throw new Response('Assignment not found', { status: 404 });

  return { student, assignment };
}

type State = 'idle' | 'ready' | 'grading' | 'completed' | 'error';

export default function SubmitAssignment() {
  const { assignment } = useLoaderData<typeof loader>();

  const [state, setState] = useState<State>('idle');
  const [fileId, setFileId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadedMeta, setUploadedMeta] = useState<{ fileId: string; fileName: string; fileSize: number; mimeType: string } | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const criteria = (assignment.rubric as any)?.criteria || [];

  const pollSession = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/grading/session/${id}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        const { status, gradingResults } = data.data;
        // Consider session completed if status is COMPLETED
        if (status === 'COMPLETED' && gradingResults?.length) {
          const first = gradingResults.find((r: any) => r.result) || gradingResults[0];
          if (first?.result) setResult(first.result);
          setState('completed');
          return true;
        }
        // Fallback: if any result is completed with result payload, treat as done
        const completed = Array.isArray(gradingResults)
          ? gradingResults.find((r: any) => r.status === 'COMPLETED' && r.result)
          : null;
        if (completed) {
          setResult(completed.result);
          setState('completed');
          return true;
        }
        if (status === 'FAILED') {
          setError('Grading failed. Please try again.');
          setState('error');
          return true;
        }
      }
      return false;
    } catch {
      setError('Failed to check grading status.');
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
    if (files[0]) {
      setFileId(files[0].fileId);
      setUploadedMeta(files[0]);
      setState('ready');
      setError(null);
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
    if (!fileToGrade || !assignment.rubric?.id) return setError('No file or rubric found.');
    
    setState('grading');
    setError(null);

    try {
      // Ensure server-side PDF/text parsing is done before grading
      const parseStatus = await waitForParse(fileToGrade);
      if (parseStatus === 'failed') {
        throw new Error('File parsing failed. Please upload a different file or try again later.');
      }
      if (parseStatus === 'timeout') {
        throw new Error('Parsing is taking longer than expected. Please try again shortly.');
      }

      const form = new FormData();
      form.append('fileIds', JSON.stringify([fileToGrade]));
      form.append('rubricIds', JSON.stringify([assignment.rubric.id]));

      const sessionRes = await fetch('/api/grading/session', { method: 'POST', body: form });
      const sessionData = await sessionRes.json();
      if (!sessionData.success) throw new Error(sessionData.error);

      const id = sessionData.data.sessionId;
      setSessionId(id);

      const startForm = new FormData();
      startForm.append('action', 'start');
      const startRes = await fetch(`/api/grading/session/${id}`, { method: 'POST', body: startForm });
      const startData = await startRes.json();
      if (!startData.success) throw new Error(startData.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start grading');
      setState('error');
    }
  };

  const submitFinal = async () => {
    if (!fileId) return setError('No file uploaded.');

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/student/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: assignment.id, uploadedFileId: fileId }),
      });

      const data = await res.json();
      if (data.success) window.location.href = '/student/submissions';
      else throw new Error(data.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
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
                Back to Dashboard
              </a>
            </Button>
            <Button variant="secondary" onClick={() => setFocusMode((v) => !v)}>
              {focusMode ? (
                <>
                  <Minimize2 className="w-4 h-4 mr-2" /> Exit Focus
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 mr-2" /> Focus Mode
                </>
              )}
            </Button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 flex-1 flex flex-col w-full min-h-0">
        {/* Desktop layout (>= lg): resizable two-panel */}
        <div className="hidden lg:block flex-1 min-h-0">
        {focusMode ? (
          <div className="space-y-4 flex-1 min-h-0 flex flex-col">
            <ResizablePanelGroup direction="horizontal">
              {/* Left 35%: File preview + circular upload + actions */}
              <ResizablePanel defaultSize={50}>
                <div className="pr-4 md:pr-6 h-full flex flex-col min-h-0">
                  <div className="flex justify-center mb-2">
                    <CircularUpload diameter={56} onUploadComplete={onUploadComplete} onLocalFileSelected={setLocalFile} />
                  </div>
                  <div className="flex-1 min-h-0">
                    <FilePreview file={uploadedMeta || undefined} localFile={localFile} />
                  </div>
                  <div className="mt-2 flex flex-col gap-2">
                    <Button onClick={() => getAIFeedback()} disabled={!fileId || state === 'grading'}>
                      {state === 'grading' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...
                        </>
                      ) : (
                        'Get AI Feedback'
                      )}
                    </Button>
                    <Button onClick={submitFinal} disabled={!fileId || isSubmitting} className="bg-green-600 hover:bg-green-700">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" /> Submit Assignment
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              {/* Right 65%: Results */}
              <ResizablePanel defaultSize={50}>
                <div className="pl-4 md:pl-6 h-full flex flex-col">
                  <div className="flex-1 min-h-0 overflow-auto">
                    {state === 'completed' ? (
                      <GradingResultDisplay result={result} />
                    ) : state === 'grading' ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">AI is analyzing your work...</p>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-4 border rounded-md">上傳檔案並點選「Get AI Feedback」以查看評分結果。</div>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>

            {error && (
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
            )}
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal">
            {/* Left: Large preview + actions */}
            <ResizablePanel defaultSize={50}>
              <div className="pr-4 md:pr-6 h-full flex flex-col min-h-0">
                <div className="flex justify-center mb-2">
                  <CircularUpload diameter={56} onUploadComplete={onUploadComplete} onLocalFileSelected={setLocalFile} />
                </div>
                <div className="flex-1 min-h-0">
                  <FilePreview file={uploadedMeta || undefined} localFile={localFile} />
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  <Button onClick={() => getAIFeedback()} disabled={!fileId || state === 'grading'}>
                    {state === 'grading' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...
                      </>
                    ) : (
                      'Get AI Feedback'
                    )}
                  </Button>
                  <Button onClick={submitFinal} disabled={!fileId || isSubmitting} className="bg-green-600 hover:bg-green-700">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" /> Submit Assignment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            {/* Right: Feedback */}
            <ResizablePanel defaultSize={50}>
              <div className="pl-4 md:pl-6 h-full flex flex-col">
                <div className="flex-1 min-h-0 overflow-auto">
                  {state === 'completed' ? (
                    <GradingResultDisplay result={result} />
                  ) : state === 'grading' ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">AI is analyzing your work...</p>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 border rounded-md">上傳檔案並點選「Get AI Feedback」以查看評分結果。</div>
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
        </div>

        {/* Mobile/Tablet layout (< lg): stacked sections */}
        <div className="lg:hidden flex-1 min-h-0 flex flex-col gap-3">
          {/* Upper: upload circle + compact preview area */}
          <div className="h-[300px] flex flex-col min-h-0">
            <div className="flex justify-center mb-2">
              <CircularUpload diameter={48} onUploadComplete={onUploadComplete} onLocalFileSelected={setLocalFile} />
            </div>
            <div className="flex-1 min-h-0">
              <FilePreview file={uploadedMeta || undefined} localFile={localFile} />
            </div>
          </div>
          {/* Lower: actions + results */}
          <div className="flex flex-col gap-2">
            <Button onClick={() => getAIFeedback()} disabled={!fileId || state === 'grading'}>
              {state === 'grading' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...
                </>
              ) : (
                'Get AI Feedback'
              )}
            </Button>
            <Button onClick={submitFinal} disabled={!fileId || isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" /> Submit Assignment
                </>
              )}
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {state === 'completed' ? (
              <GradingResultDisplay result={result} />
            ) : state === 'grading' ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">AI is analyzing your work...</p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground p-4 border rounded-md">上傳檔案並點選「Get AI Feedback」以查看評分結果。</div>
            )}
          </div>
          {error && (
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
          )}
        </div>
      </main>
    </div>
  );
}

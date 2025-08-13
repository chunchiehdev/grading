import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { useEffect, useState } from 'react';
import { requireStudent } from '@/services/auth.server';
import { getAssignmentAreaForSubmission } from '@/services/submission.server';
import { CompactFileUpload } from '@/components/grading/CompactFileUpload';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, RefreshCw, Loader2, ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
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

      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 flex flex-col w-full">
        {focusMode ? (
          <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Your Submission</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Step 1: Upload */}
                  <CompactFileUpload maxFiles={1} onUploadComplete={onUploadComplete} onError={setError} />

                  {/* Step 2: AI Feedback */}
                  {state === 'ready' && (
                    <Button onClick={() => getAIFeedback()} className="w-full">
                      Get AI Feedback
                    </Button>
                  )}
                  {state === 'grading' && (
                    <div className="text-center py-6">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">AI is analyzing your work...</p>
                    </div>
                  )}

                  {/* Step 3: Results & Submit */}
                  {state === 'completed' && (
                    <div className="space-y-6">
                      <GradingResultDisplay result={result} />
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button variant="outline" onClick={reset} className="flex-1" size="sm">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Try Different File
                        </Button>
                        <Button
                          onClick={submitFinal}
                          disabled={isSubmitting}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Submit Assignment
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">Creates your official submission</p>
                    </div>
                  )}

                  {!['ready', 'grading', 'completed'].includes(state) && (
                    <p className="text-center py-6 text-muted-foreground text-sm">Upload a file to get started</p>
                  )}
                </CardContent>
              </Card>

              {/* Error display */}
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
            <ResizablePanel defaultSize={65}>
              <div className="pr-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Submission</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Step 1: Upload */}
                    <CompactFileUpload maxFiles={1} onUploadComplete={onUploadComplete} onError={setError} />

                    {/* Step 2: AI Feedback */}
                    {state === 'ready' && (
                      <Button onClick={() => getAIFeedback()} className="w-full">
                        Get AI Feedback
                      </Button>
                    )}
                    {state === 'grading' && (
                      <div className="text-center py-6">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">AI is analyzing your work...</p>
                      </div>
                    )}

                    {/* Step 3: Results & Submit */}
                    {state === 'completed' && (
                      <div className="space-y-6">
                        <GradingResultDisplay result={result} />
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button variant="outline" onClick={reset} className="flex-1" size="sm">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Different File
                          </Button>
                          <Button
                            onClick={submitFinal}
                            disabled={isSubmitting}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Submit Assignment
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">Creates your official submission</p>
                      </div>
                    )}

                    {!['ready', 'grading', 'completed'].includes(state) && (
                      <p className="text-center py-6 text-muted-foreground text-sm">Upload a file to get started</p>
                    )}
                  </CardContent>
                </Card>

                {/* Error display */}
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
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={35}>
              <div className="pl-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Assignment Info</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                      <span>{assignment.course.name}</span>
                      <span>{assignment.course.teacher.email}</span>
                    </div>
                    {assignment.description && <p className="text-muted-foreground text-sm">{assignment.description}</p>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Grading Rubric</CardTitle>
                  </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm">{assignment.rubric?.name || 'No rubric name'}</p>
                      {Array.isArray(criteria) && criteria.length > 0 ? (
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {criteria.map((c: any, idx: number) => (
                            <li key={c.id || idx} className="flex items-center justify-between">
                              <span className="truncate mr-2">{c.name || `Criteria ${idx + 1}`}</span>
                              {typeof c.maxScore === 'number' && <Badge variant="secondary">{c.maxScore}</Badge>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">This rubric doesn't have detailed criteria yet.</p>
                      )}
                    </CardContent>
                </Card>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </main>
    </div>
  );
}

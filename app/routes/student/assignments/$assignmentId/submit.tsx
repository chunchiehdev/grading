import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { useState, useEffect } from 'react';
import { requireStudent } from '@/services/auth.server';
import { getAssignmentAreaForSubmission } from '@/services/submission.server';
import { CompactFileUpload } from '@/components/grading/CompactFileUpload';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';

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

  const criteria = (assignment.rubric as any)?.criteria || [];

  const pollSession = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/grading/session/${id}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        const { status, gradingResults } = data.data;
        if (status === 'COMPLETED' && gradingResults?.[0]) {
          setResult(gradingResults[0].result);
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

  const getAIFeedback = async (currentFileId?: string) => {
    const fileToGrade = currentFileId || fileId;
    if (!fileToGrade || !assignment.rubric?.id) return setError('No file or rubric found.');
    
    setState('grading');
    setError(null);

    try {
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

  const stepClass = (current: State) => 
    `transition-all duration-300 ${state === current ? 'ring-2 ring-primary/20 shadow-lg' : 'opacity-50'}`;
  
  const stepBadge = (num: number, current: State) => {
    const isActive = state === current;
    const isCompleted = ['ready', 'grading', 'completed'].includes(state) && current === 'ready';
    return (
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
        isActive ? 'bg-primary/10 text-primary' : 
        isCompleted ? 'bg-green-500/10 text-green-600' : 
        'bg-muted text-muted-foreground'
      }`}>
        {state === 'grading' && current === 'grading' ? <Loader2 className="h-4 w-4 animate-spin" /> : num}
      </div>
    );
  };

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold">{assignment.name}</h1>
          <p className="text-muted-foreground">{assignment.course.name} • {assignment.course.teacher.email}</p>
          <a href="/student/dashboard" className="text-sm text-primary hover:underline">← Back to Dashboard</a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Assignment Info */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
              <span>{assignment.course.name}</span>
              <span>{assignment.course.teacher.email}</span>
              {/* {assignment.dueDate && <span>Due: {new Date(assignment.dueDate).toLocaleString()}</span>} */}
            </div>
            {assignment.description && <p className="text-muted-foreground">{assignment.description}</p>}
          </CardContent>
        </Card>

        {/* 3-Step Workflow */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Step 1: Upload */}
          <Card className={stepClass('ready')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {stepBadge(1, 'ready')}
                Upload File
                {state === 'ready' && <Badge variant="secondary">✓ Ready</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CompactFileUpload maxFiles={1} onUploadComplete={onUploadComplete} onError={setError} />
            </CardContent>
          </Card>

          {/* Step 2: Grade */}
          <Card className={stepClass('grading')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {stepBadge(2, 'grading')}
                Get AI Feedback
                {state === 'completed' && <Badge variant="secondary">✓ Complete</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              {state === 'completed' && (
                <div className="space-y-3">
                  <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <p className="text-sm text-green-700 font-medium">Feedback ready!</p>
                  </div>
                  <Button variant="outline" onClick={reset} className="w-full" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />Try Different File
                  </Button>
                </div>
              )}
              {!['ready', 'grading', 'completed'].includes(state) && (
                <p className="text-center py-6 text-muted-foreground text-sm">Upload a file first</p>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Submit */}
          <Card className={stepClass('completed')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {stepBadge(3, 'completed')}
                Final Submit
              </CardTitle>
            </CardHeader>
            <CardContent>
              {state === 'completed' ? (
                <div className="space-y-3">
                  <Button onClick={submitFinal} disabled={isSubmitting} className="w-full bg-green-600 hover:bg-green-700">
                    {isSubmitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</>
                    ) : (
                      <><CheckCircle className="h-4 w-4 mr-2" />Submit Assignment</>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">Creates your official submission</p>
                </div>
              ) : (
                <p className="text-center py-6 text-muted-foreground text-sm">Complete preview first</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-medium text-destructive">Error</h4>
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {state === 'completed' && result && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Your AI Feedback & Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GradingResultDisplay result={result} />
            </CardContent>
          </Card>
        )}

        {/* Rubric */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Grading Rubric
              <Badge variant="outline">{assignment.rubric.name}</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">{assignment.rubric.description}</p>
          </CardHeader>
          <CardContent>
            {criteria.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {criteria.map((criterion: any, i: number) => (
                  <div key={i} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                    <h3 className="font-medium mb-2">{criterion.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{criterion.description}</p>
                    {criterion.levels?.map((level: any, j: number) => (
                      <div key={j} className="flex justify-between items-start bg-muted rounded p-2 text-xs mb-1">
                        <span className="flex-1">{level.description}</span>
                        <span className="font-medium text-primary ml-2">{level.score} pts</span>
                      </div>
                    ))}
                    <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
                      Max: <span className="font-medium">{criterion.maxScore || 0} points</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium mb-2">No criteria defined</h3>
                <p className="text-muted-foreground">This rubric doesn't have detailed criteria yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 

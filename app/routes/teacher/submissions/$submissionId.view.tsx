import { type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { useLoaderData, useActionData } from 'react-router';
import { ClientOnly } from '@/components/ui/client-only';
import { requireTeacher } from '@/services/auth.server';
import { getSubmissionByIdForTeacher } from '@/services/submission.server';
import { GradingResultDisplay } from '@/components/grading/GradingResultDisplay';
import { PDFViewerWithNavigation } from '@/components/pdf/PDFViewerWithNavigation';
import {
  StudentInfoCompact,
  AssignmentInfoCompact,
  ScoreBadge,
} from '@/components/grading/CompactInfoComponents';
import { useTranslation } from 'react-i18next';
import type { TeacherInfo, TeacherSubmissionView } from '@/types/teacher';


interface LoaderData {
  teacher: TeacherInfo;
  submission: TeacherSubmissionView;
}


interface ActionData {
  success?: boolean;
  error?: string;
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const submissionId = params.submissionId as string;

  if (!submissionId) {
    throw new Response('Submission ID is required', { status: 400 });
  }

  const rawSubmission = await getSubmissionByIdForTeacher(submissionId, teacher.id);

  if (!rawSubmission) {
    throw new Response('Submission not found', { status: 404 });
  }

  // Import date formatting utilities
  const { formatDateForDisplay } = await import('@/lib/date.server');

  // Transform database structure into display-optimized structure
  const submission: TeacherSubmissionView = {
    student: {
      name: rawSubmission.student?.name ?? 'Unknown Student',
      email: rawSubmission.student?.email ?? 'No email',
      picture: rawSubmission.student?.picture ?? null,
      initial: rawSubmission.student?.name?.[0] ?? 'U',
    },
    assignment: {
      id: rawSubmission.assignmentArea.id,
      name: rawSubmission.assignmentArea.name,
      description: rawSubmission.assignmentArea.description,
      dueDate: rawSubmission.assignmentArea.dueDate?.toISOString() ?? null,
      formattedDueDate: rawSubmission.assignmentArea.dueDate
        ? formatDateForDisplay(rawSubmission.assignmentArea.dueDate)
        : null,
      course: {
        id: rawSubmission.assignmentArea.course.id,
        name: rawSubmission.assignmentArea.course.name,
      },
    },
    grading: {
      finalScore: rawSubmission.finalScore,
      normalizedScore: rawSubmission.normalizedScore,
      uploadedAt: rawSubmission.uploadedAt.toISOString(),
      formattedUploadedAt: formatDateForDisplay(rawSubmission.uploadedAt),
      filePath: rawSubmission.filePath,
      teacherFeedback: rawSubmission.teacherFeedback,
      aiAnalysisResult: rawSubmission.aiAnalysisResult,
      usedContext: rawSubmission.usedContext ?? null, // Feature 004
      thinkingProcess: rawSubmission.thinkingProcess ?? null, // Feature 012: AI thinking process
      thoughtSummary: rawSubmission.thoughtSummary ?? null, // Legacy field for compatibility
      gradingRationale: rawSubmission.gradingRationale ?? null, // Feature 012: AI grading rationale
    },
    navigation: {
      backUrl: `/teacher/courses/${rawSubmission.assignmentArea.course.id}/assignments/${rawSubmission.assignmentArea.id}/submissions`,
    },
  };

  return { teacher, submission };
}

export async function action({ request, params }: ActionFunctionArgs): Promise<ActionData> {
  const teacher = await requireTeacher(request);
  const submissionId = params.submissionId as string;
  const formData = await request.formData();
  const teacherFeedback = formData.get('teacherFeedback') as string;

  try {
    // Import the update function
    const { updateSubmission } = await import('@/services/submission.server');

    // Verify teacher has permission to update this submission
    const submission = await getSubmissionByIdForTeacher(submissionId, teacher.id);
    if (!submission) {
      return { success: false, error: 'Submission not found or unauthorized' };
    }

    // Update the submission with teacher feedback
    await updateSubmission(submissionId, {
      teacherFeedback: teacherFeedback || undefined,
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating teacher feedback:', error);
    return { success: false, error: 'Failed to save feedback' };
  }
}

export default function TeacherSubmissionView() {
  const { submission } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation('teacher');

  // Full screen layout - bypasses parent container constraints
  return (
    <div className="fixed inset-0 top-[60px] bg-background flex flex-col">
      {/* Top Info Bar - RED - Responsive */}
      <div className="border-b backdrop-blur-sm shrink-0 z-10" style={{ backgroundColor: 'rgba(239, 68, 68, 0.3)' }}>
        <div className="px-4 lg:px-6 py-2 lg:py-3 flex items-center justify-between gap-2 lg:gap-6">
          {/* Left: Student + Assignment */}
          <div className="flex items-center gap-2 lg:gap-6 flex-1 min-w-0">
            <StudentInfoCompact student={submission.student} />
            <div className="h-6 w-px bg-border hidden lg:block" />
            <div className="hidden lg:block">
              <AssignmentInfoCompact assignment={submission.assignment} />
            </div>
          </div>

          {/* Right: Score */}
          <ScoreBadge score={submission.grading.normalizedScore} />
        </div>
      </div>

      {/* Main Content: PDF + Sidebar - Responsive Layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
        {/* Left: PDF Viewer - BLUE */}
        {/* Mobile: full width, Desktop: 70% */}
        <div 
          className="w-full lg:w-[70%] border-r-0 lg:border-r overflow-hidden flex flex-col h-[50vh] lg:h-auto" 
          style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
        >
          {submission.grading.filePath ? (
            <ClientOnly
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <span className="text-muted-foreground">載入 PDF 檢視器...</span>
                  </div>
                </div>
              }
            >
              <PDFViewerWithNavigation
                fileUrl={`/api/files/${submission.grading.filePath}/download`}
                fileName={`${submission.student.name}-${submission.assignment.name}.pdf`}
              />
            </ClientOnly>
          ) : ( 
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">沒有上傳檔案</p>
            </div>
          )}
        </div>

        {/* Right: Grading Sidebar - GREEN */}
        {/* Mobile: full width, Desktop: 30% */}
        <aside 
          className="w-full lg:w-[30%] overflow-y-auto flex-1 lg:flex-initial" 
          style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
        >
          <div className="p-6">
            {/* AI Analysis Details */}
            {submission.grading.aiAnalysisResult && (
              <GradingResultDisplay
                result={submission.grading.aiAnalysisResult}
                normalizedScore={submission.grading.normalizedScore}
                thinkingProcess={submission.grading.thinkingProcess}
                thoughtSummary={submission.grading.thoughtSummary}
                gradingRationale={submission.grading.gradingRationale}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { StudentInfo } from '@/types/student';

interface Submission {
  id: string;
  uploadedAt: Date | string | null;
  status?: 'DRAFT' | 'SUBMITTED' | 'ANALYZED' | 'GRADED';
  assignmentAreaId?: string;
  assignmentArea?: {
    name: string;
    course?: {
      name: string;
    };
  };
}

interface SubmissionsContentProps {
  data: {
    student: StudentInfo;
    submissions: Submission[];
  };
}

export function SubmissionsContent({ data }: SubmissionsContentProps) {
  const { submissions } = data;
  const { t } = useTranslation(['common', 'submissions']);
  const navigate = useNavigate();

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return t('submissions:timeAgo.justNow');
    if (diffInMinutes < 60) return t('submissions:timeAgo.minutesAgo', { count: diffInMinutes });
    if (diffInMinutes < 1440) return t('submissions:timeAgo.hoursAgo', { count: Math.floor(diffInMinutes / 60) });
    return t('submissions:timeAgo.daysAgo', { count: Math.floor(diffInMinutes / 1440) });
  };

  return (
    <div className="space-y-6">
      {!submissions || submissions.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-8 max-w-md">
            {/* Icon */}
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-muted/40 to-muted/20 flex items-center justify-center">
              <FileText className="w-12 h-12 text-muted-foreground" />
            </div>

            {/* Main Content */}
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold text-foreground">{t('submissions:teacherComments.empty')}</h1>
              <p className="text-muted-foreground">{t('submissions:teacherComments.hint')}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/70 bg-background">
          {/* Desktop Header */}
          <div className="hidden border-b px-4 py-4 sm:px-6 md:block">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
              <div className="col-span-3">{t('submissions:table.assignment')}</div>
              <div className="col-span-3">{t('submissions:table.course')}</div>
              <div className="col-span-3 text-right">{t('submissions:table.submittedAt')}</div>
              <div className="col-span-3 text-right">{t('submissions:table.actions')}</div>
            </div>
          </div>

          {/* List Content */}
          <div className="divide-y divide-border/50">
            {submissions.map((s) => (
              <div
                key={s.id}
                className="cursor-pointer px-4 py-4 transition-colors hover:bg-muted/30 sm:px-6"
                onClick={() => navigate(`/student/submissions/${s.id}`)}
              >
                <div className="flex flex-col gap-3 md:grid md:grid-cols-12 md:items-center md:gap-4">
                  {/* Assignment */}
                  <div className="md:col-span-3">
                    <p className="truncate text-sm font-medium text-foreground transition-colors hover:text-primary">
                      {s.assignmentArea?.name}
                    </p>
                  </div>

                  {/* Course */}
                  <div className="md:col-span-3">
                    <p className="truncate text-sm text-muted-foreground">{s.assignmentArea?.course?.name}</p>
                  </div>

                  {/* Submitted time */}
                  <div className="md:col-span-3 md:text-right">
                    <p className="text-xs text-muted-foreground md:text-sm">
                      <span className="mr-1 inline md:hidden">{t('submissions:table.submittedAt')}:</span>
                      {s.uploadedAt ? formatTimeAgo(new Date(s.uploadedAt)) : '-'}
                    </p>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 md:col-span-3 md:justify-end md:pt-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/student/submissions/${s.id}/history`);
                      }}
                      className="rounded-full border border-muted-foreground/30 px-3 py-1.5 text-xs transition-colors hover:bg-muted/50"
                    >
                      {t('submissions:actions.viewHistory')}
                    </button>
                    {/* Resubmit Button (only for non-graded submissions) */}
                    {s.assignmentAreaId &&
                      (s.status === 'SUBMITTED' || s.status === 'ANALYZED') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/student/assignments/${s.assignmentAreaId}/submit?resubmit=1`);
                          }}
                          className="rounded-full border border-primary/40 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10"
                        >
                          {t('submissions:actions.resubmit')}
                        </button>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

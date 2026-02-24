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

    if (diffInMinutes < 1) return '剛剛';
    if (diffInMinutes < 60) return `${diffInMinutes} 分鐘前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} 小時前`;
    return `${Math.floor(diffInMinutes / 1440)} 天前`;
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
        <div className="bg-background rounded-lg">
          {/* Table Header Row */}
          <div className="px-4 sm:px-6 py-4 border-b">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
              <div className="col-span-3">{t('submissions:table.assignment')}</div>
              <div className="col-span-3">{t('submissions:table.course')}</div>
              <div className="col-span-3 text-right">{t('submissions:table.submittedAt')}</div>
              <div className="col-span-3 text-right">操作</div>
            </div>
          </div>

          {/* List Content */}
          <div className="divide-y divide-border/50">
            {submissions.map((s) => (
              <div
                key={s.id}
                className="px-4 sm:px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/student/submissions/${s.id}`)}
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Assignment Column */}
                  <div className="col-span-3">
                    <p className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">
                      {s.assignmentArea?.name}
                    </p>
                  </div>

                  {/* Course Column */}
                  <div className="col-span-3">
                    <p className="text-sm text-muted-foreground truncate">{s.assignmentArea?.course?.name}</p>
                  </div>

                  {/* Time Column */}
                  <div className="col-span-3 text-right">
                    <p className="text-sm text-muted-foreground">
                      {s.uploadedAt ? formatTimeAgo(new Date(s.uploadedAt)) : '-'}
                    </p>
                  </div>

                  {/* Actions Column */}
                  <div className="col-span-3 flex justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/student/submissions/${s.id}/history`);
                      }}
                      className="text-xs px-2 py-1 border border-muted-foreground/30 rounded hover:bg-muted/50 transition-colors"
                    >
                      查看歷史
                    </button>
                    {/* Resubmit Button (only for non-graded submissions) */}
                    {s.assignmentAreaId &&
                      (s.status === 'SUBMITTED' || s.status === 'ANALYZED') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/student/assignments/${s.assignmentAreaId}/submit?resubmit=1`);
                          }}
                          className="text-xs px-2 py-1 border border-primary/40 text-primary rounded hover:bg-primary/10 transition-colors"
                        >
                          重新提交
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

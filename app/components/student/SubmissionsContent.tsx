import { useNavigate } from 'react-router';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { StudentInfo } from '@/types/student';

interface Submission {
  id: string;
  uploadedAt: Date | null;
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
    <div className="bg-background">
      {/* Table Header Row */}
      <div className="px-6 md:px-8 lg:px-10 py-4 border-b border-border">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
          <div className="col-span-4">{t('submissions:table.assignment')}</div>
          <div className="col-span-4">{t('submissions:table.course')}</div>
          <div className="col-span-4 text-right">{t('submissions:table.submittedAt')}</div>
        </div>
      </div>

      {/* List Content */}
      {!submissions || submissions.length === 0 ? (
        <div className="text-center py-12 md:py-16 lg:py-20 px-6">
          <FileText className="mx-auto h-16 md:h-20 lg:h-24 xl:h-28 w-16 md:w-20 lg:w-24 xl:w-28 text-muted-foreground" />
          <h3 className="mt-6 md:mt-8 text-lg md:text-xl lg:text-2xl font-medium text-foreground">
            {t('submissions:teacherComments.empty')}
          </h3>
          <p className="mt-2 md:mt-4 text-base md:text-lg text-muted-foreground">
            {t('submissions:teacherComments.hint')}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {submissions.map((s) => (
            <div
              key={s.id}
              className="px-6 md:px-8 lg:px-10 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/student/submissions/${s.id}`)}
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Assignment Column */}
                <div className="col-span-4">
                  <p className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">
                    {s.assignmentArea?.name}
                  </p>
                </div>

                {/* Course Column */}
                <div className="col-span-4">
                  <p className="text-sm text-muted-foreground truncate">
                    {s.assignmentArea?.course?.name}
                  </p>
                </div>

                {/* Time Column */}
                <div className="col-span-4 text-right">
                  <p className="text-sm text-muted-foreground">
                    {s.uploadedAt ? formatTimeAgo(new Date(s.uploadedAt)) : '-'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
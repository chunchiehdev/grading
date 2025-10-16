import { FileText } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { TeacherInfo, SubmissionInfo, CourseInfo } from '@/types/teacher';

interface TeacherDashboardContentProps {
  data: {
    teacher: TeacherInfo;
    courses: CourseInfo[];
    recentSubmissions: SubmissionInfo[];
  };
}

export function TeacherDashboardContent({ data }: TeacherDashboardContentProps) {
  const { recentSubmissions } = data;

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return '剛剛';
    if (diffInMinutes < 60) return `${diffInMinutes} 分鐘前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} 小時前`;
    return `${Math.floor(diffInMinutes / 1440)} 天前`;
  };

  const getScoreDisplay = (score: number | null) => {
    if (score === null) {
      return <span className="text-sm text-muted-foreground">評分中...</span>;
    }
    return (
      <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/10 text-primary">
        <span className="text-sm font-medium">{score}</span>
        <span className="text-xs ml-1">分</span>
      </div>
    );
  };

  return (
    <div className="bg-background">
      {/* Table Header Row */}
      <div className="px-6 md:px-8 lg:px-10 py-4 border-b border-border">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
          <div className="col-span-4">學生</div>
          <div className="col-span-3">作業</div>
          <div className="col-span-2">課程</div>
          <div className="col-span-2">提交時間</div>
          <div className="col-span-1 text-right">分數</div>
        </div>
      </div>

      {/* List Content */}
      {recentSubmissions.length === 0 ? (
        <div className="text-center py-12 md:py-16 lg:py-20 px-6">
          <FileText className="mx-auto h-16 md:h-20 lg:h-24 xl:h-28 w-16 md:w-20 lg:w-24 xl:w-28 text-muted-foreground" />
          <h3 className="mt-6 md:mt-8 text-lg md:text-xl lg:text-2xl font-medium text-foreground">目前沒有新的提交</h3>
          <p className="mt-2 md:mt-4 text-base md:text-lg text-muted-foreground">當學生提交作業時，會顯示在這裡</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {recentSubmissions.map((submission) => (
            <div
              key={submission.id}
              className="px-6 md:px-8 lg:px-10 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => {
                // Navigate to the specific submission detail page
                const url = `/teacher/submissions/${submission.id}/view`;
                window.location.href = url;
              }}
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Student Column */}
                <div className="col-span-4 flex items-center gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={submission.student?.picture} alt={submission.student?.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {submission.student?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {submission.student?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{submission.student?.email || ''}</p>
                  </div>
                </div>

                {/* Assignment Column */}
                <div className="col-span-3">
                  <p className="text-sm text-foreground truncate hover:text-primary transition-colors">
                    {submission.assignmentArea.name}
                  </p>
                </div>

                {/* Course Column */}
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground truncate">{submission.assignmentArea.course.name}</p>
                </div>

                {/* Time Column */}
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">{formatTimeAgo(submission.uploadedAt)}</p>
                </div>

                {/* Score Column */}
                <div className="col-span-1 text-right">{getScoreDisplay(submission.finalScore)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

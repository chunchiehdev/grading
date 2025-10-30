import { useSubmissionStore } from '@/stores/submissionStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { CheckCheck, FileText } from 'lucide-react';
import { useMemo } from 'react';

export function NotificationCenter() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const submissions = useSubmissionStore((state) => state.submissions);
  const unreadCount = useSubmissionStore((state) => state.unreadCount);
  const markAllAsRead = useSubmissionStore((state) => state.markAllAsRead);
  const markAsRead = useSubmissionStore((state) => state.markAsRead);
  const isLoading = useSubmissionStore((state) => state.isLoading);
  const lastUpdated = useSubmissionStore((state) => state.lastUpdated);

  console.log('[NotificationCenter] 🔍 Component rendering:', {
    submissionsLength: submissions.length,
    unreadCount,
    isLoading,
    lastUpdated,
    hasData: lastUpdated !== null
  });

  // Use useMemo to prevent unnecessary re-renders
  const recentSubmissions = useMemo(() => {
    console.log('[NotificationCenter] 📊 Computing recentSubmissions from:', {
      total: submissions.length,
      unread: unreadCount,
      showing: Math.min(submissions.length, 20),
      firstItem: submissions[0]
    });
    return submissions.slice(0, 20);
  }, [submissions, unreadCount]);

  const locale = i18n.language === 'zh' ? zhTW : enUS;

  const handleNotificationClick = async (notificationId: string, submissionId: string) => {
    console.log('═══════════════════════════════════════════════');
    console.log('[NotificationCenter] 🖱️ NOTIFICATION CLICKED!');
    console.log('[NotificationCenter] 📋 Details:', {
      notificationId,
      submissionId
    });
    console.log('═══════════════════════════════════════════════');

    // Wait for mark-as-read to complete before navigating
    // This ensures the database is updated before the loader runs
    await markAsRead(notificationId);

    // Navigate to submission view page
    console.log('[NotificationCenter] 🚀 Navigating to:', `/teacher/submissions/${submissionId}/view`);
    navigate(`/teacher/submissions/${submissionId}/view`);
    // Dropdown will auto-close due to navigation
  };

  const handleMarkAllAsRead = () => {
    console.log('[NotificationCenter] ✅ Mark all as read clicked');
    markAllAsRead();
  };

  // Show loading state if data hasn't been fetched yet
  if (isLoading && lastUpdated === null) {
    return (
      <div className="px-3 py-8 text-center">
        <div className="w-12 h-12 mx-auto mb-2 animate-pulse">
          <FileText className="w-full h-full text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground">載入中...</p>
      </div>
    );
  }

  // Show empty state if no notifications after loading
  if (recentSubmissions.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">目前沒有新通知</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with Mark All Read */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="text-sm font-semibold">通知</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMarkAllAsRead}
          className="h-8 text-xs"
        >
          <CheckCheck className="w-3 h-3 mr-1" />
          全部標記為已讀
        </Button>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-1">
          {recentSubmissions.map((submission) => (
            <button
              key={submission.id}
              onClick={() => handleNotificationClick(submission.id, submission.submissionId)}
              className={`w-full px-3 py-3 text-left hover:bg-accent transition-colors flex flex-col gap-1 ${
                !submission.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 flex items-start gap-2">
                  {!submission.isRead && (
                    <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${!submission.isRead ? 'font-semibold' : 'font-medium'}`}>
                      {submission.studentName} 已提交作業
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {submission.assignmentName}
                    </p>
                    <p className="text-xs text-muted-foreground/70 truncate">
                      {submission.courseName}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {submission.status === 'PENDING' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                      待批改
                    </span>
                  )}
                  {submission.status === 'GRADED' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      已批改
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground/60">
                {formatDistanceToNow(new Date(submission.submittedAt), {
                  addSuffix: true,
                  locale,
                })}
              </p>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

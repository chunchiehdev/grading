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
  const { i18n, t } = useTranslation('navigation');
  const navigate = useNavigate();
  const submissions = useSubmissionStore((state) => state.submissions);
  const unreadCount = useSubmissionStore((state) => state.unreadCount);
  const markAllAsRead = useSubmissionStore((state) => state.markAllAsRead);
  const markAsRead = useSubmissionStore((state) => state.markAsRead);
  const isLoading = useSubmissionStore((state) => state.isLoading);
  const lastUpdated = useSubmissionStore((state) => state.lastUpdated);

  // Use useMemo to prevent unnecessary re-renders
  const recentSubmissions = useMemo(() => {
    return submissions.slice(0, 20);
  }, [submissions]);

  const locale = i18n.language === 'zh' ? zhTW : enUS;

  const handleNotificationClick = async (notificationId: string, submissionId: string) => {
    // Wait for mark-as-read to complete before navigating
    // This ensures the database is updated before the loader runs
    await markAsRead(notificationId);

    // Navigate to submission view page
    navigate(`/teacher/submissions/${submissionId}/view`);
    // Dropdown will auto-close due to navigation
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  // Show loading state if data hasn't been fetched yet
  if (isLoading && lastUpdated === null) {
    return (
      <div className="px-3 py-8 text-center">
        <div className="w-12 h-12 mx-auto mb-2 animate-pulse">
          <FileText className="w-full h-full text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground">{t('notificationsLoading')}</p>
      </div>
    );
  }

  // Show empty state if no notifications after loading
  if (recentSubmissions.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">{t('notificationsEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with Mark All Read */}
      <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{t('notifications')}</div>
          <div className="text-xs text-muted-foreground">{unreadCount > 99 ? '99+' : unreadCount}</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMarkAllAsRead}
          className="h-8 shrink-0 text-xs"
          disabled={unreadCount === 0}
        >
          <CheckCheck className="w-3 h-3 mr-1" />
          {t('markAllRead')}
        </Button>
      </div>

      <ScrollArea className="h-[min(70vh,32rem)]">
        <div className="space-y-2 p-2">
          {recentSubmissions.map((submission) => (
            <button
              key={submission.id}
              onClick={() => handleNotificationClick(submission.id, submission.submissionId)}
              className={`w-full min-h-[6.5rem] rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent/70 ${
                !submission.isRead ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20' : 'border-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                  {!submission.isRead && (
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className={`line-clamp-2 break-words text-sm ${!submission.isRead ? 'font-semibold' : 'font-medium'}`}>
                      {t('submissionReceived', { studentName: submission.studentName })}
                    </p>
                    <p className="line-clamp-2 break-words text-sm text-muted-foreground">
                      {submission.assignmentName}
                    </p>
                    <p className="line-clamp-1 break-words text-xs text-muted-foreground/70">
                      {submission.courseName}
                    </p>
                    <p className="pt-1 text-xs text-muted-foreground/60">
                      {formatDistanceToNow(new Date(submission.submittedAt), {
                        addSuffix: true,
                        locale,
                      })}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 pt-0.5">
                  {submission.status === 'PENDING' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                      {t('pendingReview')}
                    </span>
                  )}
                  {submission.status === 'GRADED' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      {t('graded')}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

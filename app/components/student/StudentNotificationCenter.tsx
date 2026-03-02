import { useNotificationStore } from '@/stores/notificationStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router';
import { formatDistanceToNow } from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { CheckCheck, FileText, Bell } from 'lucide-react';
import { useMemo } from 'react';

export function StudentNotificationCenter() {
  const { i18n, t } = useTranslation('navigation');
  const navigate = useNavigate();
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const isLoading = useNotificationStore((state) => state.isLoading);
  const lastUpdated = useNotificationStore((state) => state.lastUpdated);

  // Use useMemo to prevent unnecessary re-renders
  const recentNotifications = useMemo(() => {
    return notifications.slice(0, 20);
  }, [notifications]);

  const locale = i18n.language === 'zh' ? zhTW : enUS;

  const handleNotificationClick = async (notificationId: string, link?: string) => {
    // Wait for mark-as-read to complete before navigating
    await markAsRead(notificationId);

    if (link) {
      navigate(link);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  // Show loading state if data hasn't been fetched yet
  if (isLoading && lastUpdated === null) {
    return (
      <div className="px-3 py-8 text-center">
        <div className="w-12 h-12 mx-auto mb-2 animate-pulse">
          <Bell className="w-full h-full text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground">{t('notificationsLoading')}</p>
      </div>
    );
  }

  // Show empty state if no notifications after loading
  if (recentNotifications.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <Bell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
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
          {recentNotifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification.id, notification.link)}
              className={`w-full min-h-[6.5rem] rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent/70 ${
                !notification.isRead ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20' : 'border-transparent'
              }`}
            >
              <div className="flex items-start gap-3.5">
                {!notification.isRead && (
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <p
                    className={`line-clamp-2 break-words text-sm ${!notification.isRead ? 'font-semibold' : 'font-medium'} text-foreground`}
                  >
                    {notification.title}
                  </p>
                  <p className="line-clamp-2 break-words text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                      locale,
                    })}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

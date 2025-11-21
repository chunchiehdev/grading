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
  const { i18n } = useTranslation();
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
        <p className="text-sm text-muted-foreground">載入中...</p>
      </div>
    );
  }

  // Show empty state if no notifications after loading
  if (recentNotifications.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <Bell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">目前沒有新通知</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with Mark All Read */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
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
        <div className="divide-y">
          {recentNotifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification.id, notification.link)}
              className={`w-full px-4 py-3 text-left hover:bg-accent transition-colors flex flex-col gap-1 ${
                !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {!notification.isRead && (
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500" />
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className={`text-sm ${!notification.isRead ? 'font-semibold' : 'font-medium'} text-foreground`}>
                    {notification.title}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
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

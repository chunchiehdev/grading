import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface NotificationItem {
  id: string;
  type: 'ASSIGNMENT_CREATED' | 'ASSIGNMENT_UPDATED' | 'SUBMISSION_GRADED' | 'COURSE_ANNOUNCEMENT';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
  // Helper fields for UI navigation
  link?: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  setNotifications: (notifications: NotificationItem[]) => void;
  addNotification: (notification: NotificationItem) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearStore: () => void;
  fetchNotifications: () => Promise<void>;
  
  // Initialization
  initializeFromServer: (notifications: any[]) => void;
}

export const useNotificationStore = create<NotificationState>()(
  subscribeWithSelector((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    lastUpdated: null,

    setNotifications: (notifications) => {
      const unreadCount = notifications.filter((n) => !n.isRead).length;
      set({
        notifications: notifications.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        unreadCount,
        lastUpdated: new Date(),
        error: null,
      });
    },

    addNotification: (notification) => {
      const { notifications } = get();
      
      // Avoid duplicates
      if (notifications.some(n => n.id === notification.id)) return;

      const newNotification = { ...notification, isRead: false };
      const updatedNotifications = [newNotification, ...notifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      const unreadCount = updatedNotifications.filter((n) => !n.isRead).length;

      set({
        notifications: updatedNotifications,
        unreadCount,
        lastUpdated: new Date(),
      });
    },

    markAsRead: async (id) => {
      const originalNotifications = get().notifications;
      const originalUnreadCount = get().unreadCount;

      // Optimistic update
      set((state) => {
        const updatedNotifications = state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        );
        const unreadCount = updatedNotifications.filter((n) => !n.isRead).length;
        return {
          notifications: updatedNotifications,
          unreadCount,
        };
      });

      try {
        const response = await fetch('/api/notifications/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationIds: [id] }),
        });

        if (!response.ok) throw new Error('Failed to mark as read');
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        // Revert
        set({
          notifications: originalNotifications,
          unreadCount: originalUnreadCount,
        });
      }
    },

    markAllAsRead: async () => {
      const originalNotifications = get().notifications;
      const originalUnreadCount = get().unreadCount;

      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));

      try {
        const response = await fetch('/api/notifications/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markAll: true }),
        });

        if (!response.ok) throw new Error('Failed to mark all as read');
      } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
        set({
          notifications: originalNotifications,
          unreadCount: originalUnreadCount,
        });
      }
    },

    clearStore: () => {
      set({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        error: null,
        lastUpdated: null,
      });
    },

    fetchNotifications: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch('/api/notifications/recent');
        if (!response.ok) throw new Error('Failed to fetch notifications');
        
        const result = await response.json();
        if (result.success) {
          // Use initializeFromServer logic to format and set
          const formattedNotifications: NotificationItem[] = result.data.map((n: any) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            isRead: n.isRead,
            createdAt: n.createdAt,
            data: n.data,
            link: generateLink(n),
          }));
          
          get().setNotifications(formattedNotifications);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        set({ error: 'Failed to fetch notifications' });
      } finally {
        set({ isLoading: false });
      }
    },

    initializeFromServer: (notifications) => {
      if (get().lastUpdated !== null) return;

      const formattedNotifications: NotificationItem[] = notifications.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt,
        data: n.data,
        // Generate link based on type
        link: generateLink(n),
      }));

      get().setNotifications(formattedNotifications);
    },
  }))
);

function generateLink(notification: any): string | undefined {
  if (notification.type === 'ASSIGNMENT_CREATED' || notification.type === 'ASSIGNMENT_UPDATED') {
    return `/student/assignments/${notification.assignmentId}/submit`;
  }
  if (notification.type === 'SUBMISSION_GRADED') {
    return `/student/submissions/${notification.data?.submissionId}`;
  }
  return undefined;
}

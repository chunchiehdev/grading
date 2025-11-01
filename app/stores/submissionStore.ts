import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface TeacherSubmission {
  id: string; // This is the notificationId (for mark-as-read operations)
  submissionId: string; // The actual submission ID
  assignmentId: string;
  assignmentName: string;
  courseId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  status: 'PENDING' | 'GRADING' | 'GRADED';
  grade?: number;
  feedback?: string;
  isRead?: boolean; // Track read/unread state
}

interface SubmissionState {
  // 狀態
  submissions: TeacherSubmission[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  setSubmissions: (submissions: TeacherSubmission[]) => void;
  addSubmission: (submission: TeacherSubmission) => void;
  updateSubmission: (id: string, updates: Partial<TeacherSubmission>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  initializeFromServer: (notifications: any[]) => void;

  // WebSocket integration
  handleNewSubmission: (submissionData: any) => Promise<void>;

  // Utilities
  getPendingSubmissions: () => TeacherSubmission[];
  getRecentSubmissions: (limit?: number) => TeacherSubmission[];
  clearStore: () => void;
}

export const useSubmissionStore = create<SubmissionState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    submissions: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    lastUpdated: null,

    // Set initial submissions (from server)
    setSubmissions: (submissions) => {
      const unreadCount = submissions.filter((s) => !s.isRead).length;
      set({
        submissions: submissions.sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        ),
        unreadCount,
        lastUpdated: new Date(),
        error: null,
      });
    },

    // Add new submission (from WebSocket)
    addSubmission: (submission) => {
      const { submissions } = get();

      // Check if submission already exists
      const exists = submissions.some((s) => s.id === submission.id);
      if (exists) {
        return;
      }

      // Mark new submission as unread
      const newSubmission = { ...submission, isRead: false };

      // Add new submission and sort (newest first)
      const updatedSubmissions = [newSubmission, ...submissions].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );

      // Calculate unread count
      const unreadCount = updatedSubmissions.filter((s) => !s.isRead).length;

      set({
        submissions: updatedSubmissions,
        unreadCount,
        lastUpdated: new Date(),
      });
    },

    // Update existing submission
    updateSubmission: (id, updates) => {
      set((state) => ({
        submissions: state.submissions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        lastUpdated: new Date(),
      }));
    },

    // Mark single submission as read
    markAsRead: async (id) => {
      // Save original state for rollback
      const originalSubmissions = get().submissions;
      const originalUnreadCount = get().unreadCount;

      // Find the submission being marked
      const submission = originalSubmissions.find(s => s.id === id);
      if (!submission) {
        console.error('[SubmissionStore] ❌ Notification not found:', id);
        return;
      }

      // Optimistically update UI first
      set((state) => {
        const updatedSubmissions = state.submissions.map((s) =>
          s.id === id ? { ...s, isRead: true } : s
        );
        const unreadCount = updatedSubmissions.filter((s) => !s.isRead).length;
        return {
          submissions: updatedSubmissions,
          unreadCount,
        };
      });

      // Persist to database
      try {
        const response = await fetch('/api/teacher/notifications/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationIds: [id] }),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
      } catch (error) {
        console.error('[SubmissionStore] ❌ Failed to persist mark-as-read:', error);
        // Revert the optimistic update
        set({
          submissions: originalSubmissions,
          unreadCount: originalUnreadCount,
        });
      }
    },

    // Mark all submissions as read
    markAllAsRead: async () => {
      // Save original state for rollback
      const originalSubmissions = get().submissions;
      const originalUnreadCount = get().unreadCount;

      // Optimistically update UI first
      set((state) => ({
        submissions: state.submissions.map((s) => ({ ...s, isRead: true })),
        unreadCount: 0,
      }));

      // Persist to database
      try {
        const response = await fetch('/api/teacher/notifications/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markAll: true }),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to mark all notifications as read');
        }
      } catch (error) {
        console.error('❌ Failed to persist mark-all-as-read:', error);
        // Revert the optimistic update
        set({
          submissions: originalSubmissions,
          unreadCount: originalUnreadCount,
        });
      }
    },

    // Initialize store from server-provided data (runs only once on initial load)
    initializeFromServer: (notifications) => {
      const currentState = get();

      // Guard: If store is already initialized, skip to prevent overwriting during client-side navigation
      // Exception: If notifications array is empty, this might be initial load, so allow initialization
      if (currentState.lastUpdated !== null) {
        return;
      }

      // Transform raw notification data into TeacherSubmission format
      const transformedSubmissions: TeacherSubmission[] = notifications.map((notif: any) => {
        const data = notif.data as any;
        return {
          id: notif.id, // This is the notificationId (for mark-as-read operations)
          submissionId: data?.submissionId || '', // The actual submission ID
          assignmentId: notif.assignmentId || '',
          assignmentName: notif.assignment?.name || '',
          courseId: notif.courseId || '',
          courseName: notif.course?.name || '',
          studentId: data?.studentId || '',
          studentName: notif.message.split(' ')[0], // Extract student name from message
          submittedAt: data?.submittedAt || notif.createdAt.toISOString(),
          status: 'PENDING' as const,
          isRead: notif.isRead,
        };
      });

      // Sort by submission time (newest first)
      const sortedSubmissions = transformedSubmissions.sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );

      // Calculate unread count
      const unreadCount = sortedSubmissions.filter((s) => !s.isRead).length;

      // Update store
      set({
        submissions: sortedSubmissions,
        unreadCount,
        lastUpdated: new Date(),
        error: null,
        isLoading: false,
      });
    },

    // Fetch notifications from database
    fetchNotifications: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch('/api/teacher/notifications?limit=50', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }

        const result = await response.json();

        if (result.success) {
          get().setSubmissions(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch notifications');
        }
      } catch (error) {
        console.error('[SubmissionStore] ❌ Failed to fetch notifications:', error);
        set({ error: 'Failed to fetch notifications' });
      } finally {
        set({ isLoading: false });
      }
    },

    // Handle new submission from WebSocket
    handleNewSubmission: async (notificationData) => {

      try {
        // Skip if no notificationId (shouldn't happen, but be defensive)
        if (!notificationData.notificationId) {
          console.warn('[SubmissionStore] ⚠️ Received submission notification without notificationId, skipping');
          return;
        }

        // Create submission object from notification data
        const newSubmission: TeacherSubmission = {
          id: notificationData.notificationId, // Use notificationId as primary ID
          submissionId: notificationData.submissionId, // Store actual submission ID
          assignmentId: notificationData.assignmentId,
          assignmentName: notificationData.assignmentName,
          courseId: notificationData.courseId,
          courseName: notificationData.courseName,
          studentId: notificationData.studentId,
          studentName: notificationData.studentName,
          submittedAt: notificationData.submittedAt,
          status: 'PENDING',
          isRead: false,
        };

        // Add to store directly (will mark as unread and increment count)
        get().addSubmission(newSubmission);
      } catch (error) {
        console.error('[SubmissionStore] ❌ Failed to handle new submission:', error);
        set({ error: 'Failed to handle new submission' });
      }
    },

    // Get pending submissions (not graded yet)
    getPendingSubmissions: () => {
      const { submissions } = get();
      return submissions.filter((s) => s.status === 'PENDING' || s.status === 'GRADING');
    },

    // Get recent submissions
    getRecentSubmissions: (limit = 10) => {
      const { submissions } = get();
      return submissions.slice(0, limit);
    },

    // Clear store (for logout, etc.)
    clearStore: () => {
      set({
        submissions: [],
        unreadCount: 0,
        isLoading: false,
        error: null,
        lastUpdated: null,
      });
    },
  }))
);

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface Assignment {
  id: string;
  name: string;
  description: string | null;
  dueDate: Date | null;
  formattedDueDate?: string;
  courseId?: string; // Made optional to match existing data
  course: {
    id: string;
    name: string;
    teacher: {
      id: string;
      email: string;
      name: string;
      picture: string; // Required to match StudentAssignmentInfo
    };
  };
  rubric: {
    id?: string; // Made optional
    name: string;
    description?: string; // Made optional
  };
  submissions: Array<{
    id?: string; // Made optional
    studentId: string;
    status: string;
    finalScore: number | null;
    uploadedAt?: Date; // Made optional
  }>;
  createdAt?: Date; // Made optional
  updatedAt?: Date; // Made optional
}

interface AssignmentState {
  // 狀態
  assignments: Assignment[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  setAssignments: (assignments: Assignment[]) => void;
  addAssignment: (assignment: Assignment) => void;
  updateAssignment: (id: string, updates: Partial<Assignment>) => void;
  removeAssignment: (id: string) => void;

  // WebSocket integration
  handleNewAssignment: (assignmentData: any) => Promise<void>;

  // Utilities
  getPendingAssignments: (studentId: string) => Assignment[];
  getUpcomingDeadlines: (studentId: string) => Assignment[];
  clearStore: () => void;
}

export const useAssignmentStore = create<AssignmentState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    assignments: [],
    isLoading: false,
    error: null,
    lastUpdated: null,

    // Set initial assignments (from server)
    setAssignments: (assignments) => {
      set({
        assignments: assignments.map(a => ({
          ...a,
          formattedDueDate: a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-CA') : undefined,
        })),
        lastUpdated: new Date(),
        error: null,
      });
    },

    // Add new assignment (from WebSocket)
    addAssignment: (assignment) => {
      const { assignments } = get();

      // Check if assignment already exists
      const exists = assignments.some(a => a.id === assignment.id);
      if (exists) return;

      const newAssignment = {
        ...assignment,
        formattedDueDate: assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('en-CA') : undefined,
      };

      // Add new assignment and sort the entire list to maintain proper order
      const updatedAssignments = [...assignments, newAssignment].sort((a, b) => {
        // Sort by creation date (newest first) or by due date if available
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        } else if (a.dueDate) {
          return -1; // Assignments with due dates come first
        } else if (b.dueDate) {
          return 1;
        } else {
          // For assignments without due dates, sort by creation date (newest first)
          const aDate = a.createdAt || a.updatedAt || new Date(0);
          const bDate = b.createdAt || b.updatedAt || new Date(0);
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        }
      });

      set({
        assignments: updatedAssignments,
        lastUpdated: new Date(),
      });
    },

    // Update existing assignment
    updateAssignment: (id, updates) => {
      set((state) => ({
        assignments: state.assignments.map(a =>
          a.id === id ? { ...a, ...updates } : a
        ),
        lastUpdated: new Date(),
      }));
    },

    // Remove assignment
    removeAssignment: (id) => {
      set((state) => ({
        assignments: state.assignments.filter(a => a.id !== id),
        lastUpdated: new Date(),
      }));
    },

    // Handle new assignment from WebSocket
    handleNewAssignment: async (_notificationData) => {
      try {
        // Refetch ALL assignments to maintain data consistency
        // This ensures we get exactly the same data structure as page refresh
        const response = await fetch('/api/student/assignments');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Replace the entire assignments list with fresh data
            // This is simpler and guarantees consistency
            get().setAssignments(result.data);
          }
        }
      } catch (error) {
        console.error('Failed to refresh assignment data:', error);
        set({ error: 'Failed to load new assignment' });
      }
    },

    // Get pending assignments (not submitted by student)
    getPendingAssignments: (studentId) => {
      const { assignments } = get();
      return assignments.filter(assignment =>
        !(assignment.submissions || []).some(sub => sub.studentId === studentId)
      );
    },

    // Get upcoming deadlines (pending + has due date, sorted by date)
    getUpcomingDeadlines: (studentId) => {
      const pendingAssignments = get().getPendingAssignments(studentId);
      return pendingAssignments
        .filter(assignment => assignment.dueDate)
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    },

    // Clear store (for logout, etc.)
    clearStore: () => {
      set({
        assignments: [],
        isLoading: false,
        error: null,
        lastUpdated: null,
      });
    },
  }))
);
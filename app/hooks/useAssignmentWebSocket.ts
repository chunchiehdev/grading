import { useWebSocket, useWebSocketEvent } from '@/lib/websocket';
import { useAssignmentStore } from '@/stores/assignmentStore';
import type { AssignmentNotification } from '@/lib/websocket/types';

/**
 * Custom hook to handle WebSocket assignment updates
 * Can be used in any component that needs real-time assignment updates
 */
export function useAssignmentWebSocket(studentId: string) {
  const handleNewAssignment = useAssignmentStore(state => state.handleNewAssignment);

  // Establish WebSocket connection
  useWebSocket(studentId);

  // Listen for assignment notifications
  useWebSocketEvent<AssignmentNotification>(
    'assignment-notification',
    async (notification) => {
      console.log('📝 New assignment notification received:', notification.assignmentName);
      await handleNewAssignment(notification);
    },
    [studentId, handleNewAssignment]
  );

  return {
    // Could return connection status or other utilities if needed
    isConnected: true, // Could get this from useWebSocket if needed
  };
}
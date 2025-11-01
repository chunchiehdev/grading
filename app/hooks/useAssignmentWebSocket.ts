import { useCallback } from 'react';
import { useWebSocket, useWebSocketEvent } from '@/lib/websocket';
import { useAssignmentStore } from '@/stores/assignmentStore';
import type { AssignmentNotification } from '@/lib/websocket/types';

/**
 * Custom hook to handle WebSocket assignment updates
 * Can be used in any component that needs real-time assignment updates
 */
export function useAssignmentWebSocket(studentId: string) {
  const handleNewAssignment = useAssignmentStore((state) => state.handleNewAssignment);

  // Establish WebSocket connection and get its status
  const { isConnected } = useWebSocket(studentId);

  // Wrap handler in useCallback to maintain stable reference
  // This prevents unnecessary re-execution of useWebSocketEvent's internal useEffect
  const onAssignmentNotification = useCallback(
    async (notification: AssignmentNotification) => {
      await handleNewAssignment(notification);
    },
    [handleNewAssignment]
  );

  // Listen for assignment notifications
  // Note: The third 'deps' parameter exists in the API but is not used internally.
  // useWebSocketEvent uses refs to always call the latest handler version.
  useWebSocketEvent('assignment-notification', onAssignmentNotification);

  return {
    isConnected,
  };
}

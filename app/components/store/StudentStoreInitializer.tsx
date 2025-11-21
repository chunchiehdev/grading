import { useEffect, useRef } from 'react';
import { useNotificationStore } from '@/stores/notificationStore';

interface StoreInitializerProps {
  notifications?: any[];
}

export function StudentStoreInitializer({ notifications }: StoreInitializerProps) {
  const initializeFromServer = useNotificationStore((state) => state.initializeFromServer);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (!notifications) return;

    hasInitializedRef.current = true;
    initializeFromServer(notifications);
  }, [notifications, initializeFromServer]);

  return null;
}

import { useEffect, useRef } from 'react';
import { useSubmissionStore } from '@/stores/submissionStore';

interface StoreInitializerProps {
  unreadNotifications?: any[];
}

/**
 * StoreInitializer - Client-only component that bridges server loader data to Zustand store
 *
 * This component doesn't render anything. Its sole purpose is to initialize the client-side
 * Zustand store with server-provided notification data on initial page load.
 *
 * Key behaviors:
 * - Runs only once per app lifetime (using useRef guard)
 * - Only initializes if notifications data is provided
 * - Delegates to store's initializeFromServer action which has its own guards
 */
export function StoreInitializer({ unreadNotifications }: StoreInitializerProps) {
  const initializeFromServer = useSubmissionStore((state) => state.initializeFromServer);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // Guard: Only run once per app lifetime
    if (hasInitializedRef.current) {
      console.log('[StoreInitializer] ⏭️ Already initialized, skipping');
      return;
    }

    // Guard: Only initialize if we have notifications array (even if empty)
    if (!unreadNotifications) {
      console.log('[StoreInitializer] ⚠️ No notification data provided');
      return;
    }

    console.log('[StoreInitializer] 🚀 Initializing store with server data:', {
      notificationCount: unreadNotifications.length,
      hasData: unreadNotifications.length > 0,
    });

    // Mark as initialized BEFORE calling the store action
    hasInitializedRef.current = true;

    // Initialize the store with server data (even if empty array)
    initializeFromServer(unreadNotifications);
  }, [unreadNotifications, initializeFromServer]);

  // This component doesn't render anything
  return null;
}

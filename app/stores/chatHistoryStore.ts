/**
 * Chat History Sidebar State Store
 * 
 * Global state for managing the mobile chat history sidebar visibility
 * This allows the NavHeader to trigger opening the sidebar from anywhere
 */

import { create } from 'zustand';

interface ChatHistoryState {
  isMobileHistoryOpen: boolean;
  setMobileHistoryOpen: (open: boolean) => void;
  toggleMobileHistory: () => void;
}

export const useChatHistoryStore = create<ChatHistoryState>((set) => ({
  isMobileHistoryOpen: false,
  setMobileHistoryOpen: (open) => set({ isMobileHistoryOpen: open }),
  toggleMobileHistory: () => set((state) => ({ isMobileHistoryOpen: !state.isMobileHistoryOpen })),
}));

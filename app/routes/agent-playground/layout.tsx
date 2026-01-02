/**
 * Agent Playground Layout
 *
 * Implements Gemini-style layout:
 * - Full-height sidebar on the left (spans entire viewport height)
 * - Right section contains NavHeader + Chat content
 * 
 * Sidebar behavior:
 * - Expanded: w-72 with full content
 * - Collapsed: w-16 with hamburger icon only
 * 
 * This layout renders its own NavHeader, so root.tsx skips it for /agent-playground routes.
 */

import { useState, useCallback } from 'react';
import { Outlet, useParams, useNavigate, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatHistorySidebar } from '@/components/agent/ChatHistorySidebar';
import { useChatHistoryStore } from '@/stores/chatHistoryStore';
import { NavHeader } from '@/components/navbar/NavHeader';

// =============================================================================
// Loader - Provides user data for NavHeader
// =============================================================================
export async function loader({ request }: LoaderFunctionArgs) {
  const { getUser } = await import('@/services/auth.server');
  const user = await getUser(request);
  
  // Redirect to login if not authenticated
  if (!user) {
    const { redirect } = await import('react-router');
    return redirect('/auth/login');
  }
  
  // Get version info for NavHeader
  let versionInfo = null;
  try {
    const { getVersionInfo } = await import('@/services/version.server');
    versionInfo = await getVersionInfo();
  } catch (error) {
    console.error('Failed to get version info:', error);
  }
  
  return { user, versionInfo };
}

// =============================================================================
// Layout Component
// =============================================================================
export default function AgentPlaygroundLayout() {
  const [showHistory, setShowHistory] = useState(true);
  
  // Global store for mobile sidebar (controlled from NavHeader dropdown)
  const { isMobileHistoryOpen, setMobileHistoryOpen } = useChatHistoryStore();
  
  const params = useParams();
  const sessionId = params.sessionId || null;
  const navigate = useNavigate();

  // Navigation handlers
  const handleSelectSession = useCallback((id: string) => {
    navigate(`/agent-playground/${id}`);
    setMobileHistoryOpen(false);
  }, [navigate, setMobileHistoryOpen]);

  const handleNewChat = useCallback(() => {
    navigate('/agent-playground');
    setMobileHistoryOpen(false);
  }, [navigate, setMobileHistoryOpen]);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      {/* =================================================================
          LEFT: Sidebar (Full-height, spans from top to bottom)
          Desktop: 
            - Expanded: w-72 with full content
            - Collapsed: w-16 with hamburger icon only
          Mobile: Hidden, accessible via Sheet from NavHeader
          ================================================================= */}
      <aside
        className={cn(
          "hidden md:flex flex-col flex-shrink-0 h-full",
          "border-r bg-muted/30",
          "transition-all duration-300 ease-in-out",
          showHistory ? "w-72" : "w-16"
        )}
      >
        {/* Collapsed state: Show only hamburger and new chat icons */}
        {!showHistory && (
          <div className="flex flex-col items-center gap-2 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(true)}
              aria-label="Open sidebar"
              className="h-10 w-10"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              onClick={handleNewChat}
              aria-label="New chat"
              className="h-10 w-10 bg-[#D2691E] hover:bg-[#C25A10] text-white dark:bg-[#E87D3E] dark:hover:bg-[#D2691E] border-0"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Expanded state: Full sidebar with header */}
        {showHistory && (
          <div className="w-72 h-full flex flex-col overflow-hidden">
            {/* Sidebar Header with hamburger to collapse */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHistory(false)}
                aria-label="Close sidebar"
                className="h-9 w-9"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                onClick={handleNewChat}
                aria-label="New chat"
                className="h-9 w-9 bg-[#D2691E] hover:bg-[#C25A10] text-white dark:bg-[#E87D3E] dark:hover:bg-[#D2691E] border-0"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto">
              <ChatHistorySidebar 
                currentSessionId={sessionId}
                onSelectSession={handleSelectSession}
                onNewChat={handleNewChat}
                hideHeader
              />
            </div>
          </div>
        )}
      </aside>

      {/* Mobile: Sheet for sidebar (triggered from NavHeader) */}
      <Sheet open={isMobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
        <SheetContent side="left" className="p-0 w-72" hideCloseButton>
          <ChatHistorySidebar 
            currentSessionId={sessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
          />
        </SheetContent>
      </Sheet>

      {/* =================================================================
          RIGHT: NavHeader + Main Content (vertical flex column)
          ================================================================= */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* NavHeader - scoped to right section only */}
        <NavHeader className="flex-shrink-0 bg-background" />

        {/* Main Chat Area */}
        <main className="flex-1 min-h-0 relative overflow-hidden">
          {/* Child Route Content (AgentChatContent) */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}




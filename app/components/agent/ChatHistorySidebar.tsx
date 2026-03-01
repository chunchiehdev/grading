import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Plus, Edit2, MoreVertical, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  lastActivity: string;
  messageCount: number;
}

interface ChatHistorySidebarProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  className?: string;
  hideHeader?: boolean; // Hide the "新對話" button header when parent controls it
}

export function ChatHistorySidebar({ 
  currentSessionId, 
  onSelectSession, 
  onNewChat,
  className,
  hideHeader = false,
}: ChatHistorySidebarProps) {
  const { t } = useTranslation('agent');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Fetch sessions
  useEffect(() => {
    fetchSessions();
  }, [currentSessionId]); // Refresh when session changes (e.g. new session created)

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chat-sessions/list?limit=50');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions', error);
      toast.error(t('error.loadListFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTitle = async (sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      setEditingId(null);
      return;
    }
    
    try {
      const res = await fetch(`/api/chat-sessions/${sessionId}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      
      if (res.ok) {
        setSessions(sessions.map(s => 
          s.id === sessionId ? { ...s, title: newTitle } : s
        ));
        toast.success('已更新標題');
      } else {
        toast.error(t('error.updateFailed'));
      }
    } catch (error) {
      console.error('Failed to update title', error);
      toast.error(t('error.updateFailed'));
    } finally {
      setEditingId(null);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    
    try {
      const res = await fetch(`/api/chat-sessions/${sessionToDelete}/delete`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setSessions(sessions.filter(s => s.id !== sessionToDelete));
        toast.success('已刪除對話');
        
        // If deleted the current session, navigate to new chat
        if (currentSessionId === sessionToDelete) {
          onNewChat();
        }
      } else {
        const data = await res.json();
        toast.error(data.error || t('error.deleteFailed'));
      }
    } catch (error) {
      console.error('Failed to delete session', error);
      toast.error(t('error.deleteFailed'));
    } finally {
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-muted/10", className)}>
      {!hideHeader && (
        <div className="p-4">
          <Button 
            onClick={onNewChat} 
            className="w-full justify-center gap-2 bg-[#D2691E] hover:bg-[#C25A10] text-white dark:bg-[#E87D3E] dark:hover:bg-[#D2691E] border-0" 
          >
            <Plus className="h-4 w-4" />
            新對話
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center p-4 text-sm text-muted-foreground">
              尚無對話紀錄
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors",
                  currentSessionId === session.id && "bg-accent"
                )}
                onClick={() => onSelectSession(session.id)}
              >
                {editingId === session.id ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => handleUpdateTitle(session.id, editTitle)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateTitle(session.id, editTitle);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    className="h-7 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium truncate">
                      {session.title || '未命名對話'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true, locale: zhTW })}
                    </div>
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(session.id);
                      setEditTitle(session.title || '');
                    }}>
                      <Edit2 className="h-3 w-3 mr-2" />
                      重新命名
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete(session.id);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      刪除對話
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除此對話？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法復原。刪除後將無法查看此對話的歷史記錄。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSessionToDelete(null)}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

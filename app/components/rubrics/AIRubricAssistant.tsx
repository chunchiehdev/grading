import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, MoveUp, CheckCircle, Loader2, Plus, User as UserIcon } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useLoaderData } from 'react-router';
import type { User } from '@/root';

interface LoaderData {
  user: User | null;
  [key: string]: any;
}
import { Markdown } from '@/components/ui/markdown';

interface Level {
  score: number;
  description: string;
}

interface UICriterion {
  id: string;
  name: string;
  description: string;
  levels: Level[];
}

interface UICategory {
  id: string;
  name: string;
  criteria: UICriterion[];
}

interface GeneratedRubric {
  name: string;
  description: string;
  categories: UICategory[];
}

interface MessageItemProps {
  msg: {
    id: string;
    role: 'USER' | 'AI';
    content: string;
    parsedContent?: {
      rubricData: GeneratedRubric | null;
      displayText: string;
    };
  };
  index: number;
  user: any;
  onApplyRubric: (rubric: GeneratedRubric) => void;
}

const MessageItem = memo(({ msg, index, user, onApplyRubric }: MessageItemProps) => {
  const isUser = msg.role === 'USER';
  const rubricData = isUser ? null : msg.parsedContent?.rubricData;
  const displayText = isUser ? msg.content : msg.parsedContent?.displayText || msg.content;

  return (
    <div key={msg.id} className="flex gap-4" role="group" aria-label={`${isUser ? '用戶' : 'AI'}訊息 ${index + 1}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isUser ? (
          user?.picture ? (
            <img src={user.picture} alt={user.email || 'User'} className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-primary-foreground" />
            </div>
          )
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {isUser ? (
          /* User Message Bubble */
          <div
            className="inline-block max-w-[80%] rounded-2xl px-4 py-3 bg-muted text-foreground"
            role="article"
            aria-label="您的訊息"
          >
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
          </div>
        ) : (
          /* AI Message - Direct text with Markdown */
          <div className="text-foreground" role="article" aria-label="AI的回應">
            <Markdown className="max-w-none">{displayText}</Markdown>
          </div>
        )}

        {/* Rubric Preview Card */}
        {rubricData && (
          <div
            className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-4 max-w-md"
            role="region"
            aria-label="生成的評分標準預覽"
          >
            <div className="flex items-center gap-2 text-primary mb-3">
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium text-sm">評分標準已生成</span>
            </div>

            <div className="mb-3">
              <div className="font-medium text-sm text-foreground">{rubricData.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {rubricData.categories.length} 個類別 •{' '}
                {rubricData.categories.reduce((acc, cat) => acc + cat.criteria.length, 0)} 個評分標準
              </div>
            </div>

            <Button
              size="sm"
              className="w-full rounded-lg"
              onClick={() => onApplyRubric(rubricData)}
              aria-describedby={`rubric-${msg.id}`}
            >
              <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
              套用此評分標準
            </Button>
            <div id={`rubric-${msg.id}`} className="sr-only">
              套用 {rubricData.name} 評分標準到您的作業
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

interface AIRubricAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyRubric: (rubric: GeneratedRubric) => void;
  currentRubric?: {
    name: string;
    description: string;
    categories: UICategory[];
  };
}

export const AIRubricAssistant = ({ isOpen, onClose, onApplyRubric, currentRubric }: AIRubricAssistantProps) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loaderData = useLoaderData() as LoaderData | undefined;
  const user = loaderData?.user || null;

  const { currentChat, isLoading, isConnected, error, connect, disconnect, createChat, openChat, sendMsg, clearError } =
    useChatStore();

  // Initialize chat when dialog opens
  useEffect(() => {
    const userId = user?.id;
    console.log('userId', userId);

    if (isOpen && userId) {
      // 防止重複連接：只在用戶改變或未連接時才連接
      if (userId !== currentUserId.current) {
        console.log('[DEBUG] User changed, connecting to socket for user:', userId);
        connect(userId);
        currentUserId.current = userId;
      } else if (!isConnected && currentUserId.current === userId) {
        console.log('[DEBUG] Reconnecting to existing user:', userId);
        connect(userId);
      }

      // 只在沒有當前聊天且不在載入狀態時才創建新聊天
      if (!currentChat && !isLoading && isConnected) {
        console.log('[DEBUG] Creating new chat...');
        const initChat = async () => {
          try {
            const chatId = await createChat('評分標準生成', {
              type: 'rubric_generation',
              currentRubric,
            });
            if (chatId) {
              await openChat(chatId);
            }
          } catch (error) {
            console.error('[DEBUG] Failed to create/open chat:', error);
          }
        };
        initChat();
      }
    } else if (!isOpen && currentUserId.current) {
      // 只在對話框關閉時斷開連接
      console.log('[DEBUG] Dialog closed, disconnecting...');
      disconnect();
      currentUserId.current = null;
    }
  }, [isOpen, user?.id]);

  // 獨立的 useEffect 處理連接狀態變化 - 減少依賴項
  useEffect(() => {
    const userId = user?.id;

    // 只在真正需要時才重新連接，減少不必要的檢查
    if (isOpen && userId && userId === currentUserId.current && !isConnected && !isLoading) {
      console.log('[DEBUG] Connection lost, attempting reconnect for user:', userId);
      const timeoutId = setTimeout(() => {
        connect(userId);
      }, 100); // 延遲 100ms 避免過於頻繁的重連嘗試

      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, isOpen]); // 移除不必要的依賴

  // 用 useRef 追蹤當前用戶ID，避免重複連接
  const currentUserId = useRef<string | null>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.msgs]);

  // Auto-resize textarea - 使用 useCallback 和節流來優化性能
  const handleTextareaResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // 使用 requestAnimationFrame 來避免阻塞輸入
      requestAnimationFrame(() => {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 144); // max 6 lines (24px * 6)
        textarea.style.height = `${newHeight}px`;
      });
    }
  }, []);

  // 使用 useEffect 但頻率較低
  useEffect(() => {
    handleTextareaResize();
  }, [input, handleTextareaResize]);

  // Clear error when dialog opens - 移除 clearError 依賴避免不必要的重新渲染
  useEffect(() => {
    if (isOpen && error) {
      clearError();
    }
  }, [isOpen, error]); // 移除 clearError 依賴

  const sendMessage = () => {
    if (!input.trim() || isLoading || !isConnected || !currentChat) {
      console.log('[DEBUG] Cannot send message:', {
        hasInput: !!input.trim(),
        isLoading,
        isConnected,
        hasCurrentChat: !!currentChat,
      });
      return;
    }

    console.log('[DEBUG] Sending message:', input.trim());
    sendMsg(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleApplyRubric = useCallback(
    (rubric: GeneratedRubric) => {
      onApplyRubric(rubric);
      onClose();
    },
    [onApplyRubric, onClose]
  );

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="fixed inset-0 max-w-none h-screen p-0 flex flex-col bg-background border-0 translate-x-0 translate-y-0 left-0 top-0 sm:rounded-none"
        aria-describedby="ai-rubric-description"
      >
        <DialogTitle className="sr-only">AI 評分標準助手</DialogTitle>

        {/* Hidden description for screen readers */}
        <div id="ai-rubric-description" className="sr-only">
          AI 評分標準助手對話界面，可以幫助您生成專業的評分標準
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto pt-6 bg-background" role="log" aria-label="對話記錄" aria-live="polite">
          <div className="max-w-4xl mx-auto px-6">
            {/* Connection Status */}
            {!isConnected && (
              <div
                className="flex items-center justify-center p-4 rounded-lg bg-muted border border-border mb-6"
                role="status"
                aria-label="連接狀態"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  連接中...
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div
                className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 mb-6"
                role="alert"
                aria-label="錯誤訊息"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearError}
                    className="border-destructive/20 text-destructive hover:bg-destructive/10"
                  >
                    重試
                  </Button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="space-y-8" role="group" aria-label="對話訊息">
              {currentChat?.msgs.map((msg, index) => (
                <MessageItem key={msg.id} msg={msg} index={index} user={user} onApplyRubric={handleApplyRubric} />
              ))}

              {/* Loading Message */}
              {isLoading && (
                <div className="flex gap-4" role="status" aria-label="AI 正在處理中">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      AI 正在生成評分標準...
                    </div>
                  </div>
                </div>
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Sticky Input Area */}
        <div className="sticky bottom-0 bg-background border-t border-border p-6">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="relative flex items-end gap-3 bg-muted/50 rounded-2xl p-3 border border-border shadow-lg"
            >
              {/* Attachment Button */}
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0" aria-label="添加附件">
                <Plus className="h-4 w-4" />
              </Button>

              {/* Message Input */}
              <div className="flex-1">
                <label htmlFor="message-input" className="sr-only">
                  輸入您的訊息
                </label>
                <Textarea
                  id="message-input"
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    // handleTextareaResize();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="描述您需要的評分標準..."
                  className="min-h-[44px] max-h-36 bg-transparent border-0 resize-none text-foreground placeholder-muted-foreground focus:outline-none focus:ring-0 px-2 py-2"
                  disabled={isLoading}
                  aria-describedby="input-help"
                />
                <div id="input-help" className="sr-only">
                  按 Enter 發送訊息，Shift+Enter 換行
                </div>
              </div>

              {/* Send Button */}
              <Button
                type="submit"
                disabled={!input.trim() || isLoading || !isConnected || !currentChat}
                className="h-8 w-8 rounded-lg p-0"
                aria-label="發送訊息"
              >
                <MoveUp className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

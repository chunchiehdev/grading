/**
 * Enhanced Agent ChatBox Component with Step Visualization
 *
 * Shows detailed step-by-step execution of the AI agent
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import {
  Send,
  User,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ExternalLink,
  Link2,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';
import { useLoaderData, useNavigate, useParams } from 'react-router';
import type { User as UserType } from '@/root';
import { useTranslation } from 'react-i18next';
import { ChatHistorySidebar } from './ChatHistorySidebar';
import { toast } from 'sonner';

/**
 * Extract text content from UIMessage parts
 * Compatible with both streaming (parts) and loaded history (content)
 */
function getMessageContent(msg: UIMessage): string {
  // If parts exist, extract from parts (streaming or converted history)
  if (msg.parts && msg.parts.length > 0) {
    return msg.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as any).text)
      .join('');
  }
  
  // Fallback to content field if no parts (shouldn't happen with new API format)
  if ((msg as any).content && typeof (msg as any).content === 'string') {
    return (msg as any).content;
  }
  
  return '';
}

/**
 * Group message parts by steps
 */
interface Step {
  stepNumber: number;
  textParts: any[];
  toolInvocations: any[];
  sources: any[]; // Sources from google_search
}

function groupPartsBySteps(parts: any[]): Step[] {
  const steps: Step[] = [];
  let currentStep: Step = { stepNumber: 0, textParts: [], toolInvocations: [], sources: [] };

  for (const part of parts) {
    if (part.type === 'step-start') {
      // Save previous step if it has content
      if (currentStep.textParts.length > 0 || currentStep.toolInvocations.length > 0 || currentStep.sources.length > 0) {
        steps.push(currentStep);
      }
      // Start new step
      currentStep = {
        stepNumber: steps.length,
        textParts: [],
        toolInvocations: [],
        sources: [],
      };
    } else if (part.type === 'text') {
      currentStep.textParts.push(part);
    } else if (part.type?.includes('tool') || part.type === 'dynamic-tool') {
      currentStep.toolInvocations.push(part);
    } else if (part.type === 'source-url') {
      // Capture sources from google_search
      currentStep.sources.push(part);
    }
  }

  // Add the last step
  if (currentStep.textParts.length > 0 || currentStep.toolInvocations.length > 0 || currentStep.sources.length > 0) {
    steps.push(currentStep);
  }

  // If no step-start markers, treat all content as single step
  if (steps.length === 0 && parts.length > 0) {
    const textParts = parts.filter((p) => p.type === 'text');
    const toolInvocations = parts.filter((p) => p.type?.includes('tool') || p.type === 'dynamic-tool');
    const sources = parts.filter((p) => p.type === 'source-url');
    if (textParts.length > 0 || toolInvocations.length > 0 || sources.length > 0) {
      steps.push({ stepNumber: 0, textParts, toolInvocations, sources });
    }
  }
  return steps;
}

export function AgentChatBoxWithSteps() {
  const [input, setInput] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [tokenLimitExceeded, setTokenLimitExceeded] = useState(false);
  const [tokenLimitWarning, setTokenLimitWarning] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasLoadedSessionRef = useRef<string | null>(null);

  // Get session ID from URL (if exists)
  const params = useParams();
  const sessionId = params.sessionId || null;
  const navigate = useNavigate();

  // Get user data from loader
  const { user } = useLoaderData() as { user: UserType | null };

  // Translation
  const { t } = useTranslation('agent');

  // ✅ 使用文檔推薦的動態配置：body 為函數，無依賴項
  // 這樣 transport 就不會因為 sessionId 改變而重新創建
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/agent-chat',
    
    // ✅ 使用函數動態讀取 sessionId，避免閉包依賴
    body: () => {
      const currentSessionId = params.sessionId || null;
      return {
        sessionId: currentSessionId,
      };
    },
    
    // ✅ 自定義 prepareSendMessagesRequest 來提取訊息內容
    prepareSendMessagesRequest: ({ messages }) => {
      const lastMessage = messages[messages.length - 1];
      const newMessage = getMessageContent(lastMessage);
      
      if (!newMessage) {
        throw new Error('Message content is empty');
      }
      
      const currentSessionId = params.sessionId || null;
      
      return {
        body: {
          sessionId: currentSessionId,
          message: newMessage,
        },
      };
    },
    
    // ✅ 自定義 fetch：立即更新 URL，並讀取 token limit headers
    fetch: async (input, init) => {
      const response = await fetch(input, init);
      
      // 讀取 token limit headers
      const tokenLimitExceeded = response.headers.get('X-Token-Limit-Exceeded') === 'true';
      const tokenLimitWarning = response.headers.get('X-Token-Limit-Warning') === 'true';
      
      if (tokenLimitExceeded) {
        setTokenLimitExceeded(true);
      } else if (tokenLimitWarning) {
        setTokenLimitWarning(true);
      }
      
      // 只在新對話時處理（sessionId 為 null）
      const currentSessionId = params.sessionId || null;
      if (!currentSessionId) {
        const newSessionId = response.headers.get('X-Chat-Session-Id');
        if (newSessionId) {
          window.history.replaceState(window.history.state, '', `/agent-playground/${newSessionId}`);
          hasLoadedSessionRef.current = newSessionId;
        }
      }
      
      return response;
    },
  }), [params]); // ✅ 不需要 navigate 依賴

  // Use Vercel AI SDK's useChat hook
  const { messages, status, sendMessage, error, setMessages } = useChat({
    transport,
    onError: (error) => {
      console.error('Agent chat error:', error);
      toast.error(t('error.sendFailed', '發送訊息失敗，請稍後再試'));
    },
    // ✅ 不需要 onFinish 導航，URL 已經在 fetch 中更新
  });

  // Load session history when sessionId changes
  useEffect(() => {
    if (sessionId) {
      // ✅ 如果已經載入過這個 session，跳過 (避免覆蓋 Stream)
      if (hasLoadedSessionRef.current === sessionId) {
        console.log('[AgentChat] Skipping history load - already loaded:', sessionId);
        return;
      }
      
      hasLoadedSessionRef.current = sessionId;
      setIsLoadingHistory(true);
      
      fetch(`/api/chat-sessions/${sessionId}`)
        .then(async (res) => {
          if (!res.ok) {
            hasLoadedSessionRef.current = null; // 允許重試
            if (res.status === 404) {
              toast.error('對話不存在');
              navigate('/agent-playground', { replace: true });
            } else if (res.status === 403) {
              toast.error('您沒有權限訪問此對話');
              navigate('/agent-playground', { replace: true });
            } else {
              throw new Error('Failed to load session');
            }
            return;
          }
          const data = await res.json();
          setMessages(data.messages);
          setShowWelcome(false);
          
          // Check token limits from session data
          const totalTokens = data.session?.totalTokens || 0;
          const TOKEN_LIMIT_THRESHOLD = 25000;
          
          if (totalTokens >= TOKEN_LIMIT_THRESHOLD) {
            setTokenLimitExceeded(true);
          } else if (totalTokens >= TOKEN_LIMIT_THRESHOLD * 0.8) {
            setTokenLimitWarning(true);
          } else {
            // Reset if under threshold (e.g., when switching sessions)
            setTokenLimitExceeded(false);
            setTokenLimitWarning(false);
          }
        })
        .catch((e) => {
          hasLoadedSessionRef.current = null; // 允許重試
          console.error('Failed to load session', e);
          toast.error('載入對話失敗');
        })
        .finally(() => {
          setIsLoadingHistory(false);
        });
    } else {
      // New chat - reset messages
      console.log('[AgentChat] New chat - resetting state');
      hasLoadedSessionRef.current = null;
      setMessages([]);
      setShowWelcome(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, navigate]); // ✅ 只依賴穩定的值，移除 setMessages 和 t

  // Navigate to session
  const handleSelectSession = useCallback((id: string) => {
    navigate(`/agent-playground/${id}`);
    setIsMobileHistoryOpen(false);
  }, [navigate]);

  // Create new chat
  const handleNewChat = useCallback(() => {
    navigate('/agent-playground');
    setInput('');
    setIsMobileHistoryOpen(false);
    // Reset token limit states
    setTokenLimitExceeded(false);
    setTokenLimitWarning(false);
  }, [navigate]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || status === 'submitted' || status === 'streaming') return;

      // Send message using AI SDK
      sendMessage({ text: input.trim() });
      setInput('');
      setShowWelcome(false);
    },
    [input, status, sendMessage]
  );

  const handleExampleClick = useCallback((text: string) => {
    setInput(text);
    setShowWelcome(false);
    inputRef.current?.focus();
  }, []);

  const isLoading = status === 'submitted' || status === 'streaming';
  const isInputDisabled = isLoading || tokenLimitExceeded;

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:block border-r transition-all duration-300 ease-in-out overflow-hidden bg-background",
        showHistory ? "w-72" : "w-0"
      )}>
        <div className="w-72 h-full">
          <ChatHistorySidebar 
            currentSessionId={sessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative min-w-0 h-full">
        {/* History Toggle Buttons (Absolute) */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          {/* Mobile Trigger */}
          <Sheet open={isMobileHistoryOpen} onOpenChange={setIsMobileHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden h-8 w-8 bg-background/80 backdrop-blur shadow-sm">
                <History className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <ChatHistorySidebar 
                currentSessionId={sessionId}
                onSelectSession={handleSelectSession}
                onNewChat={handleNewChat}
              />
            </SheetContent>
          </Sheet>

          {/* Desktop Toggle */}
          <Button 
            variant="outline" 
            size="icon" 
            className={cn(
              "hidden md:flex h-8 w-8 bg-background/80 backdrop-blur shadow-sm transition-opacity",
              showHistory && "opacity-50 hover:opacity-100"
            )}
            onClick={() => setShowHistory(!showHistory)}
            title={showHistory ? t('history.hide', '隱藏歷史紀錄') : t('history.show', '顯示歷史紀錄')}
          >
            <History className="h-4 w-4" />
          </Button>
        </div>

        {/* Loading History Indicator */}
        {isLoadingHistory && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-20">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t('status.loadingHistory', '載入歷史訊息...')}</span>
            </div>
          </div>
        )}

        {/* Messages Area - scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div
            className="mx-auto max-w-4xl px-[var(--content-margin)] pt-2 sm:pt-4"
            style={{
              paddingBottom: 'calc(9rem + env(safe-area-inset-bottom, 0.5rem))'
            }}
          >
            {showWelcome && messages.length === 0 && (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="max-w-2xl w-full space-y-6 text-center">
                  {/* Welcome Header */}
                  <div className="space-y-3">
                    
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
                      {t('welcome.title', { name: user?.name || user?.email?.split('@')[0] || 'there' })}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {t('welcome.subtitle')}
                    </p>
                  </div>

                  {/* Example Prompts */}
                  <div className="space-y-3">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t('welcome.tryAsking')}</p>
                    <div className="grid gap-2">
                      <ExamplePrompt text={t('examples.pendingAssignments')} onClick={handleExampleClick} />
                      <ExamplePrompt text={t('examples.upcomingDeadlines')} onClick={handleExampleClick} />
                      <ExamplePrompt text={t('examples.courses')} onClick={handleExampleClick} />
                      <ExamplePrompt text={t('examples.recentGrades')} onClick={handleExampleClick} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubbleWithSteps key={message.id} message={message} user={user} />
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{t('status.thinking')}</span>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                  <p className="text-sm text-destructive">{t('error.prefix')} {error.message}</p>
                </div>
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Fixed Input Area - stays at bottom */}
        <div
          className="flex-shrink-0 bg-background border-border/40"
          style={{
            paddingTop: '0.5rem',
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'
          }}
        >
          <div className="mx-auto max-w-4xl px-[var(--content-margin)] pb-2 sm:pb-3 pt-2 sm:pt-4">
            {/* Token Limit Warning Banner */}
            {(tokenLimitExceeded || tokenLimitWarning) && (
              <div
                className={cn(
                  "flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 sm:p-4 rounded-xl mb-3 border",
                  tokenLimitExceeded 
                    ? "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800"
                    : "bg-amber-50/50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900"
                )}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className={cn(
                    "h-5 w-5 shrink-0",
                    tokenLimitExceeded 
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-amber-500 dark:text-amber-500"
                  )} />
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm font-medium",
                      tokenLimitExceeded 
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-amber-600 dark:text-amber-400"
                    )}>
                      {tokenLimitExceeded 
                        ? t('tokenLimit.exceeded.title', '對話已達上限')
                        : t('tokenLimit.warning.title', '對話即將達上限')
                      }
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      {tokenLimitExceeded 
                        ? t('tokenLimit.exceeded.description', '為確保回應品質，請開啟新對話繼續。')
                        : t('tokenLimit.warning.description', '建議開啟新對話以維持最佳回應速度。')
                      }
                    </p>
                  </div>
                </div>
                {tokenLimitExceeded && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleNewChat}
                    className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 w-full sm:w-auto"
                  >
                    {t('tokenLimit.newChat', '開啟新對話')}
                  </Button>
                )}
              </div>
            )}
            <form
              onSubmit={handleSubmit}
              className={cn(
                "flex gap-2 bg-muted/30 dark:bg-card rounded-full p-1 transition-all duration-200 border border-border/40",
                "focus-within:ring-2 focus-within:ring-black dark:focus-within:ring-white focus-within:border-transparent"
              )}
            >
              <div className="flex-1 relative min-w-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={tokenLimitExceeded 
                    ? t('tokenLimit.inputDisabled', '請開啟新對話繼續')
                    : t('input.placeholder')
                  }
                  className={cn(
                    "w-full rounded-full border-0 bg-transparent px-3 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 tap-highlight-transparent",
                    tokenLimitExceeded && "placeholder:text-amber-500 dark:placeholder:text-amber-400"
                  )}
                  disabled={isInputDisabled}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  style={{
                    fontSize: '16px' // Prevent iOS zoom on focus
                  }}
                />
              </div>
              <Button
                type="submit"
                disabled={isInputDisabled || !input.trim()}
                size="icon"
                className={cn(
                  "h-10 w-10 sm:h-11 sm:w-11 rounded-full shrink-0",
                  tokenLimitExceeded && "opacity-50"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Enhanced Message Bubble with Thinking Process Timeline
 */
function MessageBubbleWithSteps({ message, user }: { message: UIMessage; user: UserType | null }) {
  const isUser = message.role === 'user';
  const messageContent = getMessageContent(message);
  

  // Group parts by steps
  const steps = useMemo(() => {
    if (isUser) return [];
    return groupPartsBySteps(message.parts || []);
  }, [message.parts, isUser]);

  // For user messages, show simple text with avatar
  if (isUser) {
    return (
      <div className="flex gap-2 sm:gap-3 justify-end items-start">
        <div className="text-sm whitespace-pre-wrap break-words px-3 sm:px-4 py-2 rounded-2xl bg-muted dark:bg-muted/60">
          {messageContent}
        </div>
        <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-muted overflow-hidden">
          {user?.picture ? (
            <img src={user.picture} alt={user.email} className="w-full h-full object-cover" />
          ) : (
            <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
          )}
        </div>
      </div>
    );
  }

  const { t } = useTranslation('agent');

  // Separate thinking process (tools) from final response
  const hasAnyTools = steps.some(s => s.toolInvocations.length > 0);
  const finalResponseStep = steps[steps.length - 1]; // Last step is usually the final response
  
  // Check if still streaming/thinking (any tool not completed)
  const isThinking = steps.some(s => 
    s.toolInvocations.some((tool: any) => {
      const state = tool.state || 'unknown';
      return state === 'input-streaming' || state === 'input-available' || state === 'unknown';
    })
  );

  return (
    <div className="w-full space-y-4">
      {/* Thinking Process Timeline - Collapsible */}
      {hasAnyTools && (
        <Collapsible 
          open={isThinking ? true : undefined}
          defaultOpen={isThinking}
          className="animate-in fade-in duration-500 group"
        >
          <div className="flex items-center py-1">
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 p-0 h-auto hover:bg-transparent text-xs font-medium text-muted-foreground"
              >
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                <span>{isThinking ? t('status.thinking', 'AI 思考中...') : t('status.viewThinkingProcess', '查看思考過程')}</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent>
            <div className="pb-2 pt-1">
              <div className="relative pl-6">
                {/* Vertical Line */}
                <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                
                {/* Tool Invocations */}
                <div className="space-y-2">
                  {steps.flatMap(step => 
                    step.toolInvocations.map((tool: any, idx: number) => (
                      <ThinkingAction key={`${step.stepNumber}-${idx}`} tool={tool} />
                    ))
                  )}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Final Response - Outside timeline */}
      {finalResponseStep && finalResponseStep.textParts.length > 0 && (
        <div className="text-sm text-foreground leading-relaxed">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown>{finalResponseStep.textParts.map((part) => part.text || '').join('')}</Markdown>
          </div>
        </div>
      )}

      {/* Sources if any */}
      {finalResponseStep?.sources.length > 0 && (
        <SourcesList sources={finalResponseStep.sources} />
      )}
    </div>
  );
}

/**
 * Thinking Action Component - Simplified tool invocation status display
 */
function ThinkingAction({ tool }: { tool: any }) {
  const { t } = useTranslation('agent');
  
  const toolName = tool.toolName || extractToolName(tool.type);
  const state = tool.state || 'unknown';
  const errorText = tool.errorText;

  // Tool descriptions - user-friendly narrations
  const toolNarrations: Record<string, string> = {
    database_query: t('toolNarration.databaseQuery', '正在查詢資料...'),
    generate_report: t('toolNarration.generateReport', '正在生成報告...'),
    calculator: t('toolNarration.calculator', '正在計算...'),
    code_explainer: t('toolNarration.codeExplainer', '正在分析程式碼...'),
    web_search: t('toolNarration.webSearch', '正在搜尋相關資訊...'),
    google_search: t('toolNarration.googleSearch', '正在搜尋 Google...'),
  };

  const displayName = toolNarrations[toolName] || toolName.replace(/_/g, ' ');

  // Status indicator
  const getStatusIndicator = () => {
    if (errorText) {
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    }
    if (state === 'output-available') {
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    }
    if (state === 'input-streaming' || state === 'input-available') {
      return <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />;
    }
    return <Clock className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{displayName}</span>
      {getStatusIndicator()}
      {errorText && (
        <span className="text-destructive ml-1">({errorText})</span>
      )}
    </div>
  );
}

/**
 * Extract tool name from type string (e.g., "tool-calculator" -> "calculator")
 */
function extractToolName(type: string): string {
  if (type?.startsWith('tool-')) {
    return type.substring(5);
  }
  return type || 'unknown';
}

/**
 * Helper function to get domain from URL
 */
function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'Unknown';
  }
}

/**
 * Helper function to truncate text
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Sources List Component - Shows all sources with better UI
 */
function SourcesList({ sources }: { sources: any[] }) {
  const { t } = useTranslation('agent');

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">
          {t('sources.title', { count: sources.length })}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sources.map((source: any, idx: number) => (
          <SourceCard key={idx} source={source} index={idx + 1} />
        ))}
      </div>
    </div>
  );
}

/**
 * Source Card Component - Individual source with favicon and better styling
 */
function SourceCard({ source, index }: { source: any; index: number }) {
  const domain = getDomainFromUrl(source.url);
  const title = source.title || domain;
  const displayTitle = truncateText(title, 50);

  // Use Google's favicon service (reliable and fast)
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-2 p-2 rounded-lg border border-border/40 bg-muted/10 hover:bg-muted/30 hover:border-border transition-all duration-200"
      title={title}
    >
      {/* Citation Number */}
      <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-muted-foreground/80 text-background text-[10px] font-bold mt-0.5">
        {index}
      </div>

      {/* Favicon */}
      <div className="flex-shrink-0 mt-0.5">
        <img
          src={faviconUrl}
          alt=""
          className="w-4 h-4 rounded"
          onError={(e) => {
            // Fallback to a default icon if favicon fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground group-hover:text-foreground/80 transition-colors line-clamp-2">
          {displayTitle}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {domain}
        </div>
      </div>

      {/* External Link Icon */}
      <ExternalLink className="flex-shrink-0 w-3 h-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors mt-1" />
    </a>
  );
}

/**
 * Example Prompt Component
 */
function ExamplePrompt({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      className="flex items-start sm:items-center gap-2 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/50 px-2.5 sm:px-3 py-2 text-left text-xs sm:text-sm hover:bg-muted transition-colors active:scale-[0.98]"
    >
      
      <span className="line-clamp-2 sm:line-clamp-1">{text}</span>
    </button>
  );
}

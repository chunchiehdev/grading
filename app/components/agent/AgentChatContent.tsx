/**
 * Agent Chat Content Component
 *
 * Main chat area with messages and input - Gemini-style design
 * This component is used within the agent-playground layout
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import {
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ExternalLink,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';
import { useLoaderData, useParams } from 'react-router';
import type { User as UserType } from '@/root';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

/**
 * Extract text content from UIMessage parts
 */
function getMessageContent(msg: UIMessage): string {
  if (msg.parts && msg.parts.length > 0) {
    return msg.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as any).text)
      .join('');
  }
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
  sources: any[];
}

function groupPartsBySteps(parts: any[]): Step[] {
  const steps: Step[] = [];
  let currentStep: Step = { stepNumber: 0, textParts: [], toolInvocations: [], sources: [] };

  for (const part of parts) {
    if (part.type === 'step-start') {
      if (currentStep.textParts.length > 0 || currentStep.toolInvocations.length > 0 || currentStep.sources.length > 0) {
        steps.push(currentStep);
      }
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
      currentStep.sources.push(part);
    }
  }

  if (currentStep.textParts.length > 0 || currentStep.toolInvocations.length > 0 || currentStep.sources.length > 0) {
    steps.push(currentStep);
  }

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

export function AgentChatContent() {
  const [input, setInput] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [tokenLimitExceeded, setTokenLimitExceeded] = useState(false);
  const [tokenLimitWarning, setTokenLimitWarning] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasLoadedSessionRef = useRef<string | null>(null);
  
  // ✅ 追蹤當前 sessionId，因為 window.history.replaceState 不會更新 React Router params
  const currentSessionIdRef = useRef<string | null>(null);

  const params = useParams();
  const sessionId = params.sessionId || null;
  
  // ✅ 同步 URL params 到 ref（當 URL 真正改變時）
  useEffect(() => {
    currentSessionIdRef.current = sessionId;
  }, [sessionId]);

  const { user } = useLoaderData() as { user: UserType | null };
  const { t } = useTranslation('agent');

  // ✅ 使用 ref 動態讀取 sessionId，避免閉包問題
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/agent-chat',
    body: () => {
      return { sessionId: currentSessionIdRef.current };
    },
    prepareSendMessagesRequest: ({ messages }) => {
      const lastMessage = messages[messages.length - 1];
      const newMessage = getMessageContent(lastMessage);
      
      if (!newMessage) {
        throw new Error('Message content is empty');
      }
      
      return {
        body: {
          sessionId: currentSessionIdRef.current,
          message: newMessage,
        },
      };
    },
    fetch: async (input, init) => {
      const response = await fetch(input, init);
      
      const tokenLimitExceeded = response.headers.get('X-Token-Limit-Exceeded') === 'true';
      const tokenLimitWarning = response.headers.get('X-Token-Limit-Warning') === 'true';
      
      if (tokenLimitExceeded) {
        setTokenLimitExceeded(true);
      } else if (tokenLimitWarning) {
        setTokenLimitWarning(true);
      }
      
      // ✅ 只在新對話時處理（ref 為 null）
      if (!currentSessionIdRef.current) {
        const newSessionId = response.headers.get('X-Chat-Session-Id');
        if (newSessionId) {
          // ✅ 同時更新 URL 和 ref
          currentSessionIdRef.current = newSessionId;
          window.history.replaceState(window.history.state, '', `/agent-playground/${newSessionId}`);
          hasLoadedSessionRef.current = newSessionId;
        }
      }
      
      return response;
    },
  }), []); // ✅ 空依賴，透過 ref 獲取最新值

  const { messages, status, sendMessage, error, setMessages } = useChat({
    transport,
    onError: (error) => {
      console.error('Agent chat error:', error);
      toast.error(t('error.sendFailed', '發送訊息失敗，請稍後再試'));
    },
  });

  // Load session history
  useEffect(() => {
    if (sessionId) {
      if (hasLoadedSessionRef.current === sessionId) {
        return;
      }
      
      hasLoadedSessionRef.current = sessionId;
      setIsLoadingHistory(true);
      
      fetch(`/api/chat-sessions/${sessionId}`)
        .then(async (res) => {
          if (!res.ok) {
            hasLoadedSessionRef.current = null;
            if (res.status === 404) {
              toast.error('對話不存在');
            } else if (res.status === 403) {
              toast.error('您沒有權限訪問此對話');
            }
            return;
          }
          const data = await res.json();
          setMessages(data.messages);
          setShowWelcome(false);
          
          const totalTokens = data.session?.totalTokens || 0;
          const TOKEN_LIMIT_THRESHOLD = 25000;
          
          if (totalTokens >= TOKEN_LIMIT_THRESHOLD) {
            setTokenLimitExceeded(true);
          } else if (totalTokens >= TOKEN_LIMIT_THRESHOLD * 0.8) {
            setTokenLimitWarning(true);
          } else {
            setTokenLimitExceeded(false);
            setTokenLimitWarning(false);
          }
        })
        .catch((e) => {
          hasLoadedSessionRef.current = null;
          console.error('Failed to load session', e);
          toast.error('載入對話失敗');
        })
        .finally(() => {
          setIsLoadingHistory(false);
        });
    } else {
      hasLoadedSessionRef.current = null;
      setMessages([]);
      setShowWelcome(true);
    }
  }, [sessionId, setMessages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || status === 'submitted' || status === 'streaming') return;

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

  const handleNewChat = useCallback(() => {
    window.location.href = '/agent-playground';
  }, []);

  const isLoading = status === 'submitted' || status === 'streaming';
  const isInputDisabled = isLoading || tokenLimitExceeded;

  return (
    <div className="h-full flex flex-col">
      {/* Loading History Indicator */}
      {isLoadingHistory && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-20">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{t('status.loadingHistory', '載入歷史訊息...')}</span>
          </div>
        </div>
      )}

      {/* Messages Area - scrollable, fills remaining space */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-8"
        >
          {showWelcome && messages.length === 0 && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="max-w-2xl w-full space-y-8 text-center">
                {/* Welcome Header */}
                <div className="space-y-3">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    {t('welcome.title', { name: user?.name || user?.email?.split('@')[0] || 'there' })}
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {t('welcome.subtitle')}
                  </p>
                </div>

                {/* Example Prompts */}
                <div className="space-y-4">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t('welcome.tryAsking')}</p>
                  <div className="grid gap-3 max-w-lg mx-auto">
                    <ExamplePrompt text={t('examples.pendingAssignments')} onClick={handleExampleClick} />
                    <ExamplePrompt text={t('examples.upcomingDeadlines')} onClick={handleExampleClick} />
                    <ExamplePrompt text={t('examples.courses')} onClick={handleExampleClick} />
                    <ExamplePrompt text={t('examples.recentGrades')} onClick={handleExampleClick} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
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

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area - fixed at bottom, won't shrink */}
      <div className="flex-shrink-0 relative">
        <div 
          className="absolute bottom-full left-0 right-0 h-16 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)'
          }}
        />
        
        <div 
          className="bg-background"
          style={{
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
          }}
        >
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-4">
            {/* Token Limit Warning */}
            {(tokenLimitExceeded || tokenLimitWarning) && (
              <div
                className={cn(
                  "flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl mb-4 border",
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

            {/* Input Form */}
            <form
              onSubmit={handleSubmit}
              className={cn(
                "flex gap-3 bg-muted/40 dark:bg-muted/20 rounded-2xl p-2 transition-all duration-200",
                "border border-border/50",
                "focus-within:border-primary/50 focus-within:bg-muted/60 dark:focus-within:bg-muted/30"
              )}
            >
              <div className="flex-1 min-w-0">
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
                    "w-full bg-transparent px-4 py-3 text-sm sm:text-base placeholder:text-muted-foreground/60",
                    "focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                    tokenLimitExceeded && "placeholder:text-amber-500 dark:placeholder:text-amber-400"
                  )}
                  disabled={isInputDisabled}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <Button
                type="submit"
                disabled={isInputDisabled || !input.trim()}
                size="icon"
                className={cn(
                  "h-11 w-11 rounded-xl shrink-0",
                  tokenLimitExceeded && "opacity-50"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </form>

            {/* Disclaimer */}
            <p className="text-center text-xs text-muted-foreground/60 mt-3">
              {t('disclaimer', 'AI 可能會犯錯，請仔細檢查重要資訊')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Message Bubble with Steps
 */
function MessageBubbleWithSteps({ message, user }: { message: UIMessage; user: UserType | null }) {
  const isUser = message.role === 'user';
  const messageContent = getMessageContent(message);

  const steps = useMemo(() => {
    if (isUser) return [];
    return groupPartsBySteps(message.parts || []);
  }, [message.parts, isUser]);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="text-sm whitespace-pre-wrap break-words px-4 py-3 rounded-2xl rounded-tr-none bg-primary text-primary-foreground max-w-[80%]">
          {messageContent}
        </div>
      </div>
    );
  }

  const { t } = useTranslation('agent');

  const hasAnyTools = steps.some(s => s.toolInvocations.length > 0);
  const finalResponseStep = steps[steps.length - 1];
  
  const isThinking = steps.some(s => 
    s.toolInvocations.some((tool: any) => {
      const state = tool.state || 'unknown';
      return state === 'input-streaming' || state === 'input-available' || state === 'unknown';
    })
  );

  return (
    <div className="w-full space-y-4">
      {/* Thinking Process - Collapsible */}
      {hasAnyTools && (
        <Collapsible 
          open={isThinking ? true : undefined}
          defaultOpen={isThinking}
          className="group"
        >
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="flex items-center gap-2 px-3 py-1.5 h-auto text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              <span>{isThinking ? t('status.thinking', 'AI 思考中...') : t('status.viewThinkingProcess', '查看思考過程')}</span>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="py-2 pl-4">
              <div className="relative pl-4 border-l-2 border-border/50">
                <div className="space-y-1.5">
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

      {/* Final Response */}
      {finalResponseStep && finalResponseStep.textParts.length > 0 && (
        <div className="text-sm text-foreground leading-relaxed">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown>{finalResponseStep.textParts.map((part) => part.text || '').join('')}</Markdown>
          </div>
        </div>
      )}

      {/* Sources */}
      {finalResponseStep?.sources.length > 0 && (
        <SourcesList sources={finalResponseStep.sources} />
      )}
    </div>
  );
}

/**
 * Thinking Action Component
 */
function ThinkingAction({ tool }: { tool: any }) {
  const { t } = useTranslation('agent');
  
  const toolName = tool.toolName || extractToolName(tool.type);
  const state = tool.state || 'unknown';
  const errorText = tool.errorText;

  const toolNarrations: Record<string, string> = {
    database_query: t('toolNarration.databaseQuery', '正在查詢資料...'),
    generate_report: t('toolNarration.generateReport', '正在生成報告...'),
    calculator: t('toolNarration.calculator', '正在計算...'),
    code_explainer: t('toolNarration.codeExplainer', '正在分析程式碼...'),
    web_search: t('toolNarration.webSearch', '正在搜尋相關資訊...'),
    google_search: t('toolNarration.googleSearch', '正在搜尋 Google...'),
  };

  const displayName = toolNarrations[toolName] || toolName.replace(/_/g, ' ');

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
    <div className="flex items-center gap-2 text-xs text-muted-foreground py-0.5">
      {getStatusIndicator()}
      <span>{displayName}</span>
      {errorText && (
        <span className="text-destructive">({errorText})</span>
      )}
    </div>
  );
}

function extractToolName(type: string): string {
  if (type?.startsWith('tool-')) {
    return type.substring(5);
  }
  return type || 'unknown';
}

function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'Unknown';
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Sources List Component
 */
function SourcesList({ sources }: { sources: any[] }) {
  const { t } = useTranslation('agent');

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2">
        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
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
 * Source Card Component
 */
function SourceCard({ source, index }: { source: any; index: number }) {
  const domain = getDomainFromUrl(source.url);
  const title = source.title || domain;
  const displayTitle = truncateText(title, 50);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-2 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-border transition-all duration-200"
      title={title}
    >
      <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-muted-foreground/20 text-foreground text-[10px] font-bold">
        {index}
      </div>
      <div className="flex-shrink-0">
        <img
          src={faviconUrl}
          alt=""
          className="w-4 h-4 rounded"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground line-clamp-2">
          {displayTitle}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {domain}
        </div>
      </div>
      <ExternalLink className="flex-shrink-0 w-3 h-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
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
      className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-left text-sm hover:bg-muted/40 hover:border-border transition-all active:scale-[0.98]"
    >
      <span className="line-clamp-2">{text}</span>
    </button>
  );
}

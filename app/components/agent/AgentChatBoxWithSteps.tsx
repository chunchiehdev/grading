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
  Bot,
  User,
  Loader2,
  Wrench,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  Brain,
  Zap,
  ExternalLink,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';
import { useLoaderData } from 'react-router';
import type { User as UserType } from '@/root';
import { useTranslation } from 'react-i18next';

/**
 * Extract text content from UIMessage parts
 */
function getMessageContent(msg: UIMessage): string {
  return msg.parts
    .filter((part) => part.type === 'text')
    .map((part) => (part as any).text)
    .join('');
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get user data from loader
  const { user } = useLoaderData() as { user: UserType | null };

  // Translation
  const { t } = useTranslation('agent');

  // Use Vercel AI SDK's useChat hook
  const { messages, status, sendMessage, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/agent-chat',
    }),
    onError: (error) => {
      console.error('Agent chat error:', error);
    },
  });

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

  return (
    <div className="relative h-full w-full flex flex-col [--content-margin:0.75rem] sm:[--content-margin:1.5rem] lg:[--content-margin:4rem]">
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
                placeholder={t('input.placeholder')}
                className="w-full rounded-full border-0 bg-transparent px-3 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 tap-highlight-transparent"
                disabled={isLoading}
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
              disabled={isLoading || !input.trim()}
              size="icon"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full shrink-0"
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
    return groupPartsBySteps(message.parts);
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

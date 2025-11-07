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
  Brain,
  Zap,
  ExternalLink,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';
import { useLoaderData } from 'react-router';
import type { User as UserType } from '@/root';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get user data from loader
  const { user } = useLoaderData() as { user: UserType | null };

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
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
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
    <div className="relative h-full [--content-margin:0.75rem] sm:[--content-margin:1.5rem] lg:[--content-margin:4rem]">
      {/* Messages Area */}
      <ScrollArea className="h-full" ref={scrollRef}>
        <div className="mx-auto max-w-4xl px-[var(--content-margin)] pt-2 sm:pt-4 pb-36 sm:pb-32">
          {showWelcome && messages.length === 0 && (
            <Card className="mb-3 sm:mb-4">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Brain className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  <span className="line-clamp-2 sm:line-clamp-1">Welcome to the Playground!</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  This agent demonstrates multi-step reasoning - you can see each step!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <p className="text-xs sm:text-sm font-medium">Try asking me:</p>
                <div className="grid gap-2">
                  <ExamplePrompt text="What's the latest news about AI in 2025?" onClick={handleExampleClick} />
                  <ExamplePrompt text="Calculate 234 * 567 and explain the result" onClick={handleExampleClick} />
                  <ExamplePrompt
                    text="Search for React 19 features and summarize them"
                    onClick={handleExampleClick}
                  />
                  <ExamplePrompt
                    text="Read https://ai.google.dev/gemini-api/docs/google-search and explain"
                    onClick={handleExampleClick}
                  />
                </div>

                <div className="mt-3 sm:mt-4 rounded-lg border bg-muted/50 p-2.5 sm:p-3">
                  <p className="text-xs font-medium mb-2">Available Tools:</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <Badge variant="outline" className="text-xs">Calculator</Badge>
                    <Badge variant="outline" className="text-xs">Google Search</Badge>
                    <Badge variant="outline" className="text-xs">URL Fetcher</Badge>
                    <Badge variant="outline" className="text-xs">Database</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubbleWithSteps key={message.id} message={message} user={user} />
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Agent is thinking...</span>
              </div>
            )}

            {error && (
              <Card className="border-destructive">
                <CardContent className="pt-4">
                  <p className="text-sm text-destructive">Error: {error.message}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Fixed Input Area - positioned above iOS Safari bottom address bar */}
      <div
        className="fixed left-0 right-0 z-30 bg-gradient-to-t from-background via-background to-transparent pt-2 sm:pt-0 bottom-safe"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-4xl px-[var(--content-margin)] pb-2 sm:pb-3 pt-2 sm:pt-4">
          <form
            onSubmit={handleSubmit}
            className={cn(
              "flex gap-2 bg-muted/30 dark:bg-card rounded-full p-1 transition-all duration-200 border border-border/40",
              "focus-within:ring-2 focus-within:ring-black dark:focus-within:ring-white focus-within:border-transparent",
              !input.trim() ? "shadow-2xl" : "shadow-lg"
            )}
          >
            <div className="flex-1 relative min-w-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="w-full rounded-full border-0 bg-transparent px-3 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 tap-highlight-transparent"
                disabled={isLoading}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
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
 * Enhanced Message Bubble with Step Visualization
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

  // For assistant messages with steps, show detailed view
  if (steps.length > 1) {
    return (
      <div className="w-full space-y-4">
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Multi-step reasoning ({steps.length} steps)
          </span>
        </div>

        {steps.map((step, index) => (
          <StepCard key={index} step={step} stepNumber={index + 1} />
        ))}
      </div>
    );
  }

  // For simple assistant messages without steps
  return (
    <div className="w-full space-y-3">
      <Markdown className="prose-sm">{messageContent}</Markdown>

      {/* Show sources if any */}
      {steps.length === 1 && steps[0].sources.length > 0 && (
        <SourcesList sources={steps[0].sources} />
      )}

      {/* Show tool calls if any */}
      {steps.length === 1 && steps[0].toolInvocations.length > 0 && (
        <div className="space-y-2">
          {steps[0].toolInvocations.map((tool: any, idx: number) => (
            <ToolInvocationCard key={idx} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Step Card Component - Shows one reasoning step
 */
function StepCard({ step, stepNumber }: { step: Step; stepNumber: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const stepText = step.textParts.map((part) => part.text || '').join('');

  const hasTools = step.toolInvocations.length > 0;
  const hasSources = step.sources.length > 0;

  return (
    <div className="space-y-3">
      {/* Step header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            Step {stepNumber}
          </Badge>
          
          {hasSources && (
            <Badge variant="outline" className="text-xs">
              {step.sources.length} source{step.sources.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {hasTools && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')} />
          </button>
        )}
      </div>

      {/* Step content */}
      <div className="space-y-3">
        {/* Step text content with Markdown support */}
        {stepText && <Markdown className="prose-sm">{stepText}</Markdown>}

        {/* Sources */}
        {hasSources && <SourcesList sources={step.sources} />}

        {/* Tool invocations */}
        {hasTools && isExpanded && (
          <div className="space-y-2 pt-2 border-t border-border/30">
            <p className="text-xs font-medium text-muted-foreground">Tool Executions:</p>
            {step.toolInvocations.map((tool: any, idx: number) => (
              <ToolInvocationCard key={idx} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Tool Invocation Card Component
 */
function ToolInvocationCard({ tool }: { tool: any }) {
  // Handle both ToolUIPart and DynamicToolUIPart
  const toolName = tool.toolName || extractToolName(tool.type);
  const state = tool.state || 'unknown';
  const input = tool.input;
  const output = tool.output;
  const errorText = tool.errorText;

  const toolIcons: Record<string, string> = {
    calculator: '🧮',
    code_explainer: '💻',
    memory_saver: '💾',
    web_search: '🔍',
    web_content_fetcher: '📄',
    google_search: '🌐', // Gemini's built-in Google Search
    database_query: '🗄️',
  };

  const icon = toolIcons[toolName] || '';

  // Determine status icon and color
  const getStatusInfo = () => {
    if (errorText) {
      return { icon: AlertCircle, color: 'text-destructive', label: 'Error' };
    }
    if (state === 'output-available') {
      return { icon: CheckCircle, color: 'text-green-500', label: 'Completed' };
    }
    if (state === 'input-streaming' || state === 'input-available') {
      return { icon: Clock, color: 'text-amber-500', label: 'Running' };
    }
    return { icon: Loader2, color: 'text-muted-foreground', label: 'Processing' };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="pl-3 border-l-2 border-muted-foreground/20 space-y-2">
      {/* Tool header */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium capitalize truncate">{toolName.replace(/_/g, ' ')}</span>
            <StatusIcon className={cn('h-3 w-3 shrink-0', statusInfo.color)} />
            <span className={cn('text-xs shrink-0', statusInfo.color)}>{statusInfo.label}</span>
          </div>

          {/* Tool input */}
          {input && (
            <div className="text-xs text-muted-foreground mb-2">
              <span className="font-medium block mb-1">Input:</span>
              <div className="p-2 bg-muted/20 rounded overflow-x-auto max-h-32" style={{ maxWidth: '100%' }}>
                {typeof input === 'string' ? (
                  <code className="text-[11px] sm:text-xs break-all block">{input}</code>
                ) : (
                  <pre
                    className="font-mono text-[11px] sm:text-xs m-0 whitespace-pre-wrap break-words"
                    style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                  >
                    {JSON.stringify(input, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Tool output */}
          {output && state === 'output-available' && (
            <div className="text-xs">
              <span className="font-medium text-muted-foreground block mb-1">Output:</span>
              <div
                className="p-2 sm:p-3 bg-muted/10 rounded overflow-x-auto max-h-60 sm:max-h-80"
                style={{ maxWidth: '100%' }}
              >
                {typeof output === 'string' ? (
                  <div className="text-[11px] sm:text-xs whitespace-pre-wrap break-words">{output}</div>
                ) : (
                  <pre
                    className="font-mono text-[11px] sm:text-xs m-0 whitespace-pre-wrap break-words"
                    style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                  >
                    {JSON.stringify(output, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Error text */}
          {errorText && (
            <div className="text-xs text-destructive mt-2 break-words">
              <span className="font-medium">Error:</span> {errorText}
            </div>
          )}
        </div>
      </div>
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
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">
          參考來源 ({sources.length})
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
      className="flex items-start sm:items-center gap-2 rounded-md border border-dashed border-muted-foreground/25 bg-muted/50 px-2.5 sm:px-3 py-2 text-left text-xs sm:text-sm hover:bg-muted transition-colors active:scale-[0.98]"
    >
      <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
      <span className="line-clamp-2 sm:line-clamp-1">{text}</span>
    </button>
  );
}

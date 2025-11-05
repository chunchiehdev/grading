/**
 * Enhanced Agent ChatBox Component with Step Visualization
 *
 * Shows detailed step-by-step execution of the AI agent
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import {
  Send, Bot, User, Loader2, Wrench, CheckCircle,
  AlertCircle, Clock, ChevronRight, Brain, Zap
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
}

function groupPartsBySteps(parts: any[]): Step[] {
  const steps: Step[] = [];
  let currentStep: Step = { stepNumber: 0, textParts: [], toolInvocations: [] };

  for (const part of parts) {
    if (part.type === 'step-start') {
      // Save previous step if it has content
      if (currentStep.textParts.length > 0 || currentStep.toolInvocations.length > 0) {
        steps.push(currentStep);
      }
      // Start new step
      currentStep = {
        stepNumber: steps.length,
        textParts: [],
        toolInvocations: []
      };
    } else if (part.type === 'text') {
      currentStep.textParts.push(part);
    } else if (part.type?.includes('tool') || part.type === 'dynamic-tool') {
      currentStep.toolInvocations.push(part);
    }
  }

  // Add the last step
  if (currentStep.textParts.length > 0 || currentStep.toolInvocations.length > 0) {
    steps.push(currentStep);
  }

  // If no step-start markers, treat all content as single step
  if (steps.length === 0 && parts.length > 0) {
    const textParts = parts.filter(p => p.type === 'text');
    const toolInvocations = parts.filter(p => p.type?.includes('tool') || p.type === 'dynamic-tool');
    if (textParts.length > 0 || toolInvocations.length > 0) {
      steps.push({ stepNumber: 0, textParts, toolInvocations });
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
    <div className="relative h-full [--content-margin:1rem] sm:[--content-margin:1.5rem] lg:[--content-margin:4rem]">
      {/* Messages Area */}
      <ScrollArea className="h-full" ref={scrollRef}>
        <div className="mx-auto max-w-4xl px-[var(--content-margin)] pt-4 pb-32">
        {showWelcome && messages.length === 0 && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Welcome to the AI SDK Learning Playground!
              </CardTitle>
              <CardDescription>
                This agent demonstrates multi-step reasoning - you can see each step!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">Try asking me:</p>
              <div className="grid gap-2">
                <ExamplePrompt text="Search for Claude AI and explain what you find" onClick={handleExampleClick} />
                <ExamplePrompt
                  text="Calculate 234 * 567 and explain the result"
                  onClick={handleExampleClick}
                />
                <ExamplePrompt
                  text="Search for React 19 features and summarize them"
                  onClick={handleExampleClick}
                />
                <ExamplePrompt
                  text="Read https://ai.google.dev/gemini-api/docs and give me a summary in Chinese"
                  onClick={handleExampleClick}
                />
              </div>

              <div className="mt-4 rounded-lg border bg-muted/50 p-3">
                <p className="text-xs font-medium mb-2">🛠️ Available Tools:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Calculator</Badge>
                  <Badge variant="outline">Code Explainer</Badge>
                  <Badge variant="outline">Memory Saver</Badge>
                  <Badge variant="outline">Web Search</Badge>
                  <Badge variant="outline">Web Content Fetcher</Badge>
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

      {/* Sticky Input Area */}
      <div className="sticky bottom-0 z-30">
        <div className="mx-auto max-w-4xl px-[var(--content-margin)] py-3 sm:py-4">
          <form onSubmit={handleSubmit} className="flex gap-2 bg-background rounded-full shadow-lg p-1">
            <div className="flex-1 relative min-w-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="w-full rounded-full border-0 bg-transparent px-4 sm:px-6 py-2.5 sm:py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full shrink-0"
            >
              {isLoading ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Send className="h-4 w-4 sm:h-5 sm:w-5" />}
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

  // For user messages, show simple bubble
  if (isUser) {
    return (
      <div className="flex gap-2 sm:gap-3 justify-end">
        <div className="max-w-[85%] sm:max-w-[80%] lg:max-w-[70%] rounded-lg px-3 sm:px-4 py-2 bg-primary text-primary-foreground">
          <div className="text-sm whitespace-pre-wrap break-words">{messageContent}</div>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground overflow-hidden">
          {user?.picture ? (
            <img
              src={user.picture}
              alt={user.email}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="h-4 w-4" />
          )}
        </div>
      </div>
    );
  }

  // For assistant messages with steps, show detailed view
  if (steps.length > 1) {
    return (
      <div className="flex gap-2 sm:gap-3 justify-start">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" />
        </div>

        <div className="max-w-[85%] sm:max-w-[80%] lg:max-w-[70%] space-y-3">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-muted-foreground">
              Multi-step reasoning ({steps.length} steps)
            </span>
          </div>

          {steps.map((step, index) => (
            <StepCard key={index} step={step} stepNumber={index + 1} />
          ))}
        </div>
      </div>
    );
  }

  // For simple assistant messages without steps
  return (
    <div className="flex gap-2 sm:gap-3 justify-start">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Bot className="h-4 w-4" />
      </div>

      <div className="max-w-[85%] sm:max-w-[80%] lg:max-w-[70%] rounded-lg px-3 sm:px-4 py-3 bg-muted">
        <Markdown className="prose-sm">{messageContent}</Markdown>

        {/* Show tool calls if any */}
        {steps.length === 1 && steps[0].toolInvocations.length > 0 && (
          <div className="mt-3 space-y-2">
            {steps[0].toolInvocations.map((tool: any, idx: number) => (
              <ToolInvocationCard key={idx} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Step Card Component - Shows one reasoning step
 */
function StepCard({ step, stepNumber }: { step: Step; stepNumber: number }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const stepText = step.textParts
    .map((part) => part.text || '')
    .join('');

  const hasTools = step.toolInvocations.length > 0;

  return (
    <Card className="border-l-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              Step {stepNumber}
            </Badge>
            {hasTools && (
              <Badge variant="secondary" className="text-xs">
                {step.toolInvocations.length} tool{step.toolInvocations.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {hasTools && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-90"
              )} />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Step text content with Markdown support */}
        {stepText && (
          <Markdown className="prose-sm">{stepText}</Markdown>
        )}

        {/* Tool invocations */}
        {hasTools && isExpanded && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              🔧 Tool Executions:
            </p>
            {step.toolInvocations.map((tool: any, idx: number) => (
              <ToolInvocationCard key={idx} tool={tool} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
  };

  const icon = toolIcons[toolName] || '🔧';

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
    <Card className="bg-background/50 border-dashed w-full">
      <CardContent className="pt-3 pb-3">
        <div className="space-y-2">
          {/* Tool header */}
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium capitalize truncate">
                  {toolName.replace(/_/g, ' ')}
                </span>
                <StatusIcon className={cn("h-3 w-3 shrink-0", statusInfo.color)} />
                <span className={cn("text-xs shrink-0", statusInfo.color)}>
                  {statusInfo.label}
                </span>
              </div>

              {/* Tool input */}
              {input && (
                <div className="text-xs text-muted-foreground mb-2">
                  <span className="font-medium block mb-1">Input:</span>
                  <div className="p-2 bg-muted/50 rounded overflow-x-auto max-h-32" style={{ maxWidth: '100%' }}>
                    {typeof input === 'string' ? (
                      <code className="text-[11px] sm:text-xs break-all block">{input}</code>
                    ) : (
                      <pre className="font-mono text-[11px] sm:text-xs m-0 whitespace-pre-wrap break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{JSON.stringify(input, null, 2)}</pre>
                    )}
                  </div>
                </div>
              )}

              {/* Tool output */}
              {output && state === 'output-available' && (
                <div className="text-xs">
                  <span className="font-medium text-muted-foreground block mb-1">Output:</span>
                  <div className="p-2 sm:p-3 bg-muted/30 rounded overflow-x-auto max-h-60 sm:max-h-80" style={{ maxWidth: '100%' }}>
                    {typeof output === 'string' ? (
                      <div className="text-[11px] sm:text-xs whitespace-pre-wrap break-words">{output}</div>
                    ) : (
                      <pre className="font-mono text-[11px] sm:text-xs m-0 whitespace-pre-wrap break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{JSON.stringify(output, null, 2)}</pre>
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
      </CardContent>
    </Card>
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
 * Example Prompt Component
 */
function ExamplePrompt({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/25 bg-muted/50 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
    >
      <Wrench className="h-4 w-4 text-muted-foreground" />
      <span>{text}</span>
    </button>
  );
}

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Send, CheckCircle, Loader2 } from 'lucide-react';
import { useLoaderData } from 'react-router';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import type { User } from '@/root';
import { Markdown } from '@/components/ui/markdown';
import { UIRubricDataSchema } from '@/schemas/rubric';
import { cn } from '@/lib/utils';

interface LoaderData {
  user: User | null;
  [key: string]: any;
}

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
  role: 'user' | 'assistant';
  content: string;
  rubric?: GeneratedRubric;
  index: number;
  user: any;
  onApplyRubric: (rubric: GeneratedRubric) => void;
}

const MessageItem = memo(({ role, content, rubric, index, user, onApplyRubric }: MessageItemProps) => {
  const isUser = role === 'user';

  if (isUser) {
    return (
      <div className="flex gap-2 sm:gap-3 justify-end items-start">
        <div className="text-sm whitespace-pre-wrap break-words px-3 sm:px-4 py-2 rounded-2xl bg-muted dark:bg-muted/60">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 sm:gap-3 items-start">
      <div className="flex-1 min-w-0 space-y-2">
        <Markdown className="prose-sm">{content}</Markdown>

        {/* Rubric Preview Card */}
        {rubric && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-4 max-w-md">
            <div className="flex items-center gap-2 text-primary mb-3">
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium text-sm">評分標準已生成</span>
            </div>

            <div className="mb-3">
              <div className="font-medium text-sm text-foreground">{rubric.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {rubric.categories.length} 個類別 •{' '}
                {rubric.categories.reduce((acc, cat) => acc + cat.criteria.length, 0)} 個評分標準
              </div>
            </div>

            <Button
              size="sm"
              className="w-full rounded-lg"
              onClick={() => onApplyRubric(rubric)}
            >
              <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
              套用此評分標準
            </Button>
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
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; rubric?: GeneratedRubric }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loaderData = useLoaderData() as LoaderData | undefined;
  const user = loaderData?.user || null;

  // Use experimental_useObject for structured rubric generation
  const { object: rubric, isLoading, error, submit } = useObject({
    api: '/api/ai/rubric-chat',
    schema: UIRubricDataSchema,
    onFinish: ({ object }: { object: any }) => {
      if (object) {
        // Add AI message with the generated rubric
        setMessages((prev) => [...prev, { role: 'assistant', content: `已生成評分標準: ${object.name}`, rubric: object }]);
      }
    },
    onError: (error: Error) => {
      console.error('Object generation error:', error);
    },
  });

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus textarea when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSendMessage = useCallback(() => {
    if (!input.trim() || isLoading) {
      return;
    }

    const userMessage = input.trim();
    
    // Add user message to chat history
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    
    // Build conversation history including the new message
    const conversationHistory = [
      ...messages,
      { role: 'user', content: userMessage },
    ].map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Submit to useObject
    submit({ messages: conversationHistory });
    
    setInput('');
  }, [input, isLoading, messages, submit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleApplyRubric = useCallback(
    (rubric: GeneratedRubric) => {
      onApplyRubric(rubric);
      onClose();
    },
    [onApplyRubric, onClose]
  );

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
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div
            className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4"
            style={{
              paddingBottom: 'calc(9rem + env(safe-area-inset-bottom, 0.5rem))'
            }}
          >
            {/* Welcome Message */}
            {messages.length === 0 && !isLoading && (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="max-w-2xl w-full space-y-6 text-center">
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-semibold">AI 評分標準助手</h2>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      描述您需要的評分標準，我會幫您生成專業的評分項目和等級描述。
                    </p>
                  </div>
                  <div className="grid gap-2 w-full max-w-md mx-auto">
                    <button
                      onClick={() => {
                        setInput('幫我生成一個程式設計作業的評分標準，包含程式碼品質、功能完整性和創意性');
                        inputRef.current?.focus();
                      }}
                      className="flex items-start sm:items-center gap-2 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/50 px-2.5 sm:px-3 py-2 text-left text-xs sm:text-sm hover:bg-muted transition-colors active:scale-[0.98]"
                    >
                      <span className="line-clamp-2 sm:line-clamp-1">幫我生成一個程式設計作業的評分標準</span>
                    </button>
                    <button
                      onClick={() => {
                        setInput('我需要一個寫作作業的評分標準，重點在內容深度和文字表達');
                        inputRef.current?.focus();
                      }}
                      className="flex items-start sm:items-center gap-2 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/50 px-2.5 sm:px-3 py-2 text-left text-xs sm:text-sm hover:bg-muted transition-colors active:scale-[0.98]"
                    >
                      <span className="line-clamp-2 sm:line-clamp-1">生成寫作作業的評分標準</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div
                className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 mb-6"
                role="alert"
              >
                <p className="text-sm text-destructive">{error instanceof Error ? error.message : '發生錯誤，請稍後再試'}</p>
              </div>
            )}

            {/* Messages */}
            <div className="space-y-4" role="log" aria-label="對話記錄" aria-live="polite">
              {messages.map((msg, index) => (
                <MessageItem
                  key={index}
                  role={msg.role}
                  content={msg.content}
                  rubric={msg.rubric}
                  index={index}
                  user={user}
                  onApplyRubric={handleApplyRubric}
                />
              ))}

              {/* Streaming Rubric Display */}
              {isLoading && rubric && (
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-4" role="status" aria-label="AI 正在流式生成評分標準">
                  <div className="flex items-center gap-2 text-primary mb-3">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span className="font-medium text-sm">正在生成評分標準...</span>
                  </div>
                  {rubric.name && (
                    <div>
                      <div className="font-medium text-sm text-foreground">{rubric.name}</div>
                      {rubric.description && (
                        <div className="text-xs text-muted-foreground mt-1">{rubric.description}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Loading Message - no rubric yet */}
              {isLoading && !rubric && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-label="AI 正在處理中">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  AI 正在生成評分標準...
                </div>
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Sticky Input Area */}
        <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 "
          style={{
            paddingTop: '0.5rem',
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'
          }}
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-2 sm:pb-3 pt-2 sm:pt-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
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
                  onKeyDown={handleKeyDown}
                  placeholder="描述您需要的評分標準..."
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
                disabled={!input.trim() || isLoading}
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
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Send, CheckCircle, Loader2, X } from 'lucide-react';
import { useLoaderData } from 'react-router';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import type { User } from '@/root';
import { Markdown } from '@/components/ui/markdown';
import { UIRubricDataSchema } from '@/schemas/rubric';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('rubric');
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
    <div className="w-full space-y-3">
      <Markdown className="prose-sm">{content}</Markdown>

      {/* Rubric Preview Card */}
      {rubric && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 max-w-md">
          <div className="flex items-center gap-2 text-primary mb-3">
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
            <span className="font-medium text-sm">{t('aiAssistant.apply')}</span>
          </div>

          <div className="mb-4">
            <div className="font-medium text-base text-foreground">{rubric.name}</div>
            <div className="text-sm text-muted-foreground mt-2">
              {rubric.categories.length} {t('categories')} •{' '}
              {rubric.categories.reduce((acc, cat) => acc + cat.criteria.length, 0)} {t('criteria')}
            </div>
          </div>

          <Button
            size="sm"
            className="w-full rounded-lg touch-manipulation"
            onClick={() => onApplyRubric(rubric)}
          >
            <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('aiAssistant.apply')}
          </Button>
        </div>
      )}
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
  const { t } = useTranslation('rubric');
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
        setMessages((prev) => [...prev, { role: 'assistant', content: t('aiAssistant.generating'), rubric: object }]);
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

  // Focus input when dialog opens
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

  const handleExampleClick = useCallback((text: string) => {
    setInput(text);
    inputRef.current?.focus();
  }, []);

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Get user name with fallback
  const userName = user?.name || user?.email?.split('@')[0] || '';

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col [--content-margin:0.75rem] sm:[--content-margin:1.5rem] lg:[--content-margin:4rem]">
      {/* Close button - top right */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 p-2 hover:bg-muted rounded-lg transition-colors touch-manipulation"
        aria-label="關閉對話"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Messages Area - scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div
          className="mx-auto max-w-4xl px-[var(--content-margin)] pt-2 sm:pt-4"
          style={{
            paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0.5rem))'
          }}
        >
          {/* Welcome Message */}
          {messages.length === 0 && !isLoading && (
            <div className="flex items-center justify-center py-12 sm:py-16">
              <div className="max-w-2xl w-full space-y-6 text-center">
                <div className="space-y-3">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
                    {t('welcome.title', { name: userName })}
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {t('welcome.subtitle')}
                  </p>
                </div>

                {/* Example Prompts */}
                <div className="space-y-3">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t('welcome.tryAsking')}</p>
                  <div className="grid gap-2">
                    {(t('aiAssistant.examples', { returnObjects: true }) as string[]).map((example, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleExampleClick(example)}
                        className="flex items-start sm:items-center gap-2 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/50 px-2.5 sm:px-3 py-2 text-left text-xs sm:text-sm hover:bg-muted transition-colors active:scale-[0.98] touch-manipulation"
                      >
                        <span className="line-clamp-2 sm:line-clamp-1">{example}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div
              className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 mb-4"
              role="alert"
            >
              <p className="text-sm text-destructive">{error instanceof Error ? error.message : t('aiAssistant.error')}</p>
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

            {/* Loading State - unified */}
            {isLoading && (
              <div 
                className="rounded-xl border border-primary/30 bg-primary/10 p-4 sm:p-5"
                role="status"
                aria-label="AI 正在處理中"
              >
                <div className="flex items-center gap-2 text-primary mb-4">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span className="font-medium text-sm">{t('aiAssistant.generating')}</span>
                </div>
                {rubric?.name && (
                  <div>
                    <div className="font-medium text-sm text-foreground">{rubric.name}</div>
                    {rubric.description && (
                      <div className="text-xs text-muted-foreground mt-2">{rubric.description}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Sticky Input Area */}
      <div 
        className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{
          paddingTop: '0.5rem',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'
        }}
      >
        <div className="mx-auto max-w-4xl px-[var(--content-margin)] pb-2 sm:pb-3 pt-2 sm:pt-4">
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
                placeholder={t('aiAssistant.placeholder')}
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
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full shrink-0 touch-manipulation"
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
};

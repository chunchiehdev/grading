import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Send, CheckCircle, Loader2, Sparkles, User as UserIcon, Bot, X } from 'lucide-react';
import { useLoaderData } from 'react-router';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import type { User } from '@/root';
import { Markdown } from '@/components/ui/markdown';
import { UIRubricDataSchema } from '@/schemas/rubric';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';

// Simple hook for media query
function useMediaQuery(query: string) {
  const [value, setValue] = useState(false);

  useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches);
    }

    const result = matchMedia(query);
    result.addEventListener("change", onChange);
    setValue(result.matches);

    return () => result.removeEventListener("change", onChange);
  }, [query]);

  return value;
}

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
      <div className="flex gap-3 justify-end items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="text-sm whitespace-pre-wrap break-words px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground shadow-sm max-w-[85%]">
          {content}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted overflow-hidden border border-border">
          {user?.picture ? (
            <img src={user.picture} alt={user.email} className="w-full h-full object-cover" referrerPolicy='no-referrer'/>
          ) : (
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 justify-start items-start w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 mt-0.5">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      
      <div className="flex-1 space-y-3 max-w-[90%]">
        <div className="text-sm text-foreground/90 bg-muted/50 px-4 py-3 rounded-2xl rounded-tl-none">
          <Markdown className="prose-sm dark:prose-invert max-w-none">{content}</Markdown>
        </div>

        {/* Rubric Preview Card */}
        {rubric && (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="p-4 border-b border-border/50 bg-muted/30">
              <div className="flex items-center gap-2 text-primary mb-1">
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium text-xs uppercase tracking-wider">{t('aiAssistant.generatedRubric')}</span>
              </div>
              <div className="font-semibold text-base text-foreground">{rubric.name}</div>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="text-sm text-muted-foreground">
                {rubric.description || t('noDescription')}
              </div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>{rubric.categories.length} {t('categories')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>{rubric.categories.reduce((acc, cat) => acc + cat.criteria.length, 0)} {t('criteria')}</span>
                </div>
              </div>

              <Button
                size="sm"
                className="w-full rounded-lg gap-2"
                onClick={() => onApplyRubric(rubric)}
              >
                <CheckCircle className="h-4 w-4" />
                {t('aiAssistant.apply')}
              </Button>
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
  const { t } = useTranslation('rubric');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; rubric?: GeneratedRubric }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loaderData = useLoaderData() as LoaderData | undefined;
  const user = loaderData?.user || null;
  
  // Responsive check
  const isDesktop = useMediaQuery("(min-width: 768px)");

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
      }, 300); // Slightly longer delay for Sheet animation
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

  // Get user name with fallback
  const userName = user?.name || user?.email?.split('@')[0] || '';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetHeader>
        
      </SheetHeader>
      <SheetContent 
        side={isDesktop ? "right" : "bottom"} 
        className={cn(
          "flex flex-col gap-0 p-0 border-l shadow-2xl transition-all duration-300",
          isDesktop ? "sm:max-w-md md:max-w-lg lg:max-w-xl w-full h-full" : "h-[100dvh] w-full rounded-none border-t-0"
        )}
      >
        {/* Header */}
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/10">
          <div className="flex flex-col min-h-full">
            <div className="flex-1 px-4 py-6 space-y-6">
              {/* Welcome Message */}
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">
                      {t('welcome.title', { name: userName })}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      {t('welcome.subtitle')}
                    </p>
                  </div>

                  {/* Example Prompts */}
                  <div className="w-full max-w-sm space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('welcome.tryAsking')}</p>
                    <div className="grid gap-2">
                      {(t('aiAssistant.examples', { returnObjects: true }) as string[]).map((example, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleExampleClick(example)}
                          className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                        >
                          <Sparkles className="w-4 h-4 text-primary/60" />
                          <span className="line-clamp-1">{example}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div
                  className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3"
                  role="alert"
                >
                  <div className="p-1 rounded-full bg-destructive/20 shrink-0">
                    <span className="block w-1.5 h-1.5 rounded-full bg-destructive" />
                  </div>
                  <p className="text-sm font-medium">{error instanceof Error ? error.message : t('aiAssistant.error')}</p>
                </div>
              )}

              {/* Messages List */}
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

              {/* Loading State */}
              {isLoading && (
                <div className="flex gap-3 justify-start items-start w-full animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 mt-0.5">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="animate-pulse">{t('aiAssistant.generating')}</span>
                    </div>
                    {rubric?.name && (
                      <div className="text-xs bg-muted/50 px-3 py-2 rounded-lg border border-border/50 animate-pulse">
                        <span className="font-medium">{rubric.name}</span>
                        {rubric.categories?.length > 0 && (
                          <span className="ml-2 opacity-70">
                            ({rubric.categories.length} {t('categories')})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} className="h-1" />
            </div>
          </div>
        </div>

        {/* Sticky Input Area */}
        <div
          className="flex-shrink-0 z-10"
          style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)'
          }}
        >
          <div className="px-4 pt-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className={cn(
                "flex gap-2 bg-background/80 backdrop-blur-xl shadow-lg rounded-full p-1 transition-all duration-200 border border-border/40",
                "focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50",
                !input.trim() ? "shadow-xl" : "shadow-lg"
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
                  className="w-full rounded-full border-0 bg-transparent px-4 py-3 text-sm sm:text-base placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 tap-highlight-transparent"
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
      </SheetContent>
    </Sheet>
  );
};

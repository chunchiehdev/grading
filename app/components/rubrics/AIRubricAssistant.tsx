import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, MoveUp, CheckCircle, Loader2, Plus, User as UserIcon } from 'lucide-react';
import { useLoaderData } from 'react-router';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import type { User } from '@/root';
import { Markdown } from '@/components/ui/markdown';
import { parseRubricFromMessage, type ParsedRubricContent } from '@/utils/rubric-parser';

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
  msg: UIMessage;
  parsed?: ParsedRubricContent;
  index: number;
  user: any;
  onApplyRubric: (rubric: GeneratedRubric) => void;
}

/**
 * Extract text content from UIMessage parts
 */
function getMessageContent(msg: UIMessage): string {
  return msg.parts
    .filter((part) => part.type === 'text')
    .map((part) => (part as any).text)
    .join('');
}

const MessageItem = memo(({ msg, parsed, index, user, onApplyRubric }: MessageItemProps) => {
  const isUser = msg.role === 'user';
  const rubricData = parsed?.rubricData;
  const messageContent = getMessageContent(msg);
  const displayText = parsed?.displayText || messageContent;

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
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{messageContent}</p>
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

  // Use Vercel AI SDK's useChat hook
  const { messages, status, sendMessage: sendChatMessage, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/rubric-chat',
      body: {
        currentRubric,
      },
    }),
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // Parse messages to extract rubric data
  const parsedMessages = useMemo(() => {
    return messages.map((msg) => {
      if (msg.role === 'assistant') {
        const content = getMessageContent(msg);
        return {
          ...msg,
          parsed: parseRubricFromMessage(content),
        };
      }
      return { ...msg, parsed: undefined };
    });
  }, [messages]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleTextareaResize = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      requestAnimationFrame(() => {
        textarea.style.height = 'auto';
        const newHeight = Math.min(textarea.scrollHeight, 144); // max 6 lines (24px * 6)
        textarea.style.height = `${newHeight}px`;
      });
    }
  }, []);

  useEffect(() => {
    handleTextareaResize();
  }, [input, handleTextareaResize]);

  // Focus textarea when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSendMessage = () => {
    if (!input.trim() || status === 'submitted' || status === 'streaming') {
      return;
    }

    // Send message using AI SDK - sendMessage expects a message object
    sendChatMessage({ text: input.trim() });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleApplyRubric = useCallback(
    (rubric: GeneratedRubric) => {
      onApplyRubric(rubric);
      onClose();
    },
    [onApplyRubric, onClose]
  );

  const isLoading = status === 'submitted' || status === 'streaming';
  const isConnected = status === 'ready' || isLoading || messages.length > 0;

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
            {/* Welcome Message */}
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">AI 評分標準助手</h2>
                <p className="text-muted-foreground text-sm max-w-md">
                  描述您需要的評分標準，我會幫您生成專業的評分項目和等級描述。
                </p>
                <div className="mt-6 grid gap-2 w-full max-w-md">
                  <Button
                    variant="outline"
                    className="text-left justify-start h-auto py-3 px-4"
                    onClick={() => setInput('幫我生成一個程式設計作業的評分標準，包含程式碼品質、功能完整性和創意性')}
                  >
                    <span className="text-sm">幫我生成一個程式設計作業的評分標準</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="text-left justify-start h-auto py-3 px-4"
                    onClick={() => setInput('我需要一個寫作作業的評分標準，重點在內容深度和文字表達')}
                  >
                    <span className="text-sm">生成寫作作業的評分標準</span>
                  </Button>
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
                  <p className="text-sm text-destructive">{error.message || '發生錯誤，請稍後再試'}</p>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="space-y-8" role="group" aria-label="對話訊息">
              {parsedMessages.map((msg, index) => (
                <MessageItem
                  key={msg.id}
                  msg={msg}
                  parsed={msg.parsed}
                  index={index}
                  user={user}
                  onApplyRubric={handleApplyRubric}
                />
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
              id="rubric-chat-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-end gap-3 bg-muted/50 rounded-2xl p-3 border border-border shadow-lg"
            >
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
                type="button"
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
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

/**
 * Agent ChatBox Component
 *
 * Interactive chatbox for learning about AI SDK 6 Beta agents
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { Send, Bot, User, Loader2, Wrench, CheckCircle, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

/**
 * Extract text content from UIMessage parts
 */
function getMessageContent(msg: UIMessage): string {
  return msg.parts
    .filter((part) => part.type === 'text')
    .map((part) => (part as any).text)
    .join('');
}

export function AgentChatBox() {
  const [input, setInput] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">AI SDK Learning Agent</h2>
            <p className="text-sm text-muted-foreground">
              Explore multi-step reasoning and tool calling
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
        {showWelcome && messages.length === 0 && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Welcome to the AI SDK Learning Playground!
              </CardTitle>
              <CardDescription>
                This agent demonstrates the power of AI SDK 6 Beta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">Try asking me:</p>
              <div className="grid gap-2">
                <ExamplePrompt text="Calculate 234 * 567" onClick={handleExampleClick} />
                <ExamplePrompt
                  text="Explain async/await in JavaScript"
                  onClick={handleExampleClick}
                />
                <ExamplePrompt
                  text="Remember that my name is Alice"
                  onClick={handleExampleClick}
                />
                <ExamplePrompt text="Search for latest AI trends" onClick={handleExampleClick} />
              </div>

              <div className="mt-4 rounded-lg border bg-muted/50 p-3">
                <p className="text-xs font-medium mb-2">🛠️ Available Tools:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Calculator</Badge>
                  <Badge variant="outline">Code Explainer</Badge>
                  <Badge variant="outline">Memory Saver</Badge>
                  <Badge variant="outline">Web Search</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
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
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-background px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything... (e.g., 'Calculate 25 * 4')"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>

        <p className="mt-2 text-xs text-muted-foreground text-center">
          This agent uses Gemini 2.5 Flash with multi-step reasoning
        </p>
      </div>
    </div>
  );
}

/**
 * Message Bubble Component
 */
function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';
  const messageContent = getMessageContent(message);

  // Extract tool calls from message parts
  const toolCalls = useMemo(() => {
    return message.parts
      .filter((part) => part.type === 'tool-call')
      .map((part) => part as any);
  }, [message.parts]);

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        <div className="text-sm whitespace-pre-wrap break-words">{messageContent}</div>

        {/* Show tool calls if any */}
        {toolCalls.length > 0 && (
          <div className="mt-3 space-y-2">
            {toolCalls.map((tool: any, idx: number) => (
              <ToolCallCard key={idx} tool={tool} />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

/**
 * Tool Call Card Component
 */
function ToolCallCard({ tool }: { tool: any }) {
  const toolName = tool.toolName || 'unknown';
  const args = tool.args || {};

  const toolIcons: Record<string, string> = {
    calculator: '🧮',
    code_explainer: '💻',
    memory_saver: '💾',
    web_search: '🔍',
  };

  const icon = toolIcons[toolName] || '🔧';

  return (
    <Card className="bg-background/50 border-dashed">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start gap-2">
          <span className="text-lg">{icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium">{toolName.replace('_', ' ')}</span>
              <CheckCircle className="h-3 w-3 text-green-500" />
            </div>

            {/* Tool arguments */}
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Input:</span>{' '}
              {JSON.stringify(args, null, 0).substring(0, 100)}
              {JSON.stringify(args).length > 100 && '...'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
      className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/25 bg-muted/50 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
    >
      <Wrench className="h-4 w-4 text-muted-foreground" />
      <span>{text}</span>
    </button>
  );
}

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Send, Bot, User, CheckCircle, X, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  rubricData?: GeneratedRubric;
  timestamp: Date;
}

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

const EXAMPLE_PROMPTS = ['個人簡述評分標準', '程式設計作業評分標準', '簡報製作評分標準', '學術論文評分標準'];

export const AIRubricAssistant = ({ isOpen, onClose, onApplyRubric, currentRubric }: AIRubricAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content:
        '您好！我是評分標準助手 ✨\n\n請告訴我您想要創建什麼類型的評分標準，我會為您自動生成詳細的評分項目和等級描述。\n\n您可以試試下面的快速開始選項，或者直接描述您的需求！',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const parseRubricFromAI = (aiResponse: string): { rubricData: GeneratedRubric | null; displayText: string } => {
    try {
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const rubricData = JSON.parse(jsonMatch[1]);

        const processedCategories = rubricData.categories.map((cat: any) => ({
          id: uuidv4(),
          name: cat.name,
          criteria: cat.criteria.map((crit: any) => ({
            id: uuidv4(),
            name: crit.name,
            description: crit.description || '',
            levels: crit.levels.map((level: any) => ({
              score: level.score,
              description: level.description,
            })),
          })),
        }));

        const processedRubric = {
          name: rubricData.name,
          description: rubricData.description,
          categories: processedCategories,
        };

        const textBeforeJson = aiResponse.split('```json')[0].trim();

        return {
          rubricData: processedRubric,
          displayText: textBeforeJson || '已為您生成評分標準！',
        };
      }

      return {
        rubricData: null,
        displayText: aiResponse,
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        rubricData: null,
        displayText: aiResponse,
      };
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/generate-rubric', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          context: currentRubric,
          conversationHistory: messages.slice(1), // 排除初始歡迎訊息
        }),
      });

      if (!response.ok) {
        throw new Error('AI 服務暫時不可用');
      }

      const data = await response.json();
      const { rubricData, displayText } = parseRubricFromAI(data.response);

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: displayText,
        rubricData: rubricData || undefined,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `抱歉，發生了錯誤：${error instanceof Error ? error.message : '未知錯誤'}。請稍後再試。`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleApplyRubric = (rubric: GeneratedRubric) => {
    onApplyRubric(rubric);
    onClose();
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 gap-0 bg-background">
        {/* Header */}
        <DialogHeader className="border-b bg-card p-0">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-foreground">AI 評分標準助手</DialogTitle>
                <p className="text-sm text-muted-foreground">協助您快速生成專業的評分標準</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex flex-col h-[600px]">
          {/* Quick Start (only show initially) */}
          {messages.length <= 1 && (
            <div className="border-b bg-muted/30">
              <div className="p-6">
                <p className="text-sm font-medium text-foreground mb-3">快速開始：</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <Button
                      key={prompt}
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 rounded-lg border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                      onClick={() => handlePromptClick(prompt)}
                      disabled={isLoading}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="space-y-3">
                  <div className={`flex items-start gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground border-primary/20'
                          : 'bg-card text-card-foreground border-border'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="h-5 w-5" />
                      ) : (
                        <Sparkles className="h-5 w-5 text-primary" />
                      )}
                    </div>

                    {/* Message Content */}
                    <div className={`flex-1 space-y-3 ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div
                        className={`inline-block max-w-[85%] rounded-xl border shadow-sm ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground border-primary/20 ml-auto px-4 py-3'
                            : 'bg-card text-card-foreground border-border p-4'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </div>

                      {/* Generated Rubric Preview */}
                      {message.rubricData && (
                        <div
                          className={`border rounded-xl p-4 space-y-3 shadow-sm bg-primary/5 border-primary/20 ${
                            message.role === 'user' ? 'mr-auto' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                            <span className="font-medium text-foreground">評分標準已生成</span>
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm text-foreground">
                              <div className="font-medium">{message.rubricData.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {message.rubricData.categories.length} 個類別 •
                                {message.rubricData.categories.reduce((acc, cat) => acc + cat.criteria.length, 0)}{' '}
                                個評分標準
                              </div>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleApplyRubric(message.rubricData!)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            套用此評分標準
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                    <p className="text-sm text-muted-foreground">AI 正在生成評分標準...</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t bg-card">
            <div className="p-6">
              <div className="flex gap-3">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="描述您需要的評分標準，例如：我需要一個程式設計作業的評分標準，重點評估邏輯思維和程式碼品質..."
                  className="flex-1 min-h-[60px] max-h-[120px] resize-none rounded-xl border-border focus:border-primary/50 focus:ring-primary/20"
                  disabled={isLoading}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!input.trim() || isLoading} 
                  size="lg" 
                  className="px-6 rounded-xl h-[60px]"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 px-1">
                按 Enter 發送訊息，Shift + Enter 換行
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

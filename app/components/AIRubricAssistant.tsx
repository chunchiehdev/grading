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
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              AI 評分標準助手
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-[500px]">
          {messages.length <= 1 && (
            <div className="p-4 border-b bg-muted/20">
              <p className="text-sm text-muted-foreground mb-3">快速開始：</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => handlePromptClick(prompt)}
                    disabled={isLoading}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="space-y-3">
                  <div className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                      }`}
                    >
                      {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>

                    <div className={`flex-1 space-y-2 ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div
                        className={`inline-block p-3 rounded-2xl max-w-[85%] ${
                          message.role === 'user' ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </div>

                      {message.rubricData && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 space-y-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-green-800">評分標準已生成</span>
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm text-green-700">
                              <div className="font-medium">{message.rubricData.name}</div>
                              <div className="text-xs text-green-600 mt-1">
                                {message.rubricData.categories.length} 個類別 •
                                {message.rubricData.categories.reduce((acc, cat) => acc + cat.criteria.length, 0)}{' '}
                                個評分標準
                              </div>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            className="w-full bg-green-600 hover:bg-green-700"
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
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                  <div className="bg-muted p-3 rounded-2xl">
                    <p className="text-sm text-muted-foreground">正在思考中...</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="描述您需要的評分標準，例如：我需要一個個人簡述的評分標準..."
                className="flex-1 min-h-[44px] max-h-[120px] resize-none"
                disabled={isLoading}
              />
              <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="lg" className="px-4">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

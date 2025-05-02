import React from 'react';
import { FileText, ClipboardCheck, MessageCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyGradingStateProps {
  onRetry?: () => void;
}

export function EmptyGradingState({ onRetry }: EmptyGradingStateProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const steps = [
    {
      icon: FileText,
      title: '檢查文件內容',
      description: '系統分析上傳文件的內容和圖片',
      color: 'group-hover:text-primary',
    },
    {
      icon: ClipboardCheck,
      title: '應用評分標準',
      description: '根據選擇的評分標準進行評分',
      color: 'group-hover:text-primary',
    },
    {
      icon: MessageCircle,
      title: '生成評價回饋',
      description: '提供詳細評分和改進建議',
      color: 'group-hover:text-primary',
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto transition-opacity opacity-100">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">尚未開始評分</h2>
              <div className="flex items-center gap-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            <div className="grid gap-4">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="group relative"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div
                    className={`
                    relative p-4 rounded-lg border border-border
                    transition-all duration-300 ease-in-out
                    ${hoveredIndex === index ? 'transform translate-x-2' : ''}
                  `}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-md bg-primary/5">
                        <step.icon className={`w-6 h-6 transition-colors ${step.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 text-gray-400 dark:text-gray-600 transition-opacity ${hoveredIndex === index ? 'opacity-100' : 'opacity-0'}`}
                      />
                    </div>

                    {index < steps.length - 1 && <div className="absolute left-7 top-full h-16 w-px bg-border" />}
                  </div>

                  {hoveredIndex === index && (
                    <div className="absolute inset-0 border-2 border-primary/50 rounded-lg pointer-events-none" />
                  )}
                </div>
              ))}
            </div>

            {onRetry && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={onRetry}
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  重新開始評分
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

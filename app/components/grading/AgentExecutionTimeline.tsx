/**
 * Agent Execution Timeline Component
 *
 * Displays the step-by-step execution trace of Agent-based grading
 */

import { useState } from 'react';
import type { AgentStep } from '@/types/agent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Zap,
  Brain,
  Search,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';

interface AgentExecutionTimelineProps {
  steps: AgentStep[];
  confidenceScore?: number;
  requiresReview?: boolean;
  totalExecutionTimeMs?: number;
}

/**
 * Get icon for tool name
 */
function getToolIcon(toolName?: string) {
  if (!toolName) return <Brain className="w-4 h-4" />;

  const icons: Record<string, React.ReactNode> = {
    analyze_rubric: <CheckCircle2 className="w-4 h-4" />,
    parse_content: <Search className="w-4 h-4" />,
    search_reference: <Search className="w-4 h-4" />,
    check_similarity: <AlertTriangle className="w-4 h-4" />,
    calculate_confidence: <Zap className="w-4 h-4" />,
    generate_feedback: <MessageSquare className="w-4 h-4" />,
  };

  return icons[toolName] || <Zap className="w-4 h-4" />;
}

/**
 * Get display name for tool
 */
function getToolDisplayName(toolName?: string): string {
  if (!toolName) return '推理中';

  const names: Record<string, string> = {
    analyze_rubric: '分析評分標準',
    parse_content: '解析作業內容',
    search_reference: '搜尋參考資料',
    check_similarity: '檢查相似度',
    calculate_confidence: '計算信心度',
    generate_feedback: '生成評分反饋',
  };

  return names[toolName] || toolName;
}

/**
 * Confidence badge component
 */
function ConfidenceBadge({ score }: { score: number }) {
  const percentage = (score * 100).toFixed(0);
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
  let label = '中';
  let bgColor = 'bg-yellow-100 text-yellow-800';

  if (score >= 0.85) {
    label = '極高';
    bgColor = 'bg-green-100 text-green-800';
  } else if (score >= 0.7) {
    label = '高';
    bgColor = 'bg-green-100 text-green-800';
  } else if (score >= 0.5) {
    label = '中';
    bgColor = 'bg-yellow-100 text-yellow-800';
  } else {
    label = '低';
    bgColor = 'bg-red-100 text-red-800';
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${bgColor}`}>
      信心度：{label} ({percentage}%)
    </span>
  );
}

/**
 * Single step component
 */
function StepItem({ step, isLast }: { step: AgentStep; isLast: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  // Type-safe extraction of optional fields
  const reasoning = typeof step.reasoning === 'string' ? step.reasoning : undefined;
  const toolInputStr = step.toolInput ? JSON.stringify(step.toolInput, null, 2) : undefined;
  const toolOutputStr = step.toolOutput ? JSON.stringify(step.toolOutput, null, 2) : undefined;

  return (
    <div className="relative flex gap-4 pb-6">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-border" />
      )}

      {/* Step number & icon */}
      <div className="relative flex-shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-background">
          {getToolIcon(step.toolName)}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 pt-1">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm">
                步驟 {step.stepNumber}: {getToolDisplayName(step.toolName)}
              </h4>
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {step.durationMs}ms
              </Badge>
            </div>

            {/* Reasoning */}
            {reasoning && (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {reasoning}
              </p>
            )}

            {/* Tool input/output */}
            {(toolInputStr || toolOutputStr) && (
              <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 mr-1" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mr-1" />
                    )}
                    {isOpen ? '隱藏' : '查看'}詳細資訊
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {toolInputStr && (
                    <div className="rounded-md border bg-muted/50 p-3">
                      <p className="text-xs font-medium mb-1 text-muted-foreground">
                        工具輸入：
                      </p>
                      <pre className="text-xs overflow-x-auto">
                        {toolInputStr}
                      </pre>
                    </div>
                  )}
                  {toolOutputStr && (
                    <div className="rounded-md border bg-green-50 dark:bg-green-950/20 p-3">
                      <p className="text-xs font-medium mb-1 text-muted-foreground">
                        工具輸出：
                      </p>
                      <pre className="text-xs overflow-x-auto">
                        {toolOutputStr}
                      </pre>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main timeline component
 */
export function AgentExecutionTimeline({
  steps,
  confidenceScore,
  requiresReview,
  totalExecutionTimeMs,
}: AgentExecutionTimelineProps) {
  if (!steps || steps.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          無 Agent 執行記錄
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Agent 執行過程
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              多步驟推理評分 · 共 {steps.length} 個步驟
              {totalExecutionTimeMs && ` · 總耗時 ${(totalExecutionTimeMs / 1000).toFixed(1)}s`}
            </p>
          </div>

          {/* Confidence & Review status */}
          <div className="flex flex-col items-end gap-2">
            {confidenceScore !== undefined && (
              <ConfidenceBadge score={confidenceScore} />
            )}
            {requiresReview && (
              <Badge variant="destructive">需要人工審核</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-0">
          {steps.map((step, index) => (
            <StepItem
              key={`${step.stepNumber}-${index}`}
              step={step}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{steps.length}</p>
              <p className="text-xs text-muted-foreground">執行步驟</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {steps.filter((s) => s.toolName).length}
              </p>
              <p className="text-xs text-muted-foreground">工具調用</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {totalExecutionTimeMs ? `${(totalExecutionTimeMs / 1000).toFixed(1)}s` : '-'}
              </p>
              <p className="text-xs text-muted-foreground">總執行時間</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for list views
 */
export function AgentExecutionSummary({
  steps,
  confidenceScore,
  requiresReview,
}: {
  steps: AgentStep[];
  confidenceScore?: number;
  requiresReview?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Brain className="w-4 h-4" />
        <span>{steps.length} 步驟</span>
      </div>

      {confidenceScore !== undefined && (
        <ConfidenceBadge score={confidenceScore} />
      )}

      {requiresReview && (
        <Badge variant="destructive" className="text-xs">
          需審核
        </Badge>
      )}
    </div>
  );
}

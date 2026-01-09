import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { SparringQuestion, ProvocationStrategy, SparringResponseData } from '@/types/grading';
import { CheckCircle2, ChevronRight, ChevronLeft, List, ThumbsUp, ThumbsDown, Loader2, Send } from 'lucide-react';
import { useResearchLogger } from '@/hooks/useResearchLogger';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';

interface SparringInterfaceProps {
  questions: SparringQuestion[];
  savedResponses?: SparringResponseData[];
  onComplete: () => void;
  onResponse?: (data: SparringResponseData) => void;
  className?: string;
  // 新增：用於 API 呼叫
  assignmentId?: string;
  sessionId?: string;
}



type ViewMode = 'question' | 'summary';
type QuestionPhase = 'answering' | 'loading' | 'feedback' | 'completed';

export function SparringInterface({ 
  questions, 
  savedResponses, 
  onComplete, 
  onResponse, 
  className,
  assignmentId,
  sessionId,
}: SparringInterfaceProps) {
  // Find the first unanswered question index
  const getInitialIndex = () => {
    if (!savedResponses || savedResponses.length === 0) return 0;
    // 找到第一個沒有做選擇的問題
    for (let i = 0; i < questions.length; i++) {
      const saved = savedResponses.find(r => r.questionIndex === i);
      if (!saved || !saved.studentDecision) return i;
    }
    return 0; // All completed, start from first for review
  };

  // 判斷初始 phase
  const getInitialPhase = (idx: number): QuestionPhase => {
    const saved = savedResponses?.find(r => r.questionIndex === idx);
    if (!saved) return 'answering';
    if (saved.studentDecision) return 'completed';
    if (saved.dialecticalFeedback) return 'feedback';
    return 'answering';
  };

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // If all questions have decisions, show summary
    if (savedResponses && savedResponses.length >= questions.length) {
      const allDecided = savedResponses.every(r => r.studentDecision);
      if (allDecided) return 'summary';
    }
    return 'question';
  });
  const [currentIdx, setCurrentIdx] = useState(getInitialIndex);
  const [phase, setPhase] = useState<QuestionPhase>(() => getInitialPhase(getInitialIndex()));
  const [response, setResponse] = useState('');
  const [dialecticalFeedback, setDialecticalFeedback] = useState<string | null>(null);
  
  // 儲存所有回應和決定
  const [responsesMap, setResponsesMap] = useState<Map<number, SparringResponseData>>(
    new Map(savedResponses?.map(r => [r.questionIndex, r]) || [])
  );
  
  const { logEvent } = useResearchLogger();
  
  // 計算已完成的問題數（有做選擇的）
  const completedCount = Array.from(responsesMap.values()).filter(r => r.studentDecision).length;
  const allCompleted = completedCount >= questions.length;
  
  useEffect(() => {
    if (questions && questions.length > 0) {
      logEvent('SPARRING_START', { 
        totalQuestions: questions.length,
        strategies: questions.map(q => q.provocation_strategy),
        previouslyAnswered: savedResponses?.length || 0,
      });
    }
  }, [questions, logEvent, savedResponses]);

  // 初始化當前問題的狀態
  useEffect(() => {
    const saved = responsesMap.get(currentIdx);
    if (saved) {
      setResponse(saved.response || '');
      setDialecticalFeedback(saved.dialecticalFeedback || null);
      if (saved.studentDecision) {
        setPhase('completed');
      } else if (saved.dialecticalFeedback) {
        setPhase('feedback');
      } else {
        setPhase('answering');
      }
    } else {
      setResponse('');
      setDialecticalFeedback(null);
      setPhase('answering');
    }
  }, [currentIdx, responsesMap]);

  if (!questions || questions.length === 0) {
    onComplete();
    return null;
  }

  const currentQ = questions[currentIdx];
  const currentSaved = responsesMap.get(currentIdx);

  // 提交回應並取得 AI 辯證回饋
  const handleSubmitResponse = async () => {
    logEvent('SPARRING_RESPONSE', {
      questionId: currentQ.related_rubric_id,
      strategy: currentQ.provocation_strategy,
      responseLength: response.length,
    });

    setPhase('loading');

    try {
      // 呼叫 API 取得辯證回饋
      const apiResponse = await fetch(`/api/student/assignments/${assignmentId}/sparring-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionIndex: currentIdx,
          questionId: currentQ.related_rubric_id,
          strategy: currentQ.provocation_strategy,
          response,
          respondedAt: new Date().toISOString(),
          // 新增：傳送問題資料給 AI 生成回饋
          sparringQuestion: currentQ,
        }),
      });

      const result = await apiResponse.json();

      if (result.success) {
        const feedback = result.dialecticalFeedback || currentQ.ai_hidden_reasoning;
        setDialecticalFeedback(feedback);
        
        // 更新本地狀態
        const responseData: SparringResponseData = {
          questionIndex: currentIdx,
          questionId: currentQ.related_rubric_id,
          strategy: currentQ.provocation_strategy,
          response,
          respondedAt: new Date().toISOString(),
          dialecticalFeedback: feedback,
        };
        
        setResponsesMap(prev => new Map(prev).set(currentIdx, responseData));
        
        // 通知父組件
        if (onResponse) {
          onResponse(responseData);
        }
        
        setPhase('feedback');
      } else {
        // API 返回失敗，但仍然儲存本地狀態並顯示 fallback
        console.warn('API returned error, using fallback:', result.error);
        const fallbackFeedback = currentQ.ai_hidden_reasoning;
        setDialecticalFeedback(fallbackFeedback);
        
        // 仍然儲存到本地狀態（下次可能會成功）
        const fallbackData: SparringResponseData = {
          questionIndex: currentIdx,
          questionId: currentQ.related_rubric_id,
          strategy: currentQ.provocation_strategy,
          response,
          respondedAt: new Date().toISOString(),
          dialecticalFeedback: fallbackFeedback,
        };
        setResponsesMap(prev => new Map(prev).set(currentIdx, fallbackData));
        
        setPhase('feedback');
      }
    } catch (error) {
      console.error('Failed to get dialectical feedback:', error);
      // 網路錯誤，使用 fallback 但仍儲存本地狀態
      const fallbackFeedback = currentQ.ai_hidden_reasoning;
      setDialecticalFeedback(fallbackFeedback);
      
      const fallbackData: SparringResponseData = {
        questionIndex: currentIdx,
        questionId: currentQ.related_rubric_id,
        strategy: currentQ.provocation_strategy,
        response,
        respondedAt: new Date().toISOString(),
        dialecticalFeedback: fallbackFeedback,
      };
      setResponsesMap(prev => new Map(prev).set(currentIdx, fallbackData));
      
      setPhase('feedback');
    }
  };

  // 處理學生選擇（同意/不同意）
  const handleDecision = async (decision: 'agree' | 'disagree') => {
    logEvent('SPARRING_DECISION', {
      questionId: currentQ.related_rubric_id,
      strategy: currentQ.provocation_strategy,
      decision,
    });

    const decisionAt = new Date().toISOString();

    // 更新本地狀態
    const updatedData: SparringResponseData = {
      ...(responsesMap.get(currentIdx) || {
        questionIndex: currentIdx,
        questionId: currentQ.related_rubric_id,
        strategy: currentQ.provocation_strategy,
        response,
        respondedAt: new Date().toISOString(),
      }),
      dialecticalFeedback: dialecticalFeedback || undefined,
      studentDecision: decision,
      decisionAt,
    };

    setResponsesMap(prev => new Map(prev).set(currentIdx, updatedData));
    setPhase('completed');

    // 儲存到 API
    try {
      await fetch(`/api/student/assignments/${assignmentId}/sparring-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionIndex: currentIdx,
          studentDecision: decision,
          decisionAt,
        }),
      });
    } catch (error) {
      console.error('Failed to save decision:', error);
    }

    // 通知父組件
    if (onResponse) {
      onResponse(updatedData);
    }

    // 自動進入下一題或摘要
    setTimeout(() => {
      handleNext();
    }, 300);
  };

  const handleNext = () => {
    const newCompletedCount = Array.from(responsesMap.values()).filter(r => r.studentDecision).length;
    
    if (newCompletedCount >= questions.length) {
      logEvent('REVEAL_SCORE', {
        totalQuestions: questions.length,
        totalResponses: newCompletedCount,
        decisions: Array.from(responsesMap.values()).map(r => ({
          question: r.questionIndex,
          decision: r.studentDecision,
        })),
      });
      setViewMode('summary');
    } else {
      // Find next incomplete question
      let nextIdx = currentIdx + 1;
      while (nextIdx < questions.length) {
        const saved = responsesMap.get(nextIdx);
        if (!saved || !saved.studentDecision) break;
        nextIdx++;
      }
      if (nextIdx >= questions.length) {
        // 從頭找
        for (let i = 0; i < questions.length; i++) {
          const saved = responsesMap.get(i);
          if (!saved || !saved.studentDecision) {
            nextIdx = i;
            break;
          }
        }
      }
      if (nextIdx >= questions.length) {
        setViewMode('summary');
        return;
      }
      setCurrentIdx(nextIdx);
    }
  };

  const goToQuestion = (idx: number) => {
    setCurrentIdx(idx);
    setViewMode('question');
  };

  // Summary View - Shows all questions and responses with decisions
  if (viewMode === 'summary') {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">對練完成</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {completedCount} / {questions.length}
          </span>
        </div>

        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {questions.map((q, idx) => {
            const saved = responsesMap.get(idx);
            const isCompleted = saved?.studentDecision;

            return (
              <div key={idx} className="space-y-3">
                {/* AI Question - Left */}
                <div className="flex justify-start">
                  <div 
                    className="text-sm leading-relaxed px-4 py-3 rounded-2xl rounded-tl-none bg-muted max-w-[85%] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => goToQuestion(idx)}
                  >
                    <p className="text-xs text-muted-foreground mb-1">問題 {idx + 1}</p>
                    <p>{q.question}</p>
                  </div>
                </div>

                {/* User Response - Right */}
                {saved?.response && (
                  <div className="flex justify-end">
                    <div className="text-sm leading-relaxed px-4 py-3 rounded-2xl rounded-tr-none bg-primary text-primary-foreground max-w-[85%]">
                      {saved.response}
                    </div>
                  </div>
                )}

                {/* AI Feedback - Left */}
                {saved?.dialecticalFeedback && (
                  <div className="flex justify-start">
                    <div className="text-sm leading-relaxed px-4 py-3 rounded-2xl rounded-tl-none bg-muted max-w-[85%]">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Markdown>{saved.dialecticalFeedback}</Markdown>
                      </div>
                    </div>
                  </div>
                )}

                {/* Decision indicator */}
                {isCompleted && (
                  <div className="flex justify-center">
                    <span className={cn(
                      'text-xs px-2 py-1 rounded-full',
                      saved?.studentDecision === 'agree' 
                        ? 'text-primary bg-primary/10' 
                        : 'text-muted-foreground bg-muted'
                    )}>
                      {saved?.studentDecision === 'agree' ? '已採納建議' : '保留原觀點'}
                    </span>
                  </div>
                )}

                {/* Unanswered */}
                {!saved?.response && (
                  <div className="flex justify-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => goToQuestion(idx)}
                      className="text-xs text-muted-foreground"
                    >
                      回答此題
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Footer */}
        <div className="px-4 py-3 border-t">
          {allCompleted ? (
            <Button onClick={onComplete} className="w-full">
              查看完整評分
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <p className="text-xs text-center text-muted-foreground">
              完成所有問題後可查看評分
            </p>
          )}
        </div>
      </div>
    );
  }

  // Question View - Single question interaction with phases
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Minimal Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          {/* Progress Dots */}
          <div className="flex items-center gap-1.5">
            {questions.map((_, idx) => {
              const saved = responsesMap.get(idx);
              return (
                <button 
                  key={idx}
                  onClick={() => goToQuestion(idx)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    idx === currentIdx 
                      ? 'bg-primary scale-125' 
                      : saved?.studentDecision
                        ? 'bg-primary/40'
                        : saved?.response
                          ? 'bg-muted-foreground/40'
                          : 'bg-muted hover:bg-muted-foreground/30'
                  )}
                />
              );
            })}
          </div>
          <span className="text-xs text-muted-foreground">
            {currentIdx + 1} / {questions.length}
          </span>
        </div>
        {completedCount > 0 && (
          <button
            onClick={() => setViewMode('summary')}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Conversation Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Quote - subtle context */}
        <div className="text-xs text-muted-foreground/70 italic text-center px-4">
          「{currentQ.target_quote}」
        </div>

        {/* AI Question - Left bubble */}
        <div className="flex justify-start">
          <div className="text-sm leading-relaxed px-4 py-3 rounded-2xl rounded-tl-none bg-muted max-w-[85%]">
            {currentQ.question}
          </div>
        </div>

      {/* Phase: Answering - Chat input style */}
      {phase === 'answering' && (
        <div className="flex justify-end">
          <div className="w-full max-w-[85%] space-y-2">
            <Textarea 
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="輸入你的想法..."
              className="min-h-[100px] resize-none bg-primary/5 border-primary/20 focus:border-primary/40"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleSubmitResponse} 
                disabled={response.length < 10}
                size="sm"
                className="gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                送出
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Phase: Loading - Waiting for AI feedback */}
      {phase === 'loading' && (
        <>
          {/* User Response - Right */}
          <div className="flex justify-end">
            <div className="text-sm leading-relaxed px-4 py-3 rounded-2xl rounded-tr-none bg-primary text-primary-foreground max-w-[85%] whitespace-pre-wrap">
              {response}
            </div>
          </div>

          {/* AI Typing - Left */}
          <div className="flex justify-start">
            <div className="text-sm px-4 py-3 rounded-2xl rounded-tl-none bg-muted max-w-[85%]">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs">思考中...</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Phase: Feedback - Show AI feedback and decision buttons */}
      {phase === 'feedback' && (
        <>
          {/* User Response - Right */}
          <div className="flex justify-end">
            <div className="text-sm leading-relaxed px-4 py-3 rounded-2xl rounded-tr-none bg-primary text-primary-foreground max-w-[85%] whitespace-pre-wrap">
              {currentSaved?.response || response}
            </div>
          </div>

          {/* AI Feedback - Left */}
          <div className="flex justify-start">
            <div className="text-sm leading-relaxed px-4 py-3 rounded-2xl rounded-tl-none bg-muted max-w-[85%]">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <Markdown>{dialecticalFeedback || currentQ.ai_hidden_reasoning}</Markdown>
              </div>
            </div>
          </div>

          {/* Decision - Centered */}
          <div className="flex justify-center pt-2">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleDecision('agree')}
                className="gap-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span className="text-xs">採納建議</span>
              </Button>
              <span className="text-muted-foreground/30">|</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleDecision('disagree')}
                className="gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span className="text-xs">保留原觀點</span>
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Phase: Completed - Show final state for this question */}
      {phase === 'completed' && (
        <>
          {/* User Response - Right */}
          <div className="flex justify-end">
            <div className="text-sm leading-relaxed px-4 py-3 rounded-2xl rounded-tr-none bg-primary text-primary-foreground max-w-[85%] whitespace-pre-wrap">
              {currentSaved?.response || response}
            </div>
          </div>

          {/* AI Feedback - Left */}
          <div className="flex justify-start">
            <div className="text-sm leading-relaxed px-4 py-3 rounded-2xl rounded-tl-none bg-muted max-w-[85%]">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <Markdown>{currentSaved?.dialecticalFeedback || dialecticalFeedback || currentQ.ai_hidden_reasoning}</Markdown>
              </div>
            </div>
          </div>

          {/* Decision indicator */}
          <div className="flex justify-center">
            <span className={cn(
              'text-xs px-2 py-1 rounded-full',
              currentSaved?.studentDecision === 'agree' 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground bg-muted'
            )}>
              {currentSaved?.studentDecision === 'agree' ? '已採納建議' : '保留原觀點'}
            </span>
          </div>
        </>
      )}
      </div>

      {/* Navigation Footer */}
      {phase === 'completed' && (
        <div className="px-4 py-3 border-t flex gap-2">
          {currentIdx > 0 && (
            <Button variant="ghost" size="sm" onClick={() => goToQuestion(currentIdx - 1)} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" />
              上一題
            </Button>
          )}
          <Button size="sm" onClick={handleNext} className="flex-1">
            {allCompleted ? '查看摘要' : '下一題'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { SparringQuestion, ProvocationStrategy, SparringResponseData } from '@/types/grading';
import { CheckCircle2, ChevronRight, ChevronLeft, List, ThumbsUp, ThumbsDown, Loader2, Send, ArrowRight } from 'lucide-react';
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

    // 計算「包含這次選擇」的完成數
    // 不能用 responsesMap state（非同步），要手動計算
    const previouslyCompleted = Array.from(responsesMap.values())
      .filter(r => r.studentDecision).length;
    const isThisNewDecision = !responsesMap.get(currentIdx)?.studentDecision;
    const newCompletedCount = previouslyCompleted + (isThisNewDecision ? 1 : 0);

    // 判斷是否全部完成 → 自動跳轉 Summary
    if (newCompletedCount >= questions.length) {
      logEvent('REVEAL_SCORE', {
        totalQuestions: questions.length,
        totalResponses: newCompletedCount,
        decisions: Array.from(responsesMap.values()).map(r => ({
          question: r.questionIndex,
          decision: r.studentDecision,
        })),
      });
      // 稍微延遲讓用戶看到「已完成」狀態
      setTimeout(() => {
        setViewMode('summary');
      }, 500);
    } else {
      // 還有未完成 → 自動跳到下一個未完成的問題
      setTimeout(() => {
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
            if (i === currentIdx) continue; // 跳過當前題（剛完成）
            const saved = responsesMap.get(i);
            if (!saved || !saved.studentDecision) {
              nextIdx = i;
              break;
            }
          }
        }
        if (nextIdx < questions.length) {
          setCurrentIdx(nextIdx);
        }
      }, 300);
    }
  };

  const handleManualNext = () => {
    const nextIdx = (currentIdx + 1) % questions.length;
    setCurrentIdx(nextIdx);
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
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {completedCount} / {questions.length}
            </span>
            {allCompleted && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={onComplete} 
                      size="icon"
                      className="h-8 w-8 rounded-full bg-[#E07A5F] hover:bg-[#D2691E] text-white shadow-md transition-all hover:scale-110"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>查看評分</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Summary List - Refactored for cleanliness */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {questions.map((q, idx) => {
            const saved = responsesMap.get(idx);
            const isCompleted = saved?.studentDecision;
            const isAgree = saved?.studentDecision === 'agree';

            return (
              <div 
                key={idx}
                onClick={() => goToQuestion(idx)}
                className="group flex items-center gap-4 p-4 rounded-2xl bg-white border border-border/50 hover:border-[#E07A5F]/50 hover:shadow-sm transition-all cursor-pointer dark:bg-zinc-900/50"
              >
                {/* Question Number */}
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  isCompleted 
                    ? isAgree ? "bg-[#2B2B2B] text-white" : "bg-muted text-muted-foreground"
                    : "bg-[#E07A5F]/10 text-[#E07A5F]"
                )}>
                  {isCompleted ? (
                     isAgree ? <ThumbsUp className="w-5 h-5" /> : <ThumbsDown className="w-5 h-5" />
                  ) : (
                    idx + 1
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate mb-1 pr-4">{q.question}</p>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      isCompleted
                        ? isAgree 
                          ? "bg-[#2B2B2B]/10 text-[#2B2B2B] dark:bg-white/10 dark:text-white"
                          : "bg-muted text-muted-foreground"
                        : "bg-[#E07A5F]/10 text-[#E07A5F]"
                    )}>
                      {isCompleted 
                        ? (isAgree ? '已採納建議' : '保留原觀點') 
                        : '未完成'
                      }
                    </span>
                    {saved?.decisionAt && (
                      <span className="text-[10px] text-muted-foreground/60">
                        {new Date(saved.decisionAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-[#E07A5F] transition-colors" />
              </div>
            );
          })}
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
        
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
               <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => currentIdx > 0 && goToQuestion(currentIdx - 1)} 
                  disabled={currentIdx === 0}
                  className="rounded-full h-8 w-8 hover:bg-muted text-muted-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>上一題</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
               <TooltipTrigger asChild>
                <Button 
                  variant="ghost"
                  size="icon" 
                  onClick={handleManualNext} 
                  className="rounded-full h-8 w-8 hover:bg-muted text-muted-foreground"
                >
                   <ChevronRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>下一題</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {completedCount > 0 && (
             <TooltipProvider>
              <Tooltip>
                 <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode('summary')}
                    className="rounded-full h-8 w-8 hover:bg-muted text-muted-foreground"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>查看總覽</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
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
            <div className="flex justify-end pt-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={handleSubmitResponse} 
                      disabled={response.length < 10}
                      size="icon"
                      className="h-12 w-12 rounded-full border-0 bg-[#E07A5F] text-white shadow-lg transition-transform hover:scale-110 hover:bg-[#D2691E] disabled:bg-gray-300 disabled:shadow-none dark:bg-[#E87D3E] dark:hover:bg-[#D2691E]"
                    >
                      <Send className="h-6 w-6 ml-0.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>發送回應 (至少10字)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="text-xs">思考中</span>
                <span className="flex gap-[2px] pt-[2px]">
                  <span className="w-1 h-1 bg-current rounded-full animate-dot" />
                  <span className="w-1 h-1 bg-current rounded-full animate-dot" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-current rounded-full animate-dot" style={{ animationDelay: '300ms' }} />
                </span>
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
          <div className="flex justify-center pt-4 pb-2">
            <div className="flex items-center gap-8">
              {/* Disagree - Neutral/Outline */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon"
                      onClick={() => handleDecision('disagree')}
                      className="h-14 w-14 rounded-full border-2 border-[#2B2B2B] bg-white text-[#2B2B2B] shadow-lg transition-transform hover:scale-110 hover:bg-gray-50 dark:border-gray-200 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <ThumbsDown className="h-7 w-7" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>保留原觀點</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Agree - Primary/Dark */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon"
                      onClick={() => handleDecision('agree')}
                      className="h-14 w-14 rounded-full border-0 bg-[#2B2B2B] text-white shadow-lg transition-transform hover:scale-110 hover:bg-[#D2691E] dark:bg-white dark:text-black dark:hover:bg-[#E87D3E]"
                    >
                      <ThumbsUp className="h-7 w-7 pb-0.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>採納建議</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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

    </div>
  );
}

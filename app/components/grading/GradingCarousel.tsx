import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  type CarouselApi 
} from '@/components/ui/carousel';
import { SparringInterface } from './SparringInterface';
import { GradingResultDisplay } from './GradingResultDisplay';
import { BrainCircuit, FileText, Lock } from 'lucide-react';
import type { SparringQuestion, GradingResultData, SparringResponseData } from '@/types/grading';

export type { SparringResponseData } from '@/types/grading';

interface GradingCarouselProps {
  // Sparring props
  sparringQuestions?: SparringQuestion[];
  savedResponses?: SparringResponseData[];
  onSparringComplete: () => void;
  onSparringResponse?: (data: SparringResponseData) => void;
  
  // 新增：用於 API 呼叫
  assignmentId?: string;
  sessionId?: string;
  
  // Grading result props
  result?: GradingResultData;
  normalizedScore?: number | null;
  thoughtSummary?: string | null;
  thinkingProcess?: string | null;
  gradingRationale?: string | null;
  isLoading?: boolean;
  
  className?: string;
}

export function GradingCarousel({
  sparringQuestions,
  savedResponses,
  onSparringComplete,
  onSparringResponse,
  assignmentId,
  sessionId,
  result,
  normalizedScore,
  thoughtSummary,
  thinkingProcess,
  gradingRationale,
  isLoading,
  className,
}: GradingCarouselProps) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [sparringCompleted, setSparringCompleted] = React.useState(false);
  
  const hasSparring = sparringQuestions && sparringQuestions.length > 0;
  const hasResult = !!result;
  
  // Check if sparring is already completed (all questions have decisions)
  const isSparringCompleted = React.useMemo(() => {
    if (!hasSparring) return true;
    if (!savedResponses || savedResponses.length === 0) return sparringCompleted;
    // 改用 studentDecision 判斷是否完成
    const allDecided = savedResponses.every(r => r.studentDecision);
    return savedResponses.length >= sparringQuestions!.length && allDecided;
  }, [hasSparring, savedResponses, sparringQuestions, sparringCompleted]);
  
  // Can navigate to result tab only if sparring is completed
  const canViewResult = isSparringCompleted;
  
  // Update current slide index
  React.useEffect(() => {
    if (!api) return;
    
    setCurrent(api.selectedScrollSnap());
    
    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);
  
  // Handle sparring completion
  const handleSparringComplete = React.useCallback(() => {
    setSparringCompleted(true);
    onSparringComplete();
    // Auto-switch to result tab
    setTimeout(() => {
      api?.scrollTo(1);
    }, 300);
  }, [api, onSparringComplete]);
  
  // If no sparring questions and no result, show empty state via GradingResultDisplay
  if (!hasSparring && !hasResult && !isLoading) {
    return (
      <GradingResultDisplay
        result={result}
        isLoading={isLoading}
        className={className}
      />
    );
  }
  
  // If only loading or result (no sparring), show grading display only
  if (!hasSparring) {
    return (
      <GradingResultDisplay
        result={result}
        normalizedScore={normalizedScore}
        thoughtSummary={thoughtSummary}
        thinkingProcess={thinkingProcess}
        gradingRationale={gradingRationale}
        isLoading={isLoading}
        className={className}
      />
    );
  }
  
  // Build slides array
  const slides = [
    { id: 'sparring', label: '對練', icon: BrainCircuit, locked: false },
    { id: 'result', label: '評分', icon: FileText, locked: !canViewResult },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Tab-style Navigation */}
      <div className="flex items-center gap-1 p-1.5 bg-[#2B2B2B]/5 dark:bg-white/5 rounded-xl border border-border/50">
        {slides.map((slide, idx) => {
          const Icon = slide.icon;
          const isActive = current === idx;
          const isLocked = slide.locked;
          
          return (
            <button
              key={slide.id}
              onClick={() => {
                if (!isLocked) {
                  api?.scrollTo(idx);
                }
              }}
              disabled={isLocked}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive 
                  ? 'bg-[#E07A5F] text-white shadow-md dark:bg-[#E87D3E]' 
                  : isLocked
                    ? 'text-muted-foreground/40 cursor-not-allowed'
                    : 'text-muted-foreground hover:text-foreground hover:bg-[#2B2B2B]/5 dark:hover:bg-white/5'
              )}
            >
              {isLocked ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Icon className={cn('w-4 h-4', isActive && 'text-white')} />
              )}
              <span>{slide.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Carousel Content */}
      <Carousel
        setApi={setApi}
        opts={{
          align: 'start',
          loop: false,
          watchDrag: canViewResult, // Disable drag when sparring not completed
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {/* Sparring Slide */}
          <CarouselItem className="pl-0">
            <SparringInterface
              questions={sparringQuestions}
              savedResponses={savedResponses}
              onComplete={handleSparringComplete}
              onResponse={onSparringResponse}
              assignmentId={assignmentId}
              sessionId={sessionId}
            />
          </CarouselItem>
          
          {/* Result Slide */}
          <CarouselItem className="pl-0">
            <GradingResultDisplay
              result={result}
              normalizedScore={normalizedScore}
              thoughtSummary={thoughtSummary}
              thinkingProcess={thinkingProcess}
              gradingRationale={gradingRationale}
              isLoading={isLoading}
            />
          </CarouselItem>
        </CarouselContent>
      </Carousel>
      
      {/* Dot Indicators */}
      <div className="flex items-center justify-center gap-2">
        {slides.map((slide, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (!slide.locked) {
                api?.scrollTo(idx);
              }
            }}
            disabled={slide.locked}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              current === idx ? 'bg-foreground' : 'bg-muted-foreground/30'
            )}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

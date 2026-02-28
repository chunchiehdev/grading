import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { Button } from '@/components/ui/button';
import { Loader2, Send, ChevronDown, ChevronRight, BrainCircuit, Pencil, CheckCircle2, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type SparringQuestion } from '@/types/grading';
import { getKemberRubricTemplate } from '@/utils/kember-rubric-template';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/ui/markdown';
import { Textarea } from '@/components/ui/textarea';

const TRIGGER_MSG_ID = '__sparring_trigger__';

interface UiChatPart {
  type?: string;
  text?: string;
}

interface UiChatMessage {
  id?: string;
  role?: string;
  content?: string;
  parts?: UiChatPart[];
}

function getMessageText(message: UiChatMessage): string {
  if (message.content) return message.content;
  if (!message.parts || message.parts.length === 0) return '';

  return message.parts
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
}

function normalizeChatTypography(text: string): string {
  return text
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '');
}

// ── Direction 2: Kember Level from score ratio ────────────────────────────
function getKemberLevel(score: number, maxScore: number) {
  const pct = maxScore > 0 ? score / maxScore : 0;
  if (pct >= 0.8)
    return { level: 4, label: 'L4', descKey: 'grading:chat.kember.level4', colorClass: 'border border-primary/30 bg-primary/10 text-primary' };
  if (pct >= 0.6)
    return { level: 3, label: 'L3', descKey: 'grading:chat.kember.level3', colorClass: 'border border-accent-foreground/20 bg-accent text-accent-foreground' };
  if (pct >= 0.4)
    return { level: 2, label: 'L2', descKey: 'grading:chat.kember.level2', colorClass: 'border border-muted-foreground/20 bg-muted text-muted-foreground' };
  return { level: 1, label: 'L1', descKey: 'grading:chat.kember.level1', colorClass: 'border border-destructive/30 bg-destructive/10 text-destructive' };
}

export interface SparringState {
  activeQuestionIndex: number;
  completedQuestionIndices: number[];
  phase: 'chat' | 'summary';
}

// ── Props ─────────────────────────────────────────────────────────────────
interface FeedbackChatProps {
  sparringQuestions: SparringQuestion[]; // Direction 1: all questions, not just [0]
  assignmentId: string;
  sessionId: string;
  result: any;
  studentName?: string;
  studentPicture?: string | null;
  fileId?: string;
  /** Per-question conversation map: { [questionIdx]: messages[] } */
  initialConversationsMap?: Record<number, any[]>;
  thinkingProcess?: string | null;
  gradingRationale?: string | null;
  normalizedScore?: number | null;
  maxRounds?: number;
  /** Emits the FULL conversations map (all questions) whenever messages change */
  onChatChange?: (conversationsMap: Record<number, any[]>) => void;
  onSparringComplete?: () => void;
  initialSparringState?: SparringState;
  onSparringStateChange?: (state: SparringState) => void;
}

export function FeedbackChat({
  sparringQuestions,
  assignmentId,
  sessionId,
  result,
  fileId,
  initialConversationsMap,
  thinkingProcess,
  gradingRationale,
  normalizedScore,
  maxRounds = 5,
  onChatChange,
  onSparringComplete,
  initialSparringState,
  onSparringStateChange,
}: FeedbackChatProps) {
  const { t, i18n } = useTranslation(['grading', 'common']);
  const uiLanguage = i18n.language.startsWith('zh') ? 'zh' : 'en';
  const triggerText = t('grading:chat.triggerText');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [input, setInput] = useState('');
  const hasSentOpening = useRef(false);

  // ── Direction 1: Multi-question management ─────────────────────────────
  const [activeIdx, setActiveIdx] = useState(
    initialSparringState?.activeQuestionIndex ?? 0
  );
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(
    () => new Set(initialSparringState?.completedQuestionIndices ?? [])
  );
  // Per-question conversation memory: { 0: messages[], 1: messages[], … }
  // Initialize from persisted data (excluding activeIdx which will be loaded via setMessages)
  const [conversationsMap, setConversationsMap] = useState<Record<number, any[]>>(() => {
    if (!initialConversationsMap) return {};
    // Store all saved conversations EXCEPT the active question's
    // (the active question's messages will be loaded via setMessages in the init effect)
    const { [initialSparringState?.activeQuestionIndex ?? 0]: _, ...rest } = initialConversationsMap;
    return rest;
  });

  // ── Direction 3: Revision box ──────────────────────────────────────────
  const [showRevisionBox, setShowRevisionBox] = useState(false);
  const [revisionDraft, setRevisionDraft] = useState('');

  // ── Direction 4: Growth summary ────────────────────────────────────────
  const [chatPhase, setChatPhase] = useState<'chat' | 'summary'>(
    initialSparringState?.phase ?? 'chat'
  );
  const sparringCompleteFired = useRef(false);

  // 控制是否已經正式開始對練（避免一載入頁面就打第一發給 Gemini）
  const [hasStarted, setHasStarted] = useState<boolean>(
    () => !!(initialConversationsMap && Object.keys(initialConversationsMap).length > 0) || !!initialSparringState
  );

  // Sheet detail (criteria / thinking process)
  const [selectedDetail, setSelectedDetail] = useState<{
    type: 'criterion' | 'thinking';
    title: string;
    badge?: string;
    badgeColor?: 'green' | 'amber' | 'red' | 'muted';
    content: string;
  } | null>(null);

  const activeQuestion = sparringQuestions[activeIdx] ?? sparringQuestions[0];

  // ── Direction 2: Kember level helpers ─────────────────────────────────
  const getQuestionKemberLevel = useCallback(
    (question: SparringQuestion) => {
      const item = result?.breakdown?.find(
        (b: any) =>
          b.criteriaId === question.related_rubric_id ||
          b.name === question.related_rubric_id
      );
      if (!item) return null;
      return getKemberLevel(item.score, item.maxScore ?? 4);
    },
    [result?.breakdown]
  );

  const activeKemberLevel = useMemo(
    () => getQuestionKemberLevel(activeQuestion),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeQuestion, getQuestionKemberLevel]
  );

  const criterionBreakdown = result?.breakdown?.find(
    (b: any) =>
      b.criteriaId === activeQuestion.related_rubric_id ||
      b.name === activeQuestion.related_rubric_id
  );

  const kemberTemplate = getKemberRubricTemplate(uiLanguage);
  let defaultCriterionContext = null;
  if (kemberTemplate.categories[0]?.criteria[0]) {
    defaultCriterionContext = {
      name: kemberTemplate.categories[0].criteria[0].name,
      description: kemberTemplate.categories[0].criteria[0].description,
      levels: kemberTemplate.categories[0].criteria[0].levels,
    };
  }

  const rubricCriterionName = criterionBreakdown?.name || defaultCriterionContext?.name;
  const rubricCriterionDesc = defaultCriterionContext?.description;
  const rubricCriterionLevels = defaultCriterionContext?.levels;

  const chatContext = useMemo(
    () => ({
      rubricCriterionName,
      rubricCriterionDesc,
      rubricCriterionLevels,
      sparringQuestion: {
        ai_hidden_reasoning: activeQuestion.ai_hidden_reasoning,
        question: activeQuestion.question,
        target_quote: activeQuestion.target_quote,
      },
      // Direction 2: send current Kember level to backend
      currentKemberLevel: activeKemberLevel,
      fileId,
      assignmentId,
      gradingSessionId: sessionId,
      language: uiLanguage,
    }),
    [
      rubricCriterionName,
      rubricCriterionDesc,
      rubricCriterionLevels,
      activeQuestion,
      activeKemberLevel,
      fileId,
      assignmentId,
      sessionId,
      uiLanguage,
    ]
  );

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: '/api/grading/chat',
        body: () => ({ context: chatContext }),
      }),
    [chatContext]
  );

  const { messages, status, sendMessage, setMessages } = useChat({
    transport,
    onError: (error) => {
      console.error('[FeedbackChat] Error:', error);
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const userRoundCount = useMemo(
    () => messages.filter((m) => m.role === 'user' && m.id !== TRIGGER_MSG_ID).length,
    [messages]
  );
  const isCurrentQuestionComplete = userRoundCount >= maxRounds;

  // Mark question done when rounds exhausted
  useEffect(() => {
    if (isCurrentQuestionComplete && !completedQuestions.has(activeIdx)) {
      setCompletedQuestions((prev) => new Set(prev).add(activeIdx));
    }
  }, [isCurrentQuestionComplete, activeIdx, completedQuestions]);

  // Persist sparring progress (for draft restore)
  useEffect(() => {
    if (!onSparringStateChange) return;
    const completed = Array.from(completedQuestions.values()).sort((a, b) => a - b);
    onSparringStateChange({
      activeQuestionIndex: activeIdx,
      completedQuestionIndices: completed,
      phase: chatPhase,
    });
  }, [activeIdx, completedQuestions, chatPhase, onSparringStateChange]);

  // ── Direction 1: Switch question ───────────────────────────────────────
  const handleSwitchQuestion = useCallback(
    (idx: number) => {
      if (idx === activeIdx) return;
      // Save current question's messages before switching
      setConversationsMap((prev) => ({ ...prev, [activeIdx]: messages }));
      // Restore from conversationsMap first, then from persisted data
      const saved = conversationsMap[idx] ?? initialConversationsMap?.[idx] ?? [];
      setMessages(saved as any);
      hasSentOpening.current = saved.length > 0;
      setActiveIdx(idx);
      setShowRevisionBox(false);
      setRevisionDraft('');
    },
    [activeIdx, messages, conversationsMap, initialConversationsMap, setMessages]
  );

  // Initialize opening - 僅在 hasStarted 為 true 時才會送出第一個 trigger
  useEffect(() => {
    if (!hasStarted) return;
    if (messages.length === 0 && !hasSentOpening.current) {
      // Restore from persisted data for the CURRENT activeIdx (works for any question, not just 0)
      const savedForActive = initialConversationsMap?.[activeIdx];
      if (savedForActive && savedForActive.length > 0) {
        setMessages(savedForActive as any);
        hasSentOpening.current = true;
      } else {
        hasSentOpening.current = true;
        sendMessage({
          text: triggerText,
        });
      }
    }
  }, [hasStarted, messages.length, setMessages, sendMessage, initialConversationsMap, activeIdx, triggerText]);

  const prevMessagesRef = useRef<string>('');
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (onChatChange && messages) {
      const str = JSON.stringify(messages);
      if (prevMessagesRef.current !== str) {
        prevMessagesRef.current = str;
        // Emit the FULL conversations map: merge conversationsMap + current active question
        const fullMap: Record<number, any[]> = { ...conversationsMap, [activeIdx]: messages };
        onChatChange(fullMap);
      }
    }
  }, [messages, onChatChange, conversationsMap, activeIdx]);

  // Auto-resize input textarea (like community comment box)
  const adjustInputHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  useEffect(() => {
    adjustInputHeight();
  }, [input, adjustInputHeight]);

  useLayoutEffect(() => {
    // 保證初次 render 時高度正確，且游標在輸入框
    requestAnimationFrame(() => {
      adjustInputHeight();
      inputRef.current?.focus();
    });
  }, [adjustInputHeight]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading || isCurrentQuestionComplete) return;
      sendMessage({ text: input.trim() });
      setInput('');
    },
    [input, isLoading, isCurrentQuestionComplete, sendMessage]
  );

  // ── Direction 3: Submit revision as a chat message ─────────────────────
  const handleSubmitRevision = useCallback(() => {
    if (!revisionDraft.trim() || isLoading) return;
        const original = activeQuestion.target_quote;
    sendMessage({
      text: t('grading:chat.revision.submissionMessage', {
        original,
        revised: revisionDraft.trim(),
      }),
    });
    setRevisionDraft('');
    setShowRevisionBox(false);
  }, [revisionDraft, isLoading, activeQuestion.target_quote, sendMessage, t]);

  // ── Direction 4: Finish sparring → show summary ────────────────────────
  const handleFinishSparring = useCallback(() => {
    setChatPhase('summary');
  }, []);

  const visibleMessages = useMemo(
    () =>
      messages.filter((m) => {
        if (m.id === TRIGGER_MSG_ID) return false;
        const content = normalizeChatTypography(getMessageText(m as UiChatMessage)).trim();
        if (!content) return false;
        if (content === normalizeChatTypography(triggerText)) return false;
        return true;
      }),
    [messages, triggerText]
  );

  // ── Shared: score collapsible ──────────────────────────────────────────
  const scoreCollapsible = result && (
    <>
      <Collapsible className="flex-shrink-0 border-b border-border group">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'text-lg font-bold tabular-nums',
                  (normalizedScore ?? 0) >= 80
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : (normalizedScore ?? 0) >= 60
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                )}
              >
                {result.totalScore}/{result.maxScore}
              </span>
              
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t('grading:chat.showDetails')}</span>
              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 sm:px-6 pb-3 max-h-[50vh] overflow-y-auto space-y-1">
            {result.overallFeedback && (
              <div className="py-3 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t('grading:result.overallFeedback')}
                </p>
                <p className="text-sm text-foreground leading-relaxed">{result.overallFeedback}</p>
              </div>
            )}
            {(thinkingProcess || gradingRationale) && (
              <div className="pt-2">
                <div className="rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() =>
                      setSelectedDetail({
                        type: 'thinking',
                        title: t('grading:thinkingProcess.viewProcess'),
                        content: thinkingProcess || gradingRationale || '',
                      })
                    }
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/50 transition-colors group/item"
                  >
                    <BrainCircuit className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {t('grading:thinkingProcess.viewProcess')}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
            )}
            {result.breakdown && result.breakdown.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t('grading:result.criteriaDetails')}
                </p>
                <div className="rounded-xl border border-border overflow-hidden">
                  {result.breakdown.map((item: any, idx: number) => {
                    const ratio = item.maxScore > 0 ? item.score / item.maxScore : 0;
                    const color: 'green' | 'amber' | 'red' =
                      ratio >= 0.8 ? 'green' : ratio >= 0.6 ? 'amber' : 'red';
                    return (
                      <button
                        key={item.criteriaId || idx}
                        onClick={() =>
                          setSelectedDetail({
                            type: 'criterion',
                            title: item.name,
                            badge: `${item.score}${item.maxScore != null ? `/${item.maxScore}` : ''}`,
                            badgeColor: color,
                            content: item.feedback,
                          })
                        }
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/50 transition-colors border-b border-border last:border-b-0 group/item"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {idx + 1}. {item.name}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'flex-shrink-0 tabular-nums',
                            color === 'green'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : color === 'amber'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          )}
                        >
                          {item.score}{item.maxScore != null ? `/${item.maxScore}` : ''}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Sheet open={!!selectedDetail} onOpenChange={(open) => !open && setSelectedDetail(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="text-left pb-4">
            <SheetTitle className="text-base font-semibold flex items-center gap-2">
              {selectedDetail?.type === 'thinking' && (
                <BrainCircuit className="h-4 w-4 text-muted-foreground" />
              )}
              {selectedDetail?.title}
            </SheetTitle>
            {selectedDetail?.badge && (
              <SheetDescription asChild>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'tabular-nums',
                      selectedDetail.badgeColor === 'green'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : selectedDetail.badgeColor === 'amber'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : selectedDetail.badgeColor === 'red'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : ''
                    )}
                  >
                    {selectedDetail.badge}
                  </Badge>
                </div>
              </SheetDescription>
            )}
          </SheetHeader>
          {selectedDetail?.content && (
            <div className="pb-6 space-y-2">
              {selectedDetail.type === 'criterion' && (
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                   {t('grading:result.feedback')}
                </h4>
              )}
              <div className="text-sm leading-relaxed text-foreground prose prose-sm dark:prose-invert max-w-none">
                <Markdown>{selectedDetail.content}</Markdown>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // Direction 4: Growth Summary Screen
  // ═══════════════════════════════════════════════════════════════════════
  if (chatPhase === 'summary') {
    return (
      <div className="h-full flex flex-col">
        {scoreCollapsible}

        <div className="flex-1 overflow-y-auto p-4 sm:px-6 space-y-4">
          <div className="flex items-center gap-3 pt-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
               <h2 className="text-base font-semibold text-foreground">{t('grading:chat.summary.title')}</h2>
               <p className="text-xs text-muted-foreground">{t('grading:chat.summary.subtitle')}</p>
            </div>
          </div>

          {sparringQuestions.map((q, idx) => {
            const kLevel = getQuestionKemberLevel(q);
            const breakdownItem = result?.breakdown?.find(
              (b: any) => b.criteriaId === q.related_rubric_id || b.name === q.related_rubric_id
            );
            const isDiscussed =
              completedQuestions.has(idx) || (idx === activeIdx && userRoundCount > 0);

            return (
              <div
                key={idx}
                className={cn(
                  'rounded-xl border p-4 space-y-2 transition-opacity',
                  isDiscussed ? 'border-border bg-card' : 'border-border/40 bg-muted/20 opacity-50'
                )}
              >
                <div className="flex items-center gap-2">
                  {isDiscussed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                    {breakdownItem?.name || q.related_rubric_id || t('grading:chat.summary.questionFallback', { index: idx + 1 })}
                  </span>
                  {kLevel && (
                    <Badge className={cn('flex-shrink-0 text-xs', kLevel.colorClass)}>
                      {kLevel.label} {t(kLevel.descKey)}
                    </Badge>
                  )}
                </div>
                {isDiscussed && breakdownItem && (
                  <p className="text-xs text-muted-foreground leading-relaxed pl-6 line-clamp-3">
                    {breakdownItem.feedback}
                  </p>
                )}
                {!isDiscussed && (
                  <p className="text-xs text-muted-foreground pl-6">{t('grading:chat.summary.notDiscussed')}</p>
                )}
              </div>
            );
          })}

          

          {sparringQuestions.some((_, idx) => !completedQuestions.has(idx) && idx !== activeIdx) && (
            <button
              onClick={() => setChatPhase('chat')}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              {t('grading:chat.summary.returnToChat')}
            </button>
          )}
        </div>

      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Pre-Start Screen: Wait for user to click "開始對練"
  // ═══════════════════════════════════════════════════════════════════════
  if (!hasStarted) {
    return (
      <div className="h-full flex flex-col">
        {scoreCollapsible}

        <div className="flex-1 flex items-center justify-center px-4 sm:px-6">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <BrainCircuit className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                 {t('grading:chat.startSparring.title')}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                 {t('grading:chat.startSparring.description')}
              </p>
            </div>
            <div className="pt-2">
              <Button
                onClick={() => setHasStarted(true)}
                className="rounded-full px-6 sm:px-8"
              >
                 {t('grading:chat.startSparring.button')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Main Chat Screen
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="h-full flex flex-col">
      {scoreCollapsible}
  
      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 w-full">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 min-h-full flex flex-col">
          <div className="space-y-6 py-6 flex-1">
            {visibleMessages.map((m: any) => {
              const parsedMessage = m as UiChatMessage;
              const messageText = normalizeChatTypography(getMessageText(parsedMessage));

              return (
                <div
                  key={m.id}
                  className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'user' ? (
                    <div className="max-w-[88%] sm:max-w-[82%]">
                      <div className="text-sm whitespace-pre-wrap break-words px-4 py-3 rounded-2xl rounded-br-md bg-primary text-primary-foreground shadow-sm">
                        {messageText}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-[96%] sm:max-w-[92%] space-y-2">
                      <div className="px-1 py-1 text-sm text-foreground leading-relaxed">
                        <div className="prose prose-sm dark:prose-invert max-w-none [&_*]:font-sans [&_p]:leading-relaxed">
                          <Markdown>{messageText}</Markdown>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading &&
              (visibleMessages.length === 0 ||
                visibleMessages[visibleMessages.length - 1]?.role === 'user') && (
                <div className="flex w-full justify-start">
                  <div className="flex items-center gap-2 px-1 py-1">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('grading:chat.thinking')}</span>
                  </div>
                </div>
              )}

            {/* After rounds complete: action bar */}
            {isCurrentQuestionComplete && !isLoading && (
              <div className="flex w-full justify-center py-2">
                <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                  <p className="text-xs text-muted-foreground text-center">{t('grading:chat.currentQuestionCompleted')}</p>
                  <div className="flex gap-2 w-full">
                    {activeIdx < sparringQuestions.length - 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-full text-xs"
                        onClick={() => handleSwitchQuestion(activeIdx + 1)}
                      >
                        {t('grading:chat.nextQuestion')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="flex-1 rounded-full text-xs bg-primary"
                      onClick={handleFinishSparring}
                    >
                      <Trophy className="h-3 w-3 mr-1" />
                      {t('grading:chat.finishSparring')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Direction 3: Revision box */}
      {showRevisionBox && (
        <div className="flex-shrink-0 border-t border-border bg-muted/20 px-4 sm:px-6 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-foreground">{t('grading:chat.revision.title')}</p>
            <button
              onClick={() => setShowRevisionBox(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
               {t('common:cancel')}
            </button>
          </div>
          <p className="text-xs text-muted-foreground italic">
            {t('grading:chat.revision.originalText', { quote: activeQuestion.target_quote })}
          </p>
          <Textarea
            value={revisionDraft}
            onChange={(e) => setRevisionDraft(e.target.value)}
            placeholder={t('grading:chat.revision.placeholder')}
            className="text-sm min-h-[80px] resize-none rounded-xl border-border bg-background"
          />
          <Button
            size="sm"
            disabled={!revisionDraft.trim() || isLoading}
            onClick={handleSubmitRevision}
            className="w-full rounded-full text-xs"
          >
            {t('grading:chat.revision.submit')}
          </Button>
        </div>
      )}

      {/* Input area */}
      {!isCurrentQuestionComplete && (
        <div className="flex-shrink-0 bg-background relative">
          <div
            className="absolute bottom-full left-0 right-0 h-16 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)',
            }}
          />
          <div className="bg-background pb-4">
            <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-3">
              <form
                onSubmit={handleSubmit}
                className={cn(
                  'flex gap-3 bg-muted/40 dark:bg-muted/20 rounded-2xl p-2 transition-all duration-200',
                  'border border-border/50',
                  'focus-within:border-primary/50 focus-within:bg-muted/60 dark:focus-within:bg-muted/30'
                )}
              >
                <div className="flex-1 min-w-0">
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!input.trim() || isLoading || isCurrentQuestionComplete) return;
                        sendMessage({ text: input.trim() });
                        setInput('');
                      }
                    }}
                    placeholder={t('grading:chat.placeholder')}
                    className={cn(
                      'w-full bg-transparent border-0 shadow-none resize-none',
                      'px-4 py-2 text-sm sm:text-base text-foreground placeholder:text-muted-foreground',
                      'focus-visible:ring-0 focus-visible:ring-offset-0',
                      'min-h-[20px] max-h-[200px] overflow-y-auto',
                      'disabled:cursor-not-allowed disabled:opacity-50'
                    )}
                    disabled={isLoading}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    rows={1}
                    style={{ fontSize: '16px', height: 'auto' }}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  size="icon"
                  className="h-11 w-11 rounded-xl shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </form>

              <div className="mt-2 flex items-center justify-between px-1">
                <p className="text-xs text-muted-foreground">
                  {t('grading:chat.disclaimer')} ·{' '}
                    {t('grading:chat.roundsRemaining', {
                     remaining: maxRounds - userRoundCount,
                   })}
                </p>
                
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

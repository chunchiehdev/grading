import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { Button } from '@/components/ui/button';
import { Loader2, Send, ChevronDown, ChevronRight, BrainCircuit, Pencil, CheckCircle2, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type SparringQuestion } from '@/types/grading';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getKemberRubricTemplate } from '@/utils/kember-rubric-template';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/ui/markdown';
import { Textarea } from '@/components/ui/textarea';

const TRIGGER_MSG_ID = '__sparring_trigger__';
const TRIGGER_TEXT = '請根據你在 system prompt 中看到的學生作業跟 sparring question 來開始對話，用口語化、溫暖的方式開場。';

// ── Direction 2: Kember Level from score ratio ────────────────────────────
function getKemberLevel(score: number, maxScore: number) {
  const pct = maxScore > 0 ? score / maxScore : 0;
  if (pct >= 0.8)
    return { level: 4, label: 'L4', desc: '批判性反思', colorClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
  if (pct >= 0.6)
    return { level: 3, label: 'L3', desc: '建設性反思', colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
  if (pct >= 0.4)
    return { level: 2, label: 'L2', desc: '理解反思', colorClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
  return { level: 1, label: 'L1', desc: '習慣性行動', colorClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
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
  initialMessages?: any[];
  thinkingProcess?: string | null;
  gradingRationale?: string | null;
  normalizedScore?: number | null;
  maxRounds?: number;
  onChatChange?: (messages: any[]) => void;
  onSparringComplete?: () => void;
}

export function FeedbackChat({
  sparringQuestions,
  assignmentId,
  sessionId,
  result,
  studentName,
  studentPicture,
  fileId,
  initialMessages,
  thinkingProcess,
  gradingRationale,
  normalizedScore,
  maxRounds = 5,
  onChatChange,
  onSparringComplete,
}: FeedbackChatProps) {
  const { t } = useTranslation(['grading', 'common']);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const hasSentOpening = useRef(false);

  // ── Direction 1: Multi-question management ─────────────────────────────
  const [activeIdx, setActiveIdx] = useState(0);
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(new Set());
  // Per-question conversation memory: { 0: messages[], 1: messages[], … }
  const [conversationsMap, setConversationsMap] = useState<Record<number, any[]>>({});

  // ── Direction 3: Revision box ──────────────────────────────────────────
  const [showRevisionBox, setShowRevisionBox] = useState(false);
  const [revisionDraft, setRevisionDraft] = useState('');

  // ── Direction 4: Growth summary ────────────────────────────────────────
  const [chatPhase, setChatPhase] = useState<'chat' | 'summary'>('chat');
  const sparringCompleteFired = useRef(false);

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

  const kemberTemplate = getKemberRubricTemplate();
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

  // ── Direction 1: Switch question ───────────────────────────────────────
  const handleSwitchQuestion = useCallback(
    (idx: number) => {
      if (idx === activeIdx) return;
      setConversationsMap((prev) => ({ ...prev, [activeIdx]: messages }));
      const saved = conversationsMap[idx] ?? [];
      setMessages(saved as any);
      hasSentOpening.current = saved.length > 0;
      setActiveIdx(idx);
      setShowRevisionBox(false);
      setRevisionDraft('');
    },
    [activeIdx, messages, conversationsMap, setMessages]
  );

  // Initialize opening
  useEffect(() => {
    if (messages.length === 0 && !hasSentOpening.current) {
      if (initialMessages && initialMessages.length > 0 && activeIdx === 0) {
        setMessages(initialMessages as any);
        hasSentOpening.current = true;
      } else {
        hasSentOpening.current = true;
        sendMessage({
          text: TRIGGER_TEXT,
        });
      }
    }
  }, [messages.length, setMessages, sendMessage, initialMessages, activeIdx]);

  const prevMessagesRef = useRef<string>('');
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (onChatChange && messages) {
      const str = JSON.stringify(messages);
      if (prevMessagesRef.current !== str) {
        prevMessagesRef.current = str;
        onChatChange(messages);
      }
    }
  }, [messages, onChatChange]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

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
      text: `我嘗試修改了這段，原句是「${original}」，我改成：「${revisionDraft.trim()}」——你覺得這樣有改善嗎？`,
    });
    setRevisionDraft('');
    setShowRevisionBox(false);
  }, [revisionDraft, isLoading, activeQuestion.target_quote, sendMessage]);

  // ── Direction 4: Finish sparring → show summary ────────────────────────
  const handleFinishSparring = useCallback(() => {
    setChatPhase('summary');
  }, []);

  const visibleMessages = useMemo(
    () =>
      messages.filter((m) => {
        if (m.id === TRIGGER_MSG_ID) return false;
        const content =
          (m as any).content ||
          m.parts
            ?.filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('') ||
          '';
        if (content === TRIGGER_TEXT) return false;
        return true;
      }),
    [messages]
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
              <span className="text-sm text-muted-foreground">{t('grading:chat.scoreBar')}</span>
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
                        title: t('grading:thinkingProcess.viewProcess', '思考過程'),
                        content: thinkingProcess || gradingRationale || '',
                      })
                    }
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/50 transition-colors group/item"
                  >
                    <BrainCircuit className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {t('grading:thinkingProcess.viewProcess', '思考過程')}
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
                  {t('grading:result.feedback', '評語')}
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
        {result && (
          <div className="flex-shrink-0 border-b border-border px-4 sm:px-6 py-3 flex items-center gap-3">
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
            <span className="text-sm text-muted-foreground">{t('grading:chat.scoreBar')}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:px-6 space-y-4">
          <div className="flex items-center gap-3 pt-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">對練完成！你的成長摘要</h2>
              <p className="text-xs text-muted-foreground">根據剛才的對話整理你的反思進展</p>
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
                    {breakdownItem?.name || q.related_rubric_id || `問題 ${idx + 1}`}
                  </span>
                  {kLevel && (
                    <Badge className={cn('flex-shrink-0 text-xs', kLevel.colorClass)}>
                      {kLevel.label} {kLevel.desc}
                    </Badge>
                  )}
                </div>
                {isDiscussed && breakdownItem && (
                  <p className="text-xs text-muted-foreground leading-relaxed pl-6 line-clamp-3">
                    {breakdownItem.feedback}
                  </p>
                )}
                {!isDiscussed && (
                  <p className="text-xs text-muted-foreground pl-6">未討論（可返回繼續）</p>
                )}
              </div>
            );
          })}

          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">下一步建議</p>
            <p className="text-sm text-foreground leading-relaxed">
              試著在修改作業時，針對剛才討論到的每個維度加入更具體的「為什麼」——說明這個經驗如何改變了你的想法，這是從 L2 邁向 L3 的關鍵。
            </p>
          </div>

          {sparringQuestions.some((_, idx) => !completedQuestions.has(idx) && idx !== activeIdx) && (
            <button
              onClick={() => setChatPhase('chat')}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              ← 返回繼續討論其他問題
            </button>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-border bg-background p-4">
          <Button
            onClick={() => {
              if (!sparringCompleteFired.current) {
                sparringCompleteFired.current = true;
                onSparringComplete?.();
              }
            }}
            className="w-full rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-md"
          >
            {t('grading:chat.finishSparring', '完成對練，準備提交作業')}
          </Button>
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

      {/* Direction 2: Active question context + Kember badge */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-2 bg-muted/20 border-b border-border/50">
        <div className="flex items-start gap-2">
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1 min-w-0 italic">
            「{activeQuestion.target_quote}」
          </p>
          {activeKemberLevel && (
            <Badge className={cn('flex-shrink-0 text-xs', activeKemberLevel.colorClass)}>
              {activeKemberLevel.label} {activeKemberLevel.desc}
            </Badge>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 w-full">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 min-h-full flex flex-col">
          <div className="space-y-6 py-6 flex-1">
            {visibleMessages.map((m: any) => (
              <div
                key={m.id}
                className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'user' ? (
                  <div className="flex gap-3 max-w-[80%] flex-row-reverse">
                    <div className="flex-shrink-0 mt-1">
                      <Avatar className="h-8 w-8 border">
                        <AvatarImage src={studentPicture || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {studentName ? studentName.slice(0, 2).toUpperCase() : 'ME'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="text-sm whitespace-pre-wrap break-words px-4 py-3 rounded-2xl rounded-tr-none bg-primary text-primary-foreground">
                      {(m as any).content ||
                        m.parts
                          ?.filter((p: any) => p.type === 'text')
                          .map((p: any) => p.text)
                          .join('') ||
                        ''}
                    </div>
                  </div>
                ) : (
                  <div className="w-full space-y-2">
                    <div className="text-sm text-foreground leading-relaxed pl-9">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Markdown>
                          {(m as any).content ||
                            m.parts
                              ?.filter((p: any) => p.type === 'text')
                              .map((p: any) => p.text)
                              .join('') ||
                            ''}
                        </Markdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading &&
              (visibleMessages.length === 0 ||
                visibleMessages[visibleMessages.length - 1]?.role === 'user') && (
                <div className="flex w-full justify-start">
                  <div className="flex items-center gap-2 pl-9">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('grading:chat.thinking')}</span>
                  </div>
                </div>
              )}

            {/* After rounds complete: action bar */}
            {isCurrentQuestionComplete && !isLoading && (
              <div className="flex w-full justify-center py-2">
                <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                  <p className="text-xs text-muted-foreground text-center">這個問題已討論完畢</p>
                  <div className="flex gap-2 w-full">
                    {activeIdx < sparringQuestions.length - 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-full text-xs"
                        onClick={() => handleSwitchQuestion(activeIdx + 1)}
                      >
                        下一個問題 →
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="flex-1 rounded-full text-xs bg-primary"
                      onClick={handleFinishSparring}
                    >
                      <Trophy className="h-3 w-3 mr-1" />
                      完成對練
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
            <p className="text-xs font-medium text-foreground">試著修改這段文字</p>
            <button
              onClick={() => setShowRevisionBox(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
          </div>
          <p className="text-xs text-muted-foreground italic">
            原文：「{activeQuestion.target_quote}」
          </p>
          <Textarea
            value={revisionDraft}
            onChange={(e) => setRevisionDraft(e.target.value)}
            placeholder="輸入你修改後的版本..."
            className="text-sm min-h-[80px] resize-none rounded-xl border-border bg-background"
          />
          <Button
            size="sm"
            disabled={!revisionDraft.trim() || isLoading}
            onClick={handleSubmitRevision}
            className="w-full rounded-full text-xs"
          >
            送出修改，請 AI 給我回饋
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
            <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3">
              <form
                onSubmit={handleSubmit}
                className={cn(
                  'flex gap-3 bg-muted/40 dark:bg-muted/20 rounded-2xl p-2 transition-all duration-200',
                  'border border-border/50',
                  'focus-within:border-primary/50 focus-within:bg-muted/60 dark:focus-within:bg-muted/30'
                )}
              >
                <div className="flex-1 min-w-0">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t('grading:chat.placeholder')}
                    className={cn(
                      'w-full bg-transparent px-4 py-3 text-sm sm:text-base placeholder:text-muted-foreground/60',
                      'focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'
                    )}
                    disabled={isLoading}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    style={{ fontSize: '16px' }}
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
                    defaultValue: `剩餘 ${maxRounds - userRoundCount} 輪`,
                  })}
                </p>
                {/* Direction 3: Revision toggle */}
                {!showRevisionBox && visibleMessages.length >= 2 && (
                  <button
                    onClick={() => setShowRevisionBox(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    試著改改看
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

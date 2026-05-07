import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  W3CTextFormat,
  UserSelectAction,
  createTextAnnotator,
  type TextAnnotator,
  type TextAnnotation,
  type W3CTextAnnotation,
  type W3CTextPositionSelector,
  type W3CTextQuoteSelector,
} from '@recogito/text-annotator';
import '@recogito/text-annotator/text-annotator.css';
import { Markdown } from '@/components/ui/markdown';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Check, MessageSquare, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  createIdentitySubmissionTextNormalization,
  normalizeSubmissionText,
  type SubmissionTextNormalizationResult,
} from '@/utils/submission-text-normalization';
import { markdownToPlainText } from '@/utils/markdown-plain-text';
import type { SubmissionAiFeedbackCommentView } from '@/types/teacher';

interface AnnotatableFeedbackProps {
  submissionId: string;
  targetType: string;
  targetId: string;
  content: string;
  comments: SubmissionAiFeedbackCommentView[];
  readOnly?: boolean;
  contentFormat?: 'markdown' | 'plainText';
  annotationLayout?: 'side' | 'stacked';
}

interface FloatingButtonPosition {
  top: number;
  left: number;
}

interface SavedAnnotationMapEntry {
  annotation: W3CTextAnnotation;
  comment: SubmissionAiFeedbackCommentView;
}

const ANNOTATION_PURPOSE = 'commenting';
const CARD_APPROX_HEIGHT = 96;
const CARD_GAP = 8;

function getAnnotationQuote(annotation: W3CTextAnnotation): string | null {
  const targets = Array.isArray(annotation.target) ? annotation.target : [annotation.target];
  const selectors = targets.flatMap((t) => (Array.isArray(t.selector) ? t.selector : [t.selector]));
  const quoteSelector = selectors.find((s): s is W3CTextQuoteSelector => s.type === 'TextQuoteSelector');
  return quoteSelector?.exact?.trim() || null;
}

function getPendingAnnotationQuote(annotation: W3CTextAnnotation | null): string | null {
  return annotation ? getAnnotationQuote(annotation) : null;
}

function getAnnotationOffsets(annotation: W3CTextAnnotation): { start: number; end: number } | null {
  const targets = Array.isArray(annotation.target) ? annotation.target : [annotation.target];
  const selectors = targets.flatMap((t) => (Array.isArray(t.selector) ? t.selector : [t.selector]));
  const positionSelector = selectors.find((s): s is W3CTextPositionSelector => s.type === 'TextPositionSelector');
  if (!positionSelector) return null;
  return { start: positionSelector.start, end: positionSelector.end };
}

function toW3CAnnotation(
  annotationId: string,
  quote: string,
  startOffset: number,
  endOffset: number,
  comment: string,
  sourceId: string
): W3CTextAnnotation {
  return {
    '@context': 'http://www.w3.org/ns/anno.jsonld',
    id: annotationId,
    type: 'Annotation',
    body: [{ type: 'TextualBody', purpose: ANNOTATION_PURPOSE, value: comment }],
    target: {
      source: sourceId,
      selector: [
        { type: 'TextQuoteSelector', exact: quote },
        { type: 'TextPositionSelector', start: startOffset, end: endOffset },
      ],
    },
  };
}

function toDisplayAnnotation(
  comment: SubmissionAiFeedbackCommentView,
  sourceId: string,
  normalization: SubmissionTextNormalizationResult
): W3CTextAnnotation {
  const startOffset = normalization.rawIndexToClean(comment.startOffset);
  const endOffset = normalization.rawIndexToClean(comment.endOffset);
  const quote = normalization.cleanText.slice(startOffset, endOffset) || comment.quote;

  return toW3CAnnotation(comment.annotationId, quote, startOffset, endOffset, comment.comment, sourceId);
}

function clearBrowserSelection() {
  window.getSelection()?.removeAllRanges();
}

function getEscapedAnnotationId(annotationId: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(annotationId);
  }

  return annotationId.replace(/["\\]/g, '\\$&');
}

function getAnnotationSelector(annotationId: string): string {
  return `[data-annotation="${getEscapedAnnotationId(annotationId)}"]`;
}

function getAnnotationSpan(containerEl: HTMLElement, annotationId: string): Element | null {
  return containerEl.querySelector(getAnnotationSelector(annotationId));
}

/**
 * Measures the Y offset of each annotation relative to referenceEl using the
 * `data-annotation` attribute that @recogito/text-annotator places on each
 * highlight span. This is simpler and more reliable than offset-based TreeWalker
 * traversal because the library has already resolved the offsets to DOM positions.
 */
function measureAllPositions(
  containerEl: HTMLElement,
  referenceEl: HTMLElement,
  comments: SubmissionAiFeedbackCommentView[]
): Record<string, number> {
  const positions: Record<string, number> = {};
  const refRect = referenceEl.getBoundingClientRect();

  for (const comment of comments) {
    const span = getAnnotationSpan(containerEl, comment.annotationId);
    if (span) {
      const rect = span.getBoundingClientRect();
      positions[comment.annotationId] = Math.max(0, rect.top - refRect.top);
    }
  }

  return positions;
}

/** Push down cards that would overlap the previous card. */
function resolveCardPositions(
  comments: SubmissionAiFeedbackCommentView[],
  rawPositions: Record<string, number>
): Record<string, number> {
  const sorted = [...comments].sort((a, b) => {
    const pa = rawPositions[a.annotationId] ?? a.startOffset;
    const pb = rawPositions[b.annotationId] ?? b.startOffset;
    return pa - pb;
  });

  const resolved: Record<string, number> = {};
  let nextMinTop = 0;

  for (const comment of sorted) {
    const ideal = rawPositions[comment.annotationId] ?? 0;
    const top = Math.max(ideal, nextMinTop);
    resolved[comment.annotationId] = top;
    nextMinTop = top + CARD_APPROX_HEIGHT + CARD_GAP;
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Floating annotation card (desktop lane)
// ---------------------------------------------------------------------------

interface AnnotationCardProps {
  comment: SubmissionAiFeedbackCommentView;
  isSelected: boolean;
  isDeleting: boolean;
  readOnly: boolean;
  isEditing: boolean;
  editValue: string;
  isSavingEdit: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onEditValueChange: (value: string) => void;
  onSaveEdit: () => void;
  onDelete: () => void;
}

function AnnotationCard({
  comment,
  isSelected,
  isDeleting,
  readOnly,
  isEditing,
  editValue,
  isSavingEdit,
  onSelect,
  onStartEdit,
  onEditValueChange,
  onSaveEdit,
  onDelete,
}: AnnotationCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'rounded-xl border px-3 py-2.5 transition-colors shadow-sm cursor-pointer',
        !isEditing && 'select-none',
        isSelected
          ? 'border-[#E07A5F]/50 bg-[#E07A5F]/10'
          : 'border-border/50 bg-background hover:border-[#E07A5F]/30 hover:bg-[#E07A5F]/5'
      )}
      onClick={() => {
        if (!isEditing) onSelect();
      }}
      onDoubleClick={() => {
        if (!readOnly) onStartEdit();
      }}
      onKeyDown={(e) => {
        if (!isEditing && e.key === 'Enter') onSelect();
      }}
    >
      <div className="flex items-start gap-1.5">
        <MessageSquare
          className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', isSelected ? 'text-[#E07A5F]' : 'text-muted-foreground')}
        />
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">&ldquo;{comment.quote}&rdquo;</p>
          {isEditing ? (
            <Textarea
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              className="mt-1 min-h-16 resize-none bg-background text-xs"
            />
          ) : (
            <p className="mt-1 text-xs text-foreground line-clamp-3 whitespace-pre-wrap break-words">
              {comment.comment}
            </p>
          )}
        </div>
        {!readOnly && isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 -mt-0.5 -mr-1 text-muted-foreground hover:text-[#E07A5F]"
            disabled={isSavingEdit || !editValue.trim()}
            onClick={(e) => {
              e.stopPropagation();
              onSaveEdit();
            }}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        {!readOnly && !isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 -mt-0.5 -mr-1 text-muted-foreground hover:text-destructive"
            disabled={isDeleting}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AnnotatableFeedback({
  submissionId,
  targetType,
  targetId,
  content,
  comments,
  readOnly = false,
  contentFormat = 'markdown',
  annotationLayout = 'side',
}: AnnotatableFeedbackProps) {
  const { t } = useTranslation('grading');
  const supportsAnnotationMode = targetType === 'submission' && !readOnly;

  // Single set of refs — annotator is attached to ONE container
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const floatingButtonRef = useRef<HTMLButtonElement | null>(null);
  const annotatorRef = useRef<TextAnnotator<TextAnnotation, W3CTextAnnotation> | null>(null);
  const appliedAnnotationsRef = useRef<Record<string, SavedAnnotationMapEntry>>({});
  const savedAnnotationEntriesRef = useRef<W3CTextAnnotation[]>([]);
  const savedAnnotationMapRef = useRef<Record<string, SavedAnnotationMapEntry>>({});

  const sourceId = `submission:${submissionId}:${targetType}:${targetId}`;
  const annotationSourceText = useMemo(
    () => (contentFormat === 'markdown' ? markdownToPlainText(content) : content),
    [content, contentFormat]
  );
  const textNormalization = useMemo(
    () =>
      contentFormat === 'plainText' && targetType === 'submission'
        ? normalizeSubmissionText(annotationSourceText)
        : createIdentitySubmissionTextNormalization(annotationSourceText),
    [annotationSourceText, contentFormat, targetType]
  );
  const displayContent = contentFormat === 'markdown' ? content : textNormalization.cleanText;
  const shouldApplySubmissionMinHeight = targetType === 'submission' && contentFormat === 'plainText';

  const [savedComments, setSavedComments] = useState(comments);
  const [pendingAnnotation, setPendingAnnotation] = useState<W3CTextAnnotation | null>(null);
  const [buttonPosition, setButtonPosition] = useState<FloatingButtonPosition | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draftComment, setDraftComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(comments[0]?.annotationId ?? null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const [savingEditCommentId, setSavingEditCommentId] = useState<string | null>(null);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);

  // Lane positioning state
  const [annotationPositions, setAnnotationPositions] = useState<Record<string, number>>({});
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    setSavedComments(comments);
  }, [comments]);

  useEffect(() => {
    setSelectedCommentId((current) => {
      if (current && comments.some((comment) => comment.annotationId === current)) {
        return current;
      }

      return comments[0]?.annotationId ?? null;
    });
  }, [comments]);

  const savedAnnotationEntries = useMemo(
    () => savedComments.map((comment) => toDisplayAnnotation(comment, sourceId, textNormalization)),
    [savedComments, sourceId, textNormalization]
  );

  const savedAnnotationMap = useMemo<Record<string, SavedAnnotationMapEntry>>(
    () =>
      Object.fromEntries(
        savedComments.map((comment) => [
          comment.annotationId,
          { comment, annotation: toDisplayAnnotation(comment, sourceId, textNormalization) },
        ])
      ),
    [savedComments, sourceId, textNormalization]
  );

  useEffect(() => {
    savedAnnotationEntriesRef.current = savedAnnotationEntries;
  }, [savedAnnotationEntries]);

  useEffect(() => {
    savedAnnotationMapRef.current = savedAnnotationMap;
  }, [savedAnnotationMap]);

  // Measure annotation Y positions from rendered DOM
  useEffect(() => {
    if (annotationLayout !== 'side') {
      setAnnotationPositions({});
      return;
    }

    const container = containerRef.current;
    const wrapper = wrapperRef.current;
    if (!container || !wrapper || savedComments.length === 0) {
      setAnnotationPositions({});
      return;
    }

    let rafId: number;

    const measure = () => {
      if (!containerRef.current || !wrapperRef.current) return;
      setAnnotationPositions(measureAllPositions(containerRef.current, wrapperRef.current, savedComments));
    };

    // Double RAF: first tick lets React paint, second lets the annotator add highlight spans
    rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(measure);
    });

    const mutationObserver = new MutationObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    });
    mutationObserver.observe(container, { childList: true, subtree: true });

    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [annotationLayout, savedComments]);

  // Track content height for lane min-height
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      setContentHeight(entry.contentRect.height);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const resolvedPositions = useMemo(
    () => resolveCardPositions(savedComments, annotationPositions),
    [savedComments, annotationPositions]
  );

  const laneMinHeight = useMemo(() => {
    if (savedComments.length === 0) return contentHeight;
    const positions = Object.values(resolvedPositions);
    const maxTop = positions.length > 0 ? Math.max(...positions) : 0;
    return Math.max(contentHeight, maxTop + CARD_APPROX_HEIGHT + CARD_GAP);
  }, [savedComments.length, resolvedPositions, contentHeight]);

  const dismissFloatingButton = useCallback(() => {
    const pendingAnnotationId = pendingAnnotation?.id;

    if (pendingAnnotationId) {
      annotatorRef.current?.removeAnnotation(pendingAnnotationId);
    }

    setPendingAnnotation(null);
    setButtonPosition(null);
  }, [pendingAnnotation]);

  const syncSavedAnnotations = useCallback((nextMap: Record<string, SavedAnnotationMapEntry>) => {
    const annotator = annotatorRef.current;
    const container = containerRef.current;
    if (!annotator || !container) return;

    const currentMap = appliedAnnotationsRef.current;

    for (const annotationId of Object.keys(currentMap)) {
      if (!(annotationId in nextMap)) {
        annotator.removeAnnotation(annotationId);
      }
    }

    for (const [annotationId, entry] of Object.entries(nextMap)) {
      const previous = currentMap[annotationId]?.comment;
      const annotationExistsInDom = Boolean(getAnnotationSpan(container, annotationId));

      if (!previous) {
        if (annotationExistsInDom) {
          annotator.updateAnnotation(entry.annotation);
        } else {
          annotator.addAnnotation(entry.annotation);
        }
        continue;
      }

      if (
        previous.comment !== entry.comment.comment ||
        previous.quote !== entry.comment.quote ||
        previous.startOffset !== entry.comment.startOffset ||
        previous.endOffset !== entry.comment.endOffset
      ) {
        annotator.updateAnnotation(entry.annotation);
      }
    }

    appliedAnnotationsRef.current = nextMap;
  }, []);

  const showFloatingButtonForAnnotation = useCallback((annotation: W3CTextAnnotation) => {
    const container = containerRef.current;
    const wrapper = wrapperRef.current;
    if (!container || !wrapper) {
      return;
    }

    const measure = () => {
      const activeContainer = containerRef.current;
      const activeWrapper = wrapperRef.current;
      if (!activeContainer || !activeWrapper) {
        return;
      }

      const span = getAnnotationSpan(activeContainer, annotation.id);
      if (!span) {
        annotatorRef.current?.removeAnnotation(annotation.id);
        setPendingAnnotation(null);
        setButtonPosition(null);
        return;
      }

      const rect = span.getBoundingClientRect();
      const wrapperRect = activeWrapper.getBoundingClientRect();

      setPendingAnnotation(annotation);
      setButtonPosition({
        top: rect.top - wrapperRect.top + activeWrapper.scrollTop + rect.height / 2,
        left: Math.max(
          12,
          Math.min(activeWrapper.clientWidth - 12, rect.right - wrapperRect.left + activeWrapper.scrollLeft + 8)
        ),
      });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(measure);
    });
  }, []);

  // Set up text annotator
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const annotator = createTextAnnotator<TextAnnotation, W3CTextAnnotation>(container, {
      adapter: W3CTextFormat(sourceId, container),
      annotatingEnabled: !readOnly && (!supportsAnnotationMode || isAnnotationMode),
      style: (_annotation, state) => ({
        fill: state.selected ? '#f59e0b' : '#fbbf24',
        fillOpacity: state.selected ? 0.32 : 0.18,
        underlineColor: '#d97706',
        underlineThickness: 2,
      }),
      userSelectAction: UserSelectAction.SELECT,
    });

    const handleCreateAnnotation = (annotation: W3CTextAnnotation) => {
      if (readOnly) {
        annotator.removeAnnotation(annotation.id);
        clearBrowserSelection();
        return;
      }

      if (supportsAnnotationMode && isAnnotationMode) {
        setPendingAnnotation(annotation);
        setButtonPosition(null);
        setIsDialogOpen(true);
        return;
      }

      showFloatingButtonForAnnotation(annotation);
    };

    annotator.on('createAnnotation', handleCreateAnnotation);
    annotator.setAnnotations(savedAnnotationEntriesRef.current, true);
    appliedAnnotationsRef.current = savedAnnotationMapRef.current;
    annotatorRef.current = annotator;

    return () => {
      annotator.off('createAnnotation', handleCreateAnnotation);
      annotator.destroy();
      annotatorRef.current = null;
    };
  }, [
    content,
    contentFormat,
    isAnnotationMode,
    readOnly,
    showFloatingButtonForAnnotation,
    sourceId,
    supportsAnnotationMode,
  ]);

  useEffect(() => {
    syncSavedAnnotations(savedAnnotationMap);
  }, [savedAnnotationMap, syncSavedAnnotations]);

  useEffect(() => {
    if (!pendingAnnotation || isDialogOpen) return;

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !selection.toString().trim()) {
        dismissFloatingButton();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        dismissFloatingButton();
        return;
      }
      if (floatingButtonRef.current?.contains(target)) return;
      dismissFloatingButton();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [dismissFloatingButton, isDialogOpen, pendingAnnotation]);

  const clearPendingAnnotation = () => {
    setIsAnnotationMode(false);
    setDraftComment('');
    setIsDialogOpen(false);
    dismissFloatingButton();
    clearBrowserSelection();
  };

  const handleEnterAnnotationMode = () => {
    setIsAnnotationMode(true);
  };

  const handleCancelAnnotationMode = () => {
    setIsAnnotationMode(false);
    clearBrowserSelection();
    dismissFloatingButton();
  };

  const handleSaveComment = async () => {
    if (!pendingAnnotation) return;

    const quote = getAnnotationQuote(pendingAnnotation);
    const offsets = getAnnotationOffsets(pendingAnnotation);
    const trimmedComment = draftComment.trim();

    if (!quote || !offsets || !trimmedComment) {
      toast.error(t('result.annotations.errors.invalidSelection'));
      clearPendingAnnotation();
      return;
    }

    setIsSaving(true);

    const rawStartOffset = textNormalization.cleanIndexToRaw(offsets.start);
    const rawEndOffset = textNormalization.cleanIndexToRaw(offsets.end);
    const rawQuote = annotationSourceText.slice(rawStartOffset, rawEndOffset);

    console.debug('[annotations] raw offset payload', {
      annotationId: pendingAnnotation.id,
      targetType,
      targetId,
      startOffset: rawStartOffset,
      endOffset: rawEndOffset,
      quote: rawQuote,
    });

    try {
      const response = await fetch(`/api/teacher/submissions/${submissionId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          annotationId: pendingAnnotation.id,
          quote: rawQuote,
          startOffset: rawStartOffset,
          endOffset: rawEndOffset,
          comment: trimmedComment,
        }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
        data?: SubmissionAiFeedbackCommentView;
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Failed to save comment');
      }

      annotatorRef.current?.updateAnnotation(toDisplayAnnotation(payload.data, sourceId, textNormalization));
      setSavedComments((prev) => [...prev, payload.data as SubmissionAiFeedbackCommentView]);
      setSelectedCommentId(payload.data.annotationId);
      setPendingAnnotation(null);
      setButtonPosition(null);
      setDraftComment('');
      setIsDialogOpen(false);
      if (supportsAnnotationMode) {
        setIsAnnotationMode(false);
      }
      clearBrowserSelection();
      toast.success(t('result.annotations.messages.saved'));
    } catch {
      toast.error(t('result.annotations.errors.saveFailed'));
      clearPendingAnnotation();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteComment = async (annotationId: string) => {
    setDeletingCommentId(annotationId);

    try {
      const response = await fetch(`/api/teacher/submissions/${submissionId}/annotations`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annotationId }),
      });

      const payload = (await response.json()) as { success: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to delete annotation');
      }

      annotatorRef.current?.removeAnnotation(annotationId);
      setSavedComments((prev) => prev.filter((c) => c.annotationId !== annotationId));
      setSelectedCommentId((current) => (current === annotationId ? null : current));
      toast.success(t('result.annotations.messages.deleted'));
    } catch {
      toast.error(t('result.annotations.errors.deleteFailed'));
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleStartEditComment = (comment: SubmissionAiFeedbackCommentView) => {
    setSelectedCommentId(comment.annotationId);
    setEditingCommentId(comment.annotationId);
    setEditingDraft(comment.comment);
    const annotator = annotatorRef.current;
    annotator?.setSelected(comment.annotationId);
    annotator?.scrollIntoView(comment.annotationId);
  };

  const handleUpdateComment = async (annotationId: string) => {
    const trimmedComment = editingDraft.trim();
    const existing = savedComments.find((comment) => comment.annotationId === annotationId);

    if (!trimmedComment || !existing) return;
    if (trimmedComment === existing.comment) {
      setEditingCommentId(null);
      setEditingDraft('');
      return;
    }

    setSavingEditCommentId(annotationId);

    try {
      const response = await fetch(`/api/teacher/submissions/${submissionId}/annotations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annotationId, comment: trimmedComment }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
        data?: SubmissionAiFeedbackCommentView;
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Failed to update annotation');
      }

      const updatedComment = payload.data;
      annotatorRef.current?.updateAnnotation(toDisplayAnnotation(updatedComment, sourceId, textNormalization));
      setSavedComments((prev) =>
        prev.map((comment) => (comment.annotationId === annotationId ? updatedComment : comment))
      );
      setEditingCommentId(null);
      setEditingDraft('');
      toast.success(t('result.annotations.messages.updated'));
    } catch {
      toast.error(t('result.annotations.errors.updateFailed'));
    } finally {
      setSavingEditCommentId(null);
    }
  };

  const handleSelectComment = (annotationId: string) => {
    setSelectedCommentId(annotationId);
    const annotator = annotatorRef.current;
    annotator?.setSelected(annotationId);
    annotator?.scrollIntoView(annotationId);
  };

  const hasAnnotations = savedComments.length > 0;

  return (
    <div className="space-y-4">
      {isAnnotationMode && supportsAnnotationMode && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E07A5F]/30 bg-[#E07A5F]/10 px-3 py-2 text-sm text-[#8C3218]">
          <span>{t('result.annotations.mode.banner')}</span>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={handleCancelAnnotationMode}>
            {t('result.annotations.actions.cancel')}
          </Button>
        </div>
      )}

      {/*
       * Single content render — the annotator attaches to ONE containerRef.
       * The annotation lane (desktop) and list (mobile) are both in the DOM
       * but use CSS to show/hide at the appropriate breakpoint.
       */}
      <div
        className={cn(
          'relative',
          annotationLayout === 'side' &&
            hasAnnotations &&
            'xl:grid xl:grid-cols-[minmax(0,1fr)_11rem] xl:gap-3 xl:items-start 2xl:grid-cols-[minmax(0,1fr)_12rem]'
        )}
      >
        {/* Annotatable text content */}
        <div ref={wrapperRef} className="min-w-0 relative">
          {supportsAnnotationMode && (
            <div className="absolute left-4 top-4 z-10 text-sm font-medium text-foreground">
              {t('result.annotations.submissionTitle')}
            </div>
          )}

          {supportsAnnotationMode && (
            <Button
              type="button"
              size="sm"
              variant={isAnnotationMode ? 'secondary' : 'outline'}
              className={cn(
                'absolute right-3 top-3 z-10 h-8 px-2.5 text-xs shadow-sm',
                isAnnotationMode && 'border-[#E07A5F]/40 bg-[#E07A5F]/10 text-[#8C3218] hover:bg-[#E07A5F]/15'
              )}
              onClick={isAnnotationMode ? handleCancelAnnotationMode : handleEnterAnnotationMode}
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              {t('result.annotations.actions.startMode')}
            </Button>
          )}

          <div
            ref={containerRef}
            className={cn(
              'rounded-xl border border-border/60 bg-background/50 px-4 py-3',
              '[&_.r6o-annotation]:rounded-sm [&_.r6o-annotation]:bg-amber-200/40',
              supportsAnnotationMode && 'pt-12',
              shouldApplySubmissionMinHeight && 'min-h-[62rem]',
              isAnnotationMode && supportsAnnotationMode && 'cursor-crosshair ring-2 ring-[#E07A5F]/20'
            )}
          >
            {contentFormat === 'plainText' ? (
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                {displayContent}
              </div>
            ) : (
              <Markdown className="prose-sm">{displayContent}</Markdown>
            )}
          </div>

          {/* Floating "Add comment" button — appears next to selected text */}
          {!supportsAnnotationMode && !readOnly && buttonPosition && pendingAnnotation && !isDialogOpen && (
            <button
              ref={floatingButtonRef}
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => setIsDialogOpen(true)}
              className="absolute z-20 inline-flex items-center gap-1 rounded-full bg-[#E07A5F] px-3 py-1.5 text-xs font-medium text-white shadow-lg transition-colors hover:bg-[#D2691E]"
              style={{
                top: buttonPosition.top,
                left: buttonPosition.left,
                transform: 'translateY(-50%)',
              }}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {t('result.annotations.actions.comment')}
            </button>
          )}
        </div>

        {/* Desktop annotation lane — overlays without shrinking text width */}
        {annotationLayout === 'side' && hasAnnotations && (
          <div
            className="relative hidden xl:block"
            style={{ minHeight: laneMinHeight }}
            aria-label={t('result.annotations.teacherTitle')}
          >
            {savedComments.map((comment) => {
              const top = resolvedPositions[comment.annotationId] ?? 0;
              return (
                <div
                  key={comment.id}
                  className="absolute inset-x-0 transition-[top] duration-200 ease-out"
                  style={{ top }}
                >
                  <AnnotationCard
                    comment={comment}
                    isSelected={selectedCommentId === comment.annotationId}
                    isDeleting={deletingCommentId === comment.annotationId}
                    readOnly={readOnly}
                    isEditing={editingCommentId === comment.annotationId}
                    editValue={editingCommentId === comment.annotationId ? editingDraft : comment.comment}
                    isSavingEdit={savingEditCommentId === comment.annotationId}
                    onSelect={() => handleSelectComment(comment.annotationId)}
                    onStartEdit={() => handleStartEditComment(comment)}
                    onEditValueChange={setEditingDraft}
                    onSaveEdit={() => void handleUpdateComment(comment.annotationId)}
                    onDelete={() => void handleDeleteComment(comment.annotationId)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stacked annotation list — mobile fallback, and desktop when the parent column is narrow. */}
      {hasAnnotations && (
        <div
          className={cn(
            'space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4',
            annotationLayout === 'side' && 'xl:hidden'
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {readOnly ? t('result.annotations.studentTitle') : t('result.annotations.teacherTitle')}
          </p>
          <div className="space-y-2">
            {savedComments.map((comment) => (
              <div
                key={comment.id}
                className={cn(
                  'rounded-xl border px-3 py-3 transition-colors',
                  selectedCommentId === comment.annotationId
                    ? 'border-[#E07A5F]/40 bg-[#E07A5F]/10 shadow-sm'
                    : 'border-border/50 bg-background'
                )}
              >
                <div className="flex items-start gap-2">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (editingCommentId !== comment.annotationId) handleSelectComment(comment.annotationId);
                    }}
                    onDoubleClick={() => {
                      if (!readOnly) handleStartEditComment(comment);
                    }}
                    onKeyDown={(e) => {
                      if (editingCommentId !== comment.annotationId && e.key === 'Enter') {
                        handleSelectComment(comment.annotationId);
                      }
                    }}
                    className="flex min-w-0 flex-1 items-start gap-2 text-left"
                  >
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E07A5F]/12 text-[#E07A5F]">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-muted-foreground">&quot;{comment.quote}&quot;</p>
                      {editingCommentId === comment.annotationId ? (
                        <Textarea
                          value={editingDraft}
                          onChange={(e) => setEditingDraft(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => e.stopPropagation()}
                          className="mt-1 min-h-20 resize-none bg-background text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm whitespace-pre-wrap text-foreground">{comment.comment}</p>
                      )}
                    </div>
                  </div>

                  {!readOnly && editingCommentId === comment.annotationId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-[#E07A5F]"
                      disabled={savingEditCommentId === comment.annotationId || !editingDraft.trim()}
                      onClick={() => void handleUpdateComment(comment.annotationId)}
                    >
                      <Check className="h-4 w-4" />
                      <span className="sr-only">{t('result.annotations.actions.saveEdit')}</span>
                    </Button>
                  )}

                  {!readOnly && editingCommentId !== comment.annotationId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={deletingCommentId === comment.annotationId}
                      onClick={() => void handleDeleteComment(comment.annotationId)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">{t('result.annotations.actions.delete')}</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comment input dialog */}
      {!readOnly && (
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (!open && !isSaving) {
              clearPendingAnnotation();
              return;
            }
            setIsDialogOpen(open);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('result.annotations.dialog.title')}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap">
                {getPendingAnnotationQuote(pendingAnnotation) || t('result.annotations.dialog.noSelection')}
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                {t('result.annotations.dialog.placeholder')}
              </DialogDescription>
              <Textarea
                value={draftComment}
                onChange={(e) => setDraftComment(e.target.value)}
                placeholder={t('result.annotations.dialog.placeholder')}
                className="min-h-[120px] resize-none"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={clearPendingAnnotation} disabled={isSaving}>
                {t('result.annotations.actions.cancel')}
              </Button>
              <Button type="button" onClick={handleSaveComment} disabled={isSaving || !draftComment.trim()}>
                {isSaving ? t('result.annotations.actions.saving') : t('result.annotations.actions.saveComment')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

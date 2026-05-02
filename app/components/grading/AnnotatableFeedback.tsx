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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { SubmissionAiFeedbackCommentView } from '@/types/teacher';

interface AnnotatableFeedbackProps {
  submissionId: string;
  targetType: string;
  targetId: string;
  content: string;
  comments: SubmissionAiFeedbackCommentView[];
  readOnly?: boolean;
}

interface FloatingButtonPosition {
  top: number;
  left: number;
}

const ANNOTATION_PURPOSE = 'commenting';

function getAnnotationQuote(annotation: W3CTextAnnotation): string | null {
  const targets = Array.isArray(annotation.target) ? annotation.target : [annotation.target];
  const selectors = targets.flatMap((target) => (Array.isArray(target.selector) ? target.selector : [target.selector]));
  const quoteSelector = selectors.find(
    (selector): selector is W3CTextQuoteSelector => selector.type === 'TextQuoteSelector'
  );

  return quoteSelector?.exact?.trim() || null;
}

function getPendingAnnotationQuote(annotation: W3CTextAnnotation | null): string | null {
  return annotation ? getAnnotationQuote(annotation) : null;
}

function getAnnotationOffsets(annotation: W3CTextAnnotation): { start: number; end: number } | null {
  const targets = Array.isArray(annotation.target) ? annotation.target : [annotation.target];
  const selectors = targets.flatMap((target) => (Array.isArray(target.selector) ? target.selector : [target.selector]));
  const positionSelector = selectors.find(
    (selector): selector is W3CTextPositionSelector => selector.type === 'TextPositionSelector'
  );

  if (!positionSelector) {
    return null;
  }

  return {
    start: positionSelector.start,
    end: positionSelector.end,
  };
}

function toW3CAnnotation(comment: SubmissionAiFeedbackCommentView, sourceId: string): W3CTextAnnotation {
  return {
    '@context': 'http://www.w3.org/ns/anno.jsonld',
    id: comment.annotationId,
    type: 'Annotation',
    body: [
      {
        type: 'TextualBody',
        purpose: ANNOTATION_PURPOSE,
        value: comment.comment,
      },
    ],
    target: {
      source: sourceId,
      selector: [
        {
          type: 'TextQuoteSelector',
          exact: comment.quote,
        },
        {
          type: 'TextPositionSelector',
          start: comment.startOffset,
          end: comment.endOffset,
        },
      ],
    },
  };
}

export function AnnotatableFeedback({
  submissionId,
  targetType,
  targetId,
  content,
  comments,
  readOnly = false,
}: AnnotatableFeedbackProps) {
  const { t } = useTranslation('grading');
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const floatingButtonRef = useRef<HTMLButtonElement | null>(null);
  const annotatorRef = useRef<TextAnnotator<TextAnnotation, W3CTextAnnotation> | null>(null);
  const sourceId = `submission:${submissionId}:${targetType}:${targetId}`;
  const [savedComments, setSavedComments] = useState(comments);
  const [pendingAnnotation, setPendingAnnotation] = useState<W3CTextAnnotation | null>(null);
  const [buttonPosition, setButtonPosition] = useState<FloatingButtonPosition | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draftComment, setDraftComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(comments[0]?.annotationId ?? null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  useEffect(() => {
    setSavedComments(comments);
  }, [comments]);

  useEffect(() => {
    setSelectedCommentId((current) => current ?? comments[0]?.annotationId ?? null);
  }, [comments]);

  const annotationPayload = useMemo(
    () => savedComments.map((comment) => toW3CAnnotation(comment, sourceId)),
    [savedComments, sourceId]
  );

  const dismissFloatingButton = useCallback(() => {
    setPendingAnnotation(null);
    setButtonPosition(null);
    annotatorRef.current?.setAnnotations(annotationPayload, true);
  }, [annotationPayload]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const annotator = createTextAnnotator<TextAnnotation, W3CTextAnnotation>(container, {
      adapter: W3CTextFormat(sourceId, container),
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
        annotator.setAnnotations(annotationPayload, true);
        window.getSelection()?.removeAllRanges();
        return;
      }

      const selection = window.getSelection();
      const wrapper = wrapperRef.current;

      if (!selection || selection.rangeCount === 0 || !wrapper) {
        annotator.setAnnotations(annotationPayload, true);
        return;
      }

      const range = selection.getRangeAt(0);
      const rects = Array.from(range.getClientRects());
      const lastRect = rects[rects.length - 1];

      if (!lastRect) {
        annotator.setAnnotations(annotationPayload, true);
        return;
      }

      const wrapperRect = wrapper.getBoundingClientRect();

      setPendingAnnotation(annotation);
      setButtonPosition({
        top: lastRect.top - wrapperRect.top + wrapper.scrollTop + lastRect.height / 2,
        left: lastRect.right - wrapperRect.left + wrapper.scrollLeft + 8,
      });
    };

    annotator.on('createAnnotation', handleCreateAnnotation);
    annotatorRef.current = annotator;

    return () => {
      annotator.off('createAnnotation', handleCreateAnnotation);
      annotator.destroy();
      annotatorRef.current = null;
    };
  }, [annotationPayload, readOnly, sourceId]);

  useEffect(() => {
    if (!annotatorRef.current || pendingAnnotation) {
      return;
    }

    annotatorRef.current.setAnnotations(annotationPayload, true);
  }, [annotationPayload, pendingAnnotation]);

  useEffect(() => {
    if (!pendingAnnotation || isDialogOpen) {
      return;
    }

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

      if (floatingButtonRef.current?.contains(target)) {
        return;
      }

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
    setDraftComment('');
    setIsDialogOpen(false);
    dismissFloatingButton();
  };

  const openCommentDialog = () => {
    setIsDialogOpen(true);
  };

  const handleSaveComment = async () => {
    if (!pendingAnnotation) {
      return;
    }

    const quote = getAnnotationQuote(pendingAnnotation);
    const offsets = getAnnotationOffsets(pendingAnnotation);
    const trimmedComment = draftComment.trim();

    if (!quote || !offsets || !trimmedComment) {
      toast.error(t('result.annotations.errors.invalidSelection'));
      clearPendingAnnotation();
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/teacher/submissions/${submissionId}/annotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetType,
          targetId,
          annotationId: pendingAnnotation.id,
          quote,
          startOffset: offsets.start,
          endOffset: offsets.end,
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

      setSavedComments((previous) => [...previous, payload.data as SubmissionAiFeedbackCommentView]);
      setSelectedCommentId(payload.data.annotationId);
      setPendingAnnotation(null);
      setButtonPosition(null);
      setDraftComment('');
      setIsDialogOpen(false);
      toast.success(t('result.annotations.messages.saved'));
    } catch (error) {
      console.error('Failed to save AI feedback comment:', error);
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ annotationId }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to delete annotation');
      }

      setSavedComments((previous) => previous.filter((comment) => comment.annotationId !== annotationId));
      setSelectedCommentId((current) => (current === annotationId ? null : current));
      toast.success(t('result.annotations.messages.deleted'));
    } catch (error) {
      console.error('Failed to delete AI feedback comment:', error);
      toast.error(t('result.annotations.errors.deleteFailed'));
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div ref={wrapperRef} className="relative">
        <div
          ref={containerRef}
          className={cn(
            'rounded-xl border border-border/60 bg-background/50 px-4 py-3',
            '[&_.r6o-annotation]:rounded-sm [&_.r6o-annotation]:bg-amber-200/40'
          )}
        >
          <Markdown className="prose-sm">{content}</Markdown>
        </div>

        {!readOnly && buttonPosition && pendingAnnotation && !isDialogOpen && (
          <button
            ref={floatingButtonRef}
            type="button"
            onPointerDown={(event) => event.preventDefault()}
            onClick={openCommentDialog}
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

      {savedComments.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {readOnly ? t('result.annotations.studentTitle') : t('result.annotations.teacherTitle')}
            </p>
            <p className="text-xs text-muted-foreground/80">{t('result.annotations.hint')}</p>
          </div>
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
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCommentId(comment.annotationId);
                      annotatorRef.current?.setSelected(comment.annotationId);
                    }}
                    className="flex min-w-0 flex-1 items-start gap-2 text-left"
                  >
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E07A5F]/12 text-[#E07A5F]">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-muted-foreground">
                        &quot;
                        {comment.quote}
                        &quot;
                      </p>
                      <p className="mt-1 text-sm whitespace-pre-wrap text-foreground">{comment.comment}</p>
                    </div>
                  </button>

                  {!readOnly && (
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
              <Textarea
                value={draftComment}
                onChange={(event) => setDraftComment(event.target.value)}
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

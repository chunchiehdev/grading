/**
 * ContextTransparency Component
 * Feature 004: AI Grading with Knowledge Base Context
 *
 * Displays transparency information about which context was used during AI grading
 */

import { useTranslation } from 'react-i18next';
import { FileText, AlertCircle, CheckCircle2, Scissors } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ReferenceFileUsage {
  fileId: string;
  fileName: string;
  contentLength: number;
  wasTruncated: boolean;
}

interface GradingContextInfo {
  assignmentAreaId: string | null;
  referenceFilesUsed: ReferenceFileUsage[];
  customInstructionsUsed: boolean;
}

interface ContextTransparencyProps {
  usedContext?: GradingContextInfo | null;
  customInstructionsPreview?: string | null;
}

export function ContextTransparency({ usedContext, customInstructionsPreview }: ContextTransparencyProps) {
  const { t } = useTranslation('grading');

  // If no context was used, show a simple message
  if (!usedContext || (!usedContext.referenceFilesUsed?.length && !usedContext.customInstructionsUsed)) {
    return (
      <Alert className="bg-muted/50 border-muted">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm text-muted-foreground">
          {t('noContextUsed', {
            defaultValue:
              'This grading was performed without additional context (reference materials or custom instructions).',
          })}
        </AlertDescription>
      </Alert>
    );
  }

  const hasReferences = usedContext.referenceFilesUsed && usedContext.referenceFilesUsed.length > 0;
  const hasCustomInstructions = usedContext.customInstructionsUsed;

  return (
    <div className="space-y-4">
      <Alert className="bg-primary/5 border-primary/20">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          {t('contextAwareGrading', {
            defaultValue: 'This submission was graded with additional context to improve accuracy.',
          })}
        </AlertDescription>
      </Alert>

      {/* Reference Materials Section */}
      {hasReferences && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {t('referenceDocumentsUsed', {
              defaultValue: 'Reference Documents Used',
            })}{' '}
            ({usedContext.referenceFilesUsed.length})
          </h4>

          <div className="space-y-2">
            {usedContext.referenceFilesUsed.map((file) => (
              <div
                key={file.fileId}
                className="flex items-start justify-between p-3 border border-border rounded-lg bg-card/50 hover:bg-card transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm font-medium text-foreground truncate">{file.fileName}</p>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>
                      {(file.contentLength / 1000).toFixed(1)}k {t('characters', { defaultValue: 'characters' })}
                    </span>

                    {file.wasTruncated && (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
                        <Scissors className="h-3 w-3" />
                        {t('truncated', { defaultValue: 'Truncated to 8000 chars' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Instructions Section */}
      {hasCustomInstructions && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">
            {t('customGradingInstructions', {
              defaultValue: 'Custom Grading Instructions',
            })}
          </h4>

          {customInstructionsPreview ? (
            <div className="p-3 border border-border rounded-lg bg-card/50">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {customInstructionsPreview.length > 300
                  ? `${customInstructionsPreview.substring(0, 300)}...`
                  : customInstructionsPreview}
              </p>
            </div>
          ) : (
            <div className="p-3 border border-border rounded-lg bg-card/50">
              <p className="text-sm text-muted-foreground italic">
                {t('customInstructionsApplied', {
                  defaultValue: 'Custom instructions were applied during grading.',
                })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

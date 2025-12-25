/**
 * Compact information components for the submission view page
 * These components display student, assignment, and grading summary info in a condensed format
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, Calendar, FileText, GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TeacherSubmissionView } from '@/types/teacher';

interface StudentInfoCompactProps {
  student: TeacherSubmissionView['student'];
}

export function StudentInfoCompact({ student }: StudentInfoCompactProps) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        <AvatarImage src={student.picture ?? undefined} alt={student.name} />
        <AvatarFallback className="bg-primary/10 text-primary text-sm">
          {student.initial}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium leading-tight">{student.name}</span>
        <span className="text-xs text-muted-foreground leading-tight">{student.email}</span>
      </div>
    </div>
  );
}

interface AssignmentInfoCompactProps {
  assignment: TeacherSubmissionView['assignment'];
}

export function AssignmentInfoCompact({ assignment }: AssignmentInfoCompactProps) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium">{assignment.course.name}</span>
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <span>{assignment.name}</span>
      </div>
      {assignment.formattedDueDate && (
        <>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">{assignment.formattedDueDate}</span>
          </div>
        </>
      )}
    </div>
  );
}

interface ScoreBadgeProps {
  score: number | null;
  className?: string;
}

export function ScoreBadge({ score, className = '' }: ScoreBadgeProps) {
  const getScoreVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  if (score === null) {
    return (
      <Badge variant="outline" className={`gap-2 ${className}`}>
        <Award className="w-4 h-4" />
        <span>批改中...</span>
      </Badge>
    );
  }

  return (
    <Badge variant={getScoreVariant(score)} className={`gap-2 text-base px-3 py-1 ${className}`}>
      <Award className="w-4 h-4" />
      <span className="font-semibold">{score.toFixed(1)}</span>
      <span className="text-xs opacity-80">/ 100</span>
    </Badge>
  );
}

interface GradingSummaryCompactProps {
  grading: TeacherSubmissionView['grading'];
}

export function GradingSummaryCompact({ grading }: GradingSummaryCompactProps) {
  const { t } = useTranslation('teacher');

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{t('gradingSummary')}</h3>
      
      {/* Score Display */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold leading-none">
          {grading.normalizedScore !== null ? grading.normalizedScore.toFixed(1) : '--'}
        </span>
        <span className="text-sm text-muted-foreground">/ 100</span>
      </div>

      {/* Metadata */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">提交時間</span>
          <span className="font-medium">
            {grading.formattedUploadedAt || new Date(grading.uploadedAt).toLocaleDateString()}
          </span>
        </div>
        {grading.filePath && (
          <Button asChild variant="outline" size="sm" className="w-full">
            <a
              href={`/api/files/${grading.filePath}/download`}
              target="_blank"
              rel="noopener noreferrer"
            >
              下載原始檔案
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

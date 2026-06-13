/**
 * Compact information components for the submission view page
 * These components display student, assignment, and grading summary info in a condensed format
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, FileText, GraduationCap } from 'lucide-react';
import type { TeacherSubmissionView } from '@/types/teacher';

interface StudentInfoCompactProps {
  student: TeacherSubmissionView['student'];
}

export function StudentInfoCompact({ student }: StudentInfoCompactProps) {
  return (
    <div className="flex items-center gap-3 ml-3">
      <Avatar className="h-9 w-9">
        <AvatarImage src={student.picture ?? undefined} alt={student.name} />
        <AvatarFallback className="bg-primary/10 text-primary text-sm">{student.initial}</AvatarFallback>
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

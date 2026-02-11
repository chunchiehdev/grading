import { Link } from 'react-router';
import { FileText, Plus, Star, Copy, MoreVertical, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { formatDateForDisplay } from '@/lib/date';
import type { TeacherInfo, RubricResponse } from '@/types/teacher';

interface TeacherRubricsContentProps {
  data: {
    teacher: TeacherInfo;
    rubrics?: RubricResponse[];
  };
}

export function TeacherRubricsContent({ data }: TeacherRubricsContentProps) {
  const { teacher, rubrics = [] } = data;
  const { t } = useTranslation(['rubric', 'dashboard']);

  const activeRubrics = rubrics;

  return (
    <div className="space-y-6">
      {activeRubrics.length === 0 ? (
        /* Empty State */
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-8 max-w-md">
            {/* Icon */}
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-muted/40 to-muted/20 flex items-center justify-center">
              <FileText className="w-12 h-12 text-muted-foreground" />
            </div>

            {/* Main Content */}
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold text-foreground">{t('rubric:emptyState.noRubrics')}</h1>
              <p className="text-muted-foreground">{t('rubric:emptyState.noRubricsDescription')}</p>
            </div>

            {/* Action Button - Larger with full rounded corners */}
            <Button asChild variant="emphasis" size="lg" className="rounded-full px-8 py-6 text-base">
              <Link to="/teacher/rubrics/new">
                <Plus className="w-6 h-6 mr-2" />
                {t('rubric:createFirst')}
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Header with Create Button */}
          <div className="flex justify-end mb-3">
            <Button asChild variant="emphasis" className="rounded-full">
              <Link to="/teacher/rubrics/new">
                <Plus className="w-4 h-4 mr-2" />
                {t('rubric:create')}
              </Link>
            </Button>
          </div>

          {/* Rubrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeRubrics.map((rubric) => {
            const totalMaxScore =
              rubric.criteria?.reduce((total: number, criterion: any) => total + criterion.maxScore, 0) || 100;

            return (
              <Link key={rubric.id} to={`/teacher/rubrics/${rubric.id}`} className="block">
                <Card className="group hover:-translate-y-1 hover:bg-accent/5 transition-[transform,background-color] duration-200 border-2 h-full grid grid-rows-[1fr_auto_auto]">
                  {/* Header - 可變高度但有最小高度 */}
                  <CardHeader className="p-4 sm:p-6 min-h-[140px] flex flex-col justify-start">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {rubric.name}
                          </CardTitle>
                          {rubric.isTemplate && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              {t('rubric:template')}
                            </Badge>
                          )}
                        </div>
                        {rubric.description && (
                          <p className="text-sm text-muted-foreground line-clamp-3">{rubric.description}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/teacher/rubrics/${rubric.id}/edit`}>{t('rubric:edit')}</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Copy className="w-4 h-4 mr-2" />
                            {t('rubric:duplicate')}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            {rubric.isTemplate ? t('rubric:removeFromTemplate') : t('rubric:saveAsTemplate')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  {/* Statistics - 固定高度區域 */}
                  <div className="px-4 sm:px-6 py-4 max-w-full">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start gap-3 sm:gap-4 w-full">
                      <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto sm:flex-1 overflow-hidden">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-base font-semibold text-foreground shrink-0">
                          {rubric.criteria?.length || 0}
                        </span>
                        <span 
                          className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis block"
                          title={t('rubric:criteria')}
                        >
                          {t('rubric:criteria')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto sm:flex-1 overflow-hidden">
                        <Star className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-base font-semibold text-foreground shrink-0">{totalMaxScore}</span>
                        <span 
                          className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis block"
                          title={t('rubric:totalPoints')}
                        >
                          {t('rubric:totalPoints')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Meta Info - 固定高度區域 */}
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="flex items-center text-xs sm:text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{formatDateForDisplay(rubric.createdAt)}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
          </div>
        </>
      )}
    </div>
  );
}

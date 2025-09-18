import { Link } from 'react-router';
import { FileText, Plus, Star, Copy, MoreVertical, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface TeacherRubricsData {
  teacher: { id: string; email: string; name: string; role: string };
  rubrics?: any[];
}

interface TeacherRubricsContentProps {
  data: TeacherRubricsData;
}

export function TeacherRubricsContent({ data }: TeacherRubricsContentProps) {
  const { teacher, rubrics = [] } = data;
  const { t } = useTranslation(['rubric', 'dashboard']);

  const activeRubrics = rubrics;

  return (
    <div className="space-y-6 md:space-y-8 lg:space-y-10 xl:space-y-12">
      {/* Add Rubric Button */}
      <div className="flex justify-end">
        <Button asChild variant="outline" size="icon" className="h-12 w-12 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors">
          <Link to="/teacher/rubrics/new">
            <Plus className="w-6 h-6" />
          </Link>
        </Button>
      </div>

      {activeRubrics.length === 0 ? (
        /* Empty State */
        <Card>
          <CardContent className="p-12 md:p-16 lg:p-20 text-center">
            <FileText className="mx-auto h-20 md:h-24 lg:h-28 xl:h-32 w-20 md:w-24 lg:w-28 xl:w-32 text-muted-foreground" />
            <h3 className="mt-6 md:mt-8 text-xl md:text-2xl lg:text-3xl font-medium text-foreground">
              {t('rubric:emptyState.noRubrics')}
            </h3>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('rubric:emptyState.noRubricsDescription')}
            </p>
            <Button asChild size="lg" className="mt-8 text-lg md:text-xl px-8 md:px-10 py-4 md:py-5">
              <Link to="/teacher/rubrics/new">
                <Plus className="w-6 h-6 mr-2" />
                {t('rubric:createFirst')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Rubrics Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 lg:gap-10">
          {activeRubrics.map((rubric) => {
            const totalMaxScore = rubric.criteria?.reduce((total: number, criterion: any) => total + criterion.maxScore, 0) || 100;

            return (
              <Card key={rubric.id} className="hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
                <CardHeader className="p-6 md:p-8">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Link
                          to={`/teacher/rubrics/${rubric.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          <CardTitle className="text-lg md:text-xl lg:text-2xl font-semibold line-clamp-2">
                            {rubric.name}
                          </CardTitle>
                        </Link>
                        {rubric.isTemplate && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {t('rubric:template')}
                          </Badge>
                        )}
                      </div>
                      {rubric.description && (
                        <p className="text-sm md:text-base text-muted-foreground line-clamp-3">
                          {rubric.description}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/teacher/rubrics/${rubric.id}`}>
                            {t('rubric:view')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/teacher/rubrics/${rubric.id}/edit`}>
                            {t('rubric:edit')}
                          </Link>
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

                <CardContent className="p-6 md:p-8 pt-0">
                  {/* Rubric Statistics */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-xl md:text-2xl font-bold text-foreground">
                        {rubric.criteria?.length || 0}
                      </div>
                      <div className="text-xs md:text-sm text-muted-foreground">
                        {t('rubric:criteria')}
                      </div>
                    </div>

                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-xl md:text-2xl font-bold text-foreground">
                        {totalMaxScore}
                      </div>
                      <div className="text-xs md:text-sm text-muted-foreground">
                        {t('rubric:totalPoints')}
                      </div>
                    </div>
                  </div>

                  {/* Criteria Preview */}
                  {rubric.criteria && rubric.criteria.length > 0 && (
                    <div className="space-y-2 mb-6">
                      <h4 className="text-sm md:text-base font-medium text-foreground">
                        {t('rubric:criteriaPreview')}:
                      </h4>
                      <div className="space-y-1">
                        {rubric.criteria.slice(0, 3).map((criterion: any, index: number) => (
                          <div key={index} className="flex justify-between text-sm text-muted-foreground">
                            <span className="truncate">{criterion.name}</span>
                            <span className="ml-2">{criterion.maxScore}pts</span>
                          </div>
                        ))}
                        {rubric.criteria.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{rubric.criteria.length - 3} {t('rubric:moreCriteria')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rubric Meta */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {t('rubric:created')}
                      </span>
                      <Badge variant="outline">
                        {formatDateForDisplay(rubric.createdAt)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{t('rubric:version')}</span>
                      <Badge variant={rubric.isActive ? "default" : "secondary"}>
                        v{rubric.version}
                      </Badge>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1 text-sm md:text-base">
                      <Link to={`/teacher/rubrics/${rubric.id}`}>
                        {t('rubric:view')}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="text-sm md:text-base">
                      <Link to={`/teacher/rubrics/${rubric.id}/edit`}>
                        {t('rubric:edit')}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
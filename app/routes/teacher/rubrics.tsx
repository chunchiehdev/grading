import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { Plus, FileText, Clock, Edit, Eye, Calendar } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { listRubrics } from '@/services/rubric.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/ui/stats-card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { useTranslation } from 'react-i18next';


interface LoaderData {
  teacher: { id: string; email: string; role: string; name: string };
  rubricsData: {
    rubrics: Array<{
      id: string;
      name: string;
      description: string;
      isActive: boolean;
      isTemplate: boolean;
      version: number;
      updatedAt: Date;
      criteriaCount?: number;
    }>;
    error?: string;
  };
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);
  const rubricsData = await listRubrics(teacher.id);

  return {
    teacher,
    rubricsData,
  };
}

export default function TeacherRubrics() {
  const { teacher, rubricsData } = useLoaderData<typeof loader>();

  return <RubricsContent teacher={teacher} rubricsData={rubricsData} />;
}

function RubricsContent({ 
  teacher, 
  rubricsData 
}: { 
  teacher: { id: string; email: string; role: string; name: string };
  rubricsData: {
    rubrics: Array<{
      id: string;
      name: string;
      description: string;
      isActive: boolean;
      isTemplate: boolean;
      version: number;
      updatedAt: Date;
      criteriaCount?: number;
    }>;
    error?: string;
  };
}) {
  const { t } = useTranslation(['rubric', 'common']);
  const { rubrics = [], error } = rubricsData;
  const activeRubrics = rubrics.filter(r => r.isActive);
  const templateRubrics = rubrics.filter(r => r.isTemplate);

  const headerActions = (
    <Button asChild>
      <Link to="/teacher/rubrics/new">
        <Plus className="w-4 h-4 mr-2" />
        {t('rubric:new')}
      </Link>
    </Button>
  );


  return (
    <div>
      <PageHeader
        title={t('rubric:title')}
        subtitle={t('rubric:subtitle')}
        actions={headerActions}
      />

      <div className="max-w-7xl mx-auto space-y-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard title={t('rubric:total')} value={rubrics.length} icon={FileText} variant="transparent" />
            <StatsCard title={t('rubric:active')} value={activeRubrics.length} icon={Clock} variant="transparent" />
            <StatsCard title={t('rubric:template')} value={templateRubrics.length} icon={Calendar} variant="transparent" />
          </div>

          {/* Error State */}
          {error && (
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="pt-6">
                <p className="text-destructive">{t('rubric:errorLoading', { error })}</p>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!error && rubrics.length === 0 && (
            <Card className="bg-card text-card-foreground border">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {t('rubric:emptyState.categoriesTitle')}
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {t('rubric:emptyState.categoriesDescription')}
                  </p>
                  <Button asChild>
            <Link to="/teacher/rubrics/new">
              <Plus className="w-4 h-4 mr-2" />
              {t('rubric:emptyState.action')}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )}

          {/* Rubrics Grid */}
          {!error && rubrics.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rubrics.map((rubric) => (
                <RubricCard key={rubric.id} rubric={rubric} />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

function RubricCard({ 
  rubric 
}: { 
  rubric: {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    isTemplate: boolean;
    version: number;
    updatedAt: Date;
    criteriaCount?: number;
  };
}) {
  const { t } = useTranslation(['rubric', 'common']);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary/20 bg-card text-card-foreground border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
              <Link to={`/teacher/rubrics/${rubric.id}`} className="block">
                {rubric.name}
              </Link>
            </CardTitle>
            {rubric.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {rubric.description}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status and Version */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {rubric.isActive ? (
              <Badge variant="default" className="text-xs">Active</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Inactive</Badge>
            )}
            {rubric.isTemplate && (
              <Badge variant="outline" className="text-xs">Template</Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            v{rubric.version}
          </span>
        </div>

        {/* Last Updated */}
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 mr-2" />
          <span>{t('rubric:update')} {formatDate(rubric.updatedAt)}</span>
        </div>

        {/* Criteria Count */}
        {typeof rubric.criteriaCount === 'number' && (
          <div className="flex items-center text-sm text-muted-foreground">
            <FileText className="w-4 h-4 mr-2" />
            <span>{rubric.criteriaCount} criteria</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2 border-t border-border">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to={`/teacher/rubrics/${rubric.id}`}>
              <Eye className="w-4 h-4 mr-1" />
              {t('rubric:view')}
            </Link>
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link to={`/teacher/rubrics/${rubric.id}/edit`}>
              <Edit className="w-4 h-4 mr-1" />
              {t('rubric:edit')}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

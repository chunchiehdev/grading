import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { requireTeacher } from '@/services/auth.server';
import { getOverallTeacherStats, getCoursePerformance, getRubricUsage } from '@/services/analytics.server';
import { useTranslation } from 'react-i18next';

interface LoaderData {
  stats: Awaited<ReturnType<typeof getOverallTeacherStats>>;
  courses: Awaited<ReturnType<typeof getCoursePerformance>>;
  rubrics: Awaited<ReturnType<typeof getRubricUsage>>;
  statusDistribution: { name: string; value: number }[];
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);

  const [stats, courses, rubrics] = await Promise.all([
    getOverallTeacherStats(teacher.id),
    getCoursePerformance(teacher.id),
    getRubricUsage(teacher.id),
  ]);

  const statusTotals: Record<string, number> = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0, SKIPPED: 0 };
  courses.forEach((c) => {
    Object.entries(c.statusCounts).forEach(([k, v]) => {
      statusTotals[k] = (statusTotals[k] || 0) + (v as number);
    });
  });
  const statusDistribution = Object.entries(statusTotals).map(([name, value]) => ({ name, value }));

  return { stats, courses, rubrics, statusDistribution };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#93c5fd',
  PROCESSING: '#fbbf24',
  COMPLETED: '#34d399',
  FAILED: '#f87171',
  SKIPPED: '#a78bfa',
};

export default function TeacherAnalytics() {
  const { stats, courses, rubrics, statusDistribution } = useLoaderData<typeof loader>();
  const { t } = useTranslation(['analytics', 'common']);

  return (
    <div>
      <PageHeader title={t('analytics:title')} subtitle={t('analytics:subtitle')} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* <StatsCard title="Total Courses" value={stats.totalCourses} variant="transparent" />
          <StatsCard title="Total Students" value={stats.totalStudents} variant="transparent" />
          <StatsCard title="Total Submissions" value={stats.totalSubmissions} variant="transparent" />
          <StatsCard title="Average Score" value={Number(stats.averageScore.toFixed(1))} variant="transparent" /> */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('analytics:avgScorePerCourse')}</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courses.map((c) => ({ name: c.name, avg: Number(c.averageScore.toFixed(1)) }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#60a5fa" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('analytics:submissionStatus')}</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusDistribution} dataKey="value" nameKey="name" outerRadius={100} label>
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#93c5fd'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('analytics:rubricUsage')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rubrics.map((r) => (
                <div key={r.id} className="rounded-lg border p-4">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {t('analytics:usedInAssignments', { count: r.usageCount })}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t('analytics:avgScore', { score: Number(r.averageScore.toFixed(1)) })}
                  </div>
                </div>
              ))}
              {rubrics.length === 0 && <div className="text-gray-600">{t('analytics:noRubrics')}</div>}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

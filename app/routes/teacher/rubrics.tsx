import { type LoaderFunctionArgs } from 'react-router';
import { requireTeacher } from '@/services/auth.server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export async function loader({ request }: LoaderFunctionArgs) {
  const teacher = await requireTeacher(request);
  return { teacher };
}

export default function TeacherRubrics() {
  return (
    <div>
      <PageHeader title="Manage Rubrics" subtitle="Create and edit grading rubrics" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>My Rubrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Rubric management coming soon...</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 
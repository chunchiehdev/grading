import { type LoaderFunctionArgs } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export async function loader({ request }: LoaderFunctionArgs) {
  const student = await requireStudent(request);
  return { student };
}

export default function StudentSubmissions() {
  return (
    <div>
      <PageHeader title="My Submissions" subtitle="Track your submitted assignments" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Submission History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Submission history coming soon...</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 
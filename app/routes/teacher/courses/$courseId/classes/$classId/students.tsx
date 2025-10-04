import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { Users } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LoaderData {
  courseId: string;
  classId: string;
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  await requireTeacher(request);

  const { courseId, classId } = params;
  if (!courseId || !classId) {
    throw new Response('Class not found', { status: 404 });
  }

  return { courseId, classId };
}

export default function ClassStudentsPlaceholder() {
  const { courseId, classId } = useLoaderData<typeof loader>();

  return (
    <div>
      <PageHeader
        title="班次學生"
        subtitle="班次學生清單的頁面尚待實作"
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              開發中
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              此頁面預計用於管理班次學生以及相關資訊，目前為佔位頁面。
              現有課程詳情頁已提供班次概覽與操作。
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              班次 ID：{classId}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


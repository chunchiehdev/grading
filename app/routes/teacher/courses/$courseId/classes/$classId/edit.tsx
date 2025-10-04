import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Form, Link } from 'react-router';
import { Pencil } from 'lucide-react';

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

export async function action() {
  throw new Response('Class editing is not yet implemented', { status: 501 });
}

export default function EditClassPlaceholder() {
  const { courseId, classId} = useLoaderData<typeof loader>();

  return (
    <div>
      <PageHeader
        title="編輯班次"
        subtitle="班次編輯功能尚待實作"
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              開發中
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              此頁面將支援更新班次資訊，目前為佔位頁面。
              建議先在課程詳情頁進行班次相關操作。
            </p>

            <Form method="post" className="mt-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                班次 ID：{classId}
              </p>
              <Button type="submit" disabled>
                功能開發中
              </Button>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


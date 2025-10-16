import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { Users, Mail, Calendar, User, UserPlus } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { getClassStudents } from '@/services/class.server';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';

interface LoaderData {
  courseId: string;
  classId: string;
  class: {
    id: string;
    name: string;
    course: {
      id: string;
      name: string;
    };
  };
  students: Array<{
    enrollmentId: string;
    enrolledAt: Date;
    student: {
      id: string;
      name: string;
      email: string;
      picture: string | null;
    };
  }>;
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<LoaderData> {
  const teacher = await requireTeacher(request);

  const { courseId, classId } = params;
  if (!courseId || !classId) {
    throw new Response('Class not found', { status: 404 });
  }

  try {
    const data = await getClassStudents(classId, teacher.id);
    return {
      courseId,
      classId,
      class: data.class,
      students: data.students,
    };
  } catch (error) {
    console.error('Error loading class students:', error);
    throw new Response('Class not found', { status: 404 });
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ClassStudents() {
  const { class: classData, students, courseId, classId } = useLoaderData<typeof loader>();

  return (
    <div>
      <PageHeader
        title="學生名單"
        subtitle={
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="px-2 py-0.5 text-xs">
              {students.length} 位學生
            </Badge>
            <span className="text-sm text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{classData.name}</span>
          </div>
        }
        actions={
          <Button size="default">
            <UserPlus className="w-4 h-4 mr-2" />
            新增學生
          </Button>
        }
      />

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-background rounded-lg border shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-3 bg-muted/30 border-b">
            <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <div className="col-span-12 sm:col-span-4">學生</div>
              <div className="col-span-12 sm:col-span-5 hidden sm:block">Email</div>
              <div className="col-span-12 sm:col-span-3 hidden sm:block">加入時間</div>
            </div>
          </div>

          {/* List Content */}
          {students.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-4">
                <Users className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">尚無學生</h3>
              <p className="text-base text-muted-foreground">目前還沒有學生加入此時段</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {students.map((enrollment) => (
                <div key={enrollment.enrollmentId} className="px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Student Column */}
                    <div className="col-span-12 sm:col-span-4 flex items-center gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={enrollment.student.picture || undefined} alt={enrollment.student.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{enrollment.student.name}</p>
                        <p className="text-xs text-muted-foreground truncate sm:hidden flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {enrollment.student.email}
                        </p>
                      </div>
                    </div>

                    {/* Email Column - Hidden on mobile */}
                    <div className="col-span-5 hidden sm:block">
                      <p className="text-sm text-muted-foreground truncate flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        {enrollment.student.email}
                      </p>
                    </div>

                    {/* Enrolled Date Column - Hidden on mobile */}
                    <div className="col-span-3 hidden sm:block">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        {formatDate(enrollment.enrolledAt)}
                      </p>
                    </div>

                    {/* Mobile date display */}
                    <div className="col-span-12 sm:hidden text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      {formatDate(enrollment.enrolledAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

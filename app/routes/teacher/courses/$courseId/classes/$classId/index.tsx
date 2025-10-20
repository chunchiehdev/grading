import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { Users, Calendar, MapPin, Edit, UserPlus, ClipboardList } from 'lucide-react';

import { requireTeacher } from '@/services/auth.server';
import { getClassById, getClassStudents } from '@/services/class.server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageHeader } from '@/components/ui/page-header';

interface LoaderData {
  courseId: string;
  classId: string;
  class: {
    id: string;
    name: string;
    schedule: any | null;
    capacity: number | null;
    course: {
      id: string;
      name: string;
      code: string | null;
    };
    _count?: {
      enrollments: number;
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
    const classData = await getClassById(classId, teacher.id);
    if (!classData) {
      throw new Response('Class not found', { status: 404 });
    }

    const studentsData = await getClassStudents(classId, teacher.id);

    return {
      courseId,
      classId,
      class: classData,
      students: studentsData.students,
    };
  } catch (error) {
    console.error('Error loading class:', error);
    throw new Response('Class not found', { status: 404 });
  }
}

// Helper function to format schedule
function formatSchedule(schedule: any): string {
  if (!schedule?.weekday || !schedule?.periodCode) return '未設定';

  const periodNames: Record<string, string> = {
    '1': '第1節',
    '2': '第2節',
    '3': '第3節',
    '4': '第4節',
    '5': '第5節',
    '6': '第6節',
    '7': '第7節',
    '8': '第8節',
    '9': '第9節',
    Z: '第Z節',
    A: '第A節',
    B: '第B節',
    C: '第C節',
    D: '第D節',
  };
  return `星期${schedule.weekday} ${periodNames[schedule.periodCode] || schedule.periodCode}`;
}

export default function ClassIndex() {
  const { class: classData, students, courseId, classId } = useLoaderData<typeof loader>();

  const schedule = classData.schedule;
  const studentCount = students.length;
  const capacity = classData.capacity;

  return (
    <div>
      <PageHeader
        title={classData.name}
        subtitle={
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="px-2 py-0.5 text-xs">
              {studentCount} 位學生
              {capacity && ` / ${capacity}`}
            </Badge>
            {classData.course.code && (
              <>
                <span className="text-sm text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground">{classData.course.code}</span>
              </>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="default">
              <Link to={`/teacher/courses/${courseId}/classes/${classId}/edit`}>
                <Edit className="w-4 h-4 mr-2" />
                編輯
              </Link>
            </Button>
            <Button size="default">
              <UserPlus className="w-4 h-4 mr-2" />
              新增學生
            </Button>
          </div>
        }
      />

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Class Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Schedule Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">時段資訊</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">上課時間</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{formatSchedule(schedule)}</p>
                  </div>
                </div>

                {schedule?.room && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">教室</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{schedule.room}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">學生人數</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      {studentCount} 位學生
                      {capacity && ` (上限 ${capacity} 位)`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">快速操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" className="w-full justify-start" size="sm">
                  <Link to={`/teacher/courses/${courseId}/classes/${classId}/students`}>
                    <Users className="w-4 h-4 mr-2" />
                    查看學生名單
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start" size="sm">
                  <Link to={`/teacher/courses/${courseId}/assignments`}>
                    <ClipboardList className="w-4 h-4 mr-2" />
                    查看作業列表
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Students List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">學生名單</CardTitle>
                    <CardDescription className="mt-1">
                      {studentCount === 0 ? '目前還沒有學生加入' : `共 ${studentCount} 位學生`}
                    </CardDescription>
                  </div>
                  <Button asChild size="sm">
                    <Link to={`/teacher/courses/${courseId}/classes/${classId}/students`}>查看全部</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-3">
                      <Users className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">尚無學生加入此時段</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {students.slice(0, 6).map((enrollment) => (
                      <div
                        key={enrollment.enrollmentId}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Avatar className="h-9 w-9 flex-shrink-0">
                          <AvatarImage src={enrollment.student.picture || undefined} alt={enrollment.student.name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                            {enrollment.student.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{enrollment.student.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{enrollment.student.email}</p>
                        </div>
                      </div>
                    ))}
                    {students.length > 6 && (
                      <div className="pt-2 text-center">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/teacher/courses/${courseId}/classes/${classId}/students`}>
                            查看其他 {students.length - 6} 位學生
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

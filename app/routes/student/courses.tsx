import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Link } from 'react-router';
import { BookOpen, Users, FileText, Calendar, Clock, User, UserPlus, ArrowLeft } from 'lucide-react';

import { requireStudent } from '@/services/auth.server';
import { getStudentEnrolledCourses, type CourseWithEnrollmentInfo } from '@/services/enrollment.server';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface LoaderData {
  student: { id: string; email: string; role: string; name: string };
  courses: CourseWithEnrollmentInfo[];
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const student = await requireStudent(request);
  const courses = await getStudentEnrolledCourses(student.id);
  return { student, courses };
}

export default function StudentCourses() {
  const { student, courses } = useLoaderData<typeof loader>();

  const headerActions = (
    <Button asChild variant="outline">
      <Link to="/student/dashboard">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Link>
    </Button>
  );

  // If no courses enrolled
  if (courses.length === 0) {
    return (
      <div className="bg-background text-foreground">
        <PageHeader
          title="My Courses"
          subtitle="You haven't joined any courses yet"
          actions={headerActions}
        />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="bg-card text-card-foreground border">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <UserPlus className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No Courses Yet
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Get started by joining your first course. Ask your teacher for an invitation code or QR code.
                </p>
                
                <div className="bg-muted rounded-lg p-4 mb-6 max-w-md mx-auto">
                  <h4 className="font-medium text-foreground mb-2">How to Join a Course</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 text-left">
                    <li>• Get an invitation code from your teacher</li>
                    <li>• Scan a QR code if provided</li>
                    <li>• Visit the invitation link</li>
                    <li>• Contact your teacher for assistance</li>
                  </ul>
                </div>

                <Button asChild>
                  <Link to="/student/dashboard">
                    Back to Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground">
      <PageHeader
        title="My Courses"
        subtitle={`You're enrolled in ${courses.length} course${courses.length !== 1 ? 's' : ''}`}
        actions={headerActions}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Course Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card text-card-foreground border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                    <p className="text-2xl font-bold text-foreground">{courses.length}</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card text-card-foreground border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Assignments</p>
                    <p className="text-2xl font-bold text-foreground">
                      {courses.reduce((total, course) => total + (course._count?.assignmentAreas || 0), 0)}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card text-card-foreground border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Recently Joined</p>
                    <p className="text-sm text-foreground">
                      {courses.length > 0 && courses[0].enrolledAt 
                        ? new Date(courses[0].enrolledAt).toLocaleDateString()
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Course Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

interface CourseCardProps {
  course: CourseWithEnrollmentInfo;
}

function CourseCard({ course }: CourseCardProps) {
  const enrolledDate = course.enrolledAt ? new Date(course.enrolledAt) : null;
  const totalEnrollments = course._count?.enrollments || 0;
  const totalAssignments = course._count?.assignmentAreas || 0;

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary/20 bg-card text-card-foreground border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
              <Link to={`/student/assignments`} className="block">
                {course.name}
              </Link>
            </CardTitle>
            {course.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {course.description}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Course Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl font-bold text-primary">
              {totalAssignments}
            </div>
            <div className="text-xs text-muted-foreground font-medium">Assignments</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-xl font-bold text-primary">
              {totalEnrollments}
            </div>
            <div className="text-xs text-muted-foreground font-medium">Students</div>
          </div>
        </div>

        {/* Course Info */}
        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <User className="w-4 h-4 mr-2" />
            <span>Instructor: {course.teacher.name}</span>
          </div>
          {enrolledDate && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>Joined {enrolledDate.toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Enrollment Status */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Badge variant="secondary" className="text-xs">
            Enrolled
          </Badge>
          <span className="text-xs text-muted-foreground">
            Active Course
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to={`/student/assignments`}>
              View Assignments
            </Link>
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link to={`/student/assignments`}>
              Browse Content
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

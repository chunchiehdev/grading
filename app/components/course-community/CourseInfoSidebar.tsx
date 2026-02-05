import { Shield, Eye, Calendar, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface CourseInfoSidebarProps {
  course: {
    name: string;
    description: string | null;
    createdAt: string;
  };
  stats: {
    memberCount: number;
    postCount: number;
    commentCount: number;
    likeCount: number;
  };
  isPrivate?: boolean;
}

function CourseInfoContent({ course, stats, isPrivate = true }: CourseInfoSidebarProps) {
  return (
    <div className="space-y-4">
      {/* About Section */}
      <Card className="border border-[#E8E4DD] dark:border-[#393A3B] bg-[#FFFEFB] dark:bg-[#242526] shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-[#4A4036] dark:text-[#E4E6EB]">關於</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Privacy Status */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F0EDE8] dark:bg-[#3A3B3C] flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-[#5B8A8A] dark:text-[#E4E6EB]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#4A4036] dark:text-[#E4E6EB]">{isPrivate ? '私密' : '公開'}</p>
              <p className="text-xs text-[#9C9488] dark:text-[#B0B3B8] mt-0.5">
                {isPrivate ? '只有成員可以看到參與者和貼文' : '所有人都可以看到內容'}
              </p>
            </div>
          </div>

          {/* Visibility */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F0EDE8] dark:bg-[#3A3B3C] flex items-center justify-center flex-shrink-0">
              <Eye className="h-5 w-5 text-[#5B8A8A] dark:text-[#E4E6EB]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#4A4036] dark:text-[#E4E6EB]">開放搜尋</p>
              <p className="text-xs text-[#9C9488] dark:text-[#B0B3B8] mt-0.5">任何人都能找到這個課程</p>
            </div>
          </div>

          {/* Created Date */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F0EDE8] dark:bg-[#3A3B3C] flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-[#5B8A8A] dark:text-[#E4E6EB]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#4A4036] dark:text-[#E4E6EB]">建立時間</p>
              <p className="text-xs text-[#9C9488] dark:text-[#B0B3B8] mt-0.5" suppressHydrationWarning>
                {new Date(course.createdAt).toLocaleDateString('zh-TW', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Description */}
      {course.description && (
        <Card className="border border-[#E8E4DD] dark:border-[#393A3B] bg-[#FFFEFB] dark:bg-[#242526] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#4A4036] dark:text-[#E4E6EB]">課程簡介</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#4A4036] dark:text-[#B0B3B8] leading-relaxed">{course.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Mobile trigger button to be placed in the main content area
export function CourseInfoMobileTrigger({ course, stats, isPrivate }: CourseInfoSidebarProps) {
  return (
    <div className="lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 bg-white dark:bg-[#242526] border-[#E8E4DD] dark:border-[#393A3B]"
          >
            <Info className="h-4 w-4" />
            課程資訊
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px] sm:w-[350px] bg-[#FAF8F5] dark:bg-[#18191A] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-[#4A4036] dark:text-[#E4E6EB]">{course.name}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <CourseInfoContent course={course} stats={stats} isPrivate={isPrivate} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function CourseInfoSidebar({ course, stats, isPrivate = true }: CourseInfoSidebarProps) {
  return (
    <aside className="w-80 border-l border-[#E8E4DD] dark:border-[#393A3B] bg-[#FAF8F5] dark:bg-[#18191A] h-screen sticky top-0 overflow-y-auto hidden lg:block">
      <div className="p-4">
        <CourseInfoContent course={course} stats={stats} isPrivate={isPrivate} />
      </div>
    </aside>
  );
}


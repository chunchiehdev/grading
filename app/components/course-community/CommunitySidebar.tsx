import { Link } from 'react-router';
import { LayoutDashboard, Settings, Users, FileText, BarChart3, Shield, ChevronRight, Bell, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface SidebarItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  count?: number;
  isActive?: boolean;
  children?: SidebarItem[];
}

interface CommunitySidebarProps {
  courseId: string;
  courseName: string;
  isTeacher: boolean;
  currentPath: string;
}

function getMenuItems(courseId: string, currentPath: string, isTeacher: boolean): SidebarItem[] {
  const menuItems: SidebarItem[] = [
    {
      label: '總覽',
      icon: LayoutDashboard,
      path: `/teacher/courses/${courseId}/community`,
      isActive: currentPath === 'overview',
    },
  ];

  if (isTeacher) {
    menuItems.push(
      {
        label: '管理貼文',
        icon: FileText,
        path: `/teacher/courses/${courseId}/community/posts`,
        isActive: currentPath === 'posts',
      },
      {
        label: '成員管理',
        icon: Users,
        path: `/teacher/courses/${courseId}/community/members`,
        isActive: currentPath === 'members',
      },
      {
        label: '統計報告',
        icon: BarChart3,
        path: `/teacher/courses/${courseId}/community/insights`,
        isActive: currentPath === 'insights',
      },
      {
        label: '審核提醒',
        icon: Bell,
        path: `/teacher/courses/${courseId}/community/moderation`,
        count: 0,
        isActive: currentPath === 'moderation',
      },
      {
        label: '設定',
        icon: Settings,
        path: `/teacher/courses/${courseId}/community/settings`,
        isActive: currentPath === 'settings',
      }
    );
  }

  return menuItems;
}

function SidebarNavContent({ menuItems, isTeacher }: { menuItems: SidebarItem[]; isTeacher: boolean }) {
  return (
    <>
      {/* Navigation Menu */}
      <nav className="p-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.isActive;

            return (
              <li key={item.label}>
                {item.path ? (
                  <Link
                    to={item.path}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer group',
                      isActive
                        ? 'bg-[#5B8A8A] dark:bg-[#5B8A8A]/30 text-white dark:text-[#E4E6EB] font-medium shadow-sm'
                        : 'hover:bg-[#F0EDE8] dark:hover:bg-[#3A3B3C] text-[#4A4036] dark:text-[#E4E6EB]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn('h-5 w-5', isActive ? 'text-white dark:text-[#E4E6EB]' : 'text-[#9C9488] dark:text-[#B0B3B8]')} />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="bg-[#D4847C] text-white text-xs font-medium px-2 py-0.5 rounded-full">
                        {item.count}
                      </span>
                    )}
                    {!isActive && (
                      <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-60 transition-opacity text-[#9C9488]" />
                    )}
                  </Link>
                ) : (
                  <div className="px-3 py-2 text-xs font-semibold text-[#9C9488] dark:text-[#B0B3B8] uppercase tracking-wider">
                    {item.label}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      {isTeacher && (
        <div className="mt-auto p-4 border-t border-[#E8E4DD] dark:border-[#393A3B] bg-[#FFFEFB] dark:bg-[#242526]">
          <div className="text-xs text-[#9C9488] dark:text-[#B0B3B8]">
            <p className="font-medium text-[#4A4036] dark:text-[#E4E6EB] mb-1">管理員權限</p>
            <p>你可以管理這個課程的所有內容</p>
          </div>
        </div>
      )}
    </>
  );
}

// Mobile trigger button for the sidebar
export function CommunitySidebarMobileTrigger({ courseId, courseName, isTeacher, currentPath }: CommunitySidebarProps) {
  const menuItems = getMenuItems(courseId, currentPath, isTeacher);

  return (
    <div className="md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 bg-white dark:bg-[#242526] border-[#E8E4DD] dark:border-[#393A3B]"
          >
            <Menu className="h-4 w-4" />
            選單
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0 bg-[#FAF8F5] dark:bg-[#18191A] flex flex-col">
          <SheetHeader className="p-4 border-b border-[#E8E4DD] dark:border-[#393A3B]">
            <SheetTitle className="font-sans text-lg font-semibold text-[#4A4036] dark:text-[#E4E6EB] truncate text-left">
              {courseName}
            </SheetTitle>
            <p className="text-xs text-[#9C9488] dark:text-[#B0B3B8] mt-1 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              私密課程
            </p>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <SidebarNavContent menuItems={menuItems} isTeacher={isTeacher} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function CommunitySidebar({ courseId, courseName, isTeacher, currentPath }: CommunitySidebarProps) {
  const menuItems = getMenuItems(courseId, currentPath, isTeacher);

  return (
    <aside className="w-64 border-r border-[#E8E4DD] dark:border-[#393A3B] bg-[#FAF8F5] dark:bg-[#18191A] h-screen sticky top-0 overflow-y-auto hidden md:flex md:flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-[#E8E4DD] dark:border-[#393A3B]">
        <h2 className="font-sans text-lg font-semibold text-[#4A4036] dark:text-[#E4E6EB] truncate">{courseName}</h2>
        <p className="text-xs text-[#9C9488] dark:text-[#B0B3B8] mt-1 flex items-center gap-1">
          <Shield className="h-3 w-3" />
          私密課程
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <SidebarNavContent menuItems={menuItems} isTeacher={isTeacher} />
      </div>
    </aside>
  );
}


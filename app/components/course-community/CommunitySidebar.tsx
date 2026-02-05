import { Link } from 'react-router';
import { LayoutDashboard, Settings, Users, FileText, BarChart3, Shield, ChevronRight, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarItem {
  label: string;
  icon: any;
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

export function CommunitySidebar({ courseId, courseName, isTeacher, currentPath }: CommunitySidebarProps) {
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

  return (
    <aside className="w-64 border-r border-[#E8E4DD] dark:border-[#393A3B] bg-[#FAF8F5] dark:bg-[#18191A] h-screen sticky top-0 overflow-y-auto hidden md:block">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-[#E8E4DD] dark:border-[#393A3B]">
        <h2 className="font-sans text-lg font-semibold text-[#4A4036] dark:text-[#E4E6EB] truncate">{courseName}</h2>
        <p className="text-xs text-[#9C9488] dark:text-[#B0B3B8] mt-1 flex items-center gap-1">
          <Shield className="h-3 w-3" />
          私密課程
        </p>
      </div>

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
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#E8E4DD] dark:border-[#393A3B] bg-[#FFFEFB] dark:bg-[#242526]">
          <div className="text-xs text-[#9C9488] dark:text-[#B0B3B8]">
            <p className="font-medium text-[#4A4036] dark:text-[#E4E6EB] mb-1">管理員權限</p>
            <p>你可以管理這個課程的所有內容</p>
          </div>
        </div>
      )}
    </aside>
  );
}


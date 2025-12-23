import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Share2, LogOut, User as UserIcon, Menu, Globe, Settings, Bell } from 'lucide-react';
import { Link, useLoaderData } from 'react-router';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { User } from '@/root';
import type { VersionInfo } from '@/services/version.server';
import { Badge } from '@/components/ui/badge';
import { useSubmissionStore } from '@/stores/submissionStore';
import { NotificationCenter } from '@/components/teacher/NotificationCenter';

interface NavHeaderProps {
  title?: string;
  onShare?: () => void;
  className?: string;
}

export function NavHeader({ title, onShare, className }: NavHeaderProps) {
  // Always call hooks in the same order - before any early returns
  const { user, versionInfo } = useLoaderData() as { user: User | null; versionInfo: VersionInfo | null };

  // Use translation with error handling - always call this hook
  const { t, ready } = useTranslation('navigation', { useSuspense: false });

  // Get unread count for teachers only
  const unreadCount = useSubmissionStore((state) => state.unreadCount);
  const isTeacher = user?.role === 'TEACHER';

  // Early return after all hooks are called - root.tsx already handles conditional rendering
  if (!user) {
    return null;
  }

  // Fallback function for when i18n isn't ready
  const safeT = (key: string, fallback: string = key) => {
    if (!ready || !t) {
      return fallback;
    }
    try {
      return t(key, fallback);
    } catch (error) {
      console.warn(`Translation error for key "${key}":`, error);
      return fallback;
    }
  };

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // 登出成功，重定向到首頁
        window.location.href = '/?logout=success';
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      <header className={cn(className)}>
        <nav className="relative w-full flex items-center justify-between py-3 px-4 sm:px-6 lg:px-8">
          {/* Left Section - Logo & Title */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/home.png"
                alt="GradeMaster Logo"
                className="w-8 h-8 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded dark:invert"
              />

              <div className="hidden sm:block text-lg lg:text-xl 2xl:text-2xl font-semibold text-foreground">
                {title || safeT('title', 'Grading System')}
              </div>
            </Link>
          </div>

          {/* Center Section - Mobile Title */}
          <div className="absolute left-1/2 -translate-x-1/2 sm:hidden">
            <div className="text-sm font-medium text-foreground/80 truncate max-w-32">
              {title || safeT('title', 'Grading System')}
            </div>
          </div>

          {/* Right Section - Desktop Controls */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4 2xl:gap-5">
            <LanguageSwitcher />
            {onShare && (
              <Button variant="outline" size="sm" onClick={onShare} className="gap-2 lg:h-10 2xl:h-11 lg:px-4 2xl:px-5">
                <Share2 className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="lg:text-base">{safeT('share', 'Share')}</span>
              </Button>
            )}
            <ModeToggle />
            {isTeacher && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative lg:h-10 2xl:h-11">
                    <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-0">
                  <NotificationCenter />
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-3 lg:h-10 2xl:h-11 lg:px-4 2xl:px-5">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.email}
                      className="w-6 h-6 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-full"
                      referrerPolicy='no-referrer'
                    />
                  ) : (
                    <UserIcon className="w-4 h-4 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled>
                  <span className="text-sm truncate">{user.email}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    {safeT('settings', 'Settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {versionInfo && (
                  <>
                    <DropdownMenuItem disabled>
                      <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">Version</span>
                          <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono">
                            v{versionInfo.version}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">Environment</span>
                          <Badge
                            variant={versionInfo.environment === 'production' ? 'default' : 'secondary'}
                            className="text-xs px-2 py-0.5"
                          >
                            {versionInfo.environment === 'production' ? 'Production' : 'Development'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">Branch</span>
                          <span className="text-xs font-mono text-foreground/70">{versionInfo.branch}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">Commit</span>
                          <span className="text-xs font-mono text-foreground/70" title={versionInfo.commitHash}>
                            {versionInfo.commitHash.substring(0, 7)}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  {safeT('logout', 'Logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right Section - Mobile Menu */}
          <div className="flex md:hidden items-center gap-2">
            <ModeToggle />
            {isTeacher && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative px-2">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 p-0">
                  <NotificationCenter />
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="px-2">
                  <Menu className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled>
                  <span className="text-sm truncate">{user.email}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    {safeT('settings', 'Settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {versionInfo && (
                  <>
                    <DropdownMenuItem disabled>
                      <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">Version</span>
                          <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono">
                            v{versionInfo.version}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">Environment</span>
                          <Badge
                            variant={versionInfo.environment === 'production' ? 'default' : 'secondary'}
                            className="text-xs px-2 py-0.5"
                          >
                            {versionInfo.environment === 'production' ? 'Production' : 'Development'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">Branch</span>
                          <span className="text-xs font-mono text-foreground/70">{versionInfo.branch}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">Commit</span>
                          <span className="text-xs font-mono text-foreground/70" title={versionInfo.commitHash}>
                            {versionInfo.commitHash.substring(0, 7)}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {onShare && (
                  <>
                    <DropdownMenuItem onClick={onShare}>
                      <Share2 className="w-4 h-4 mr-2" />
                      {safeT('share', 'Share')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <div className="flex items-center justify-between w-full cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      {safeT('language', 'Language')}
                    </div>
                    <LanguageSwitcher />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  {safeT('logout', 'Logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </header>
    </>
  );
}

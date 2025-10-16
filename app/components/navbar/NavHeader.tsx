import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Share2, LogOut, User as UserIcon, Menu, Globe, Settings } from 'lucide-react';
import { Link } from 'react-router';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { useLoaderData } from 'react-router';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { User } from '@/root';
import type { VersionInfo } from '@/services/version.server';
import { Badge } from '@/components/ui/badge'; 

interface NavHeaderProps {
  title?: string;
  onShare?: () => void;
  className?: string;
}

export function NavHeader({
  title,
  onShare,
  className
}: NavHeaderProps) {
  // Always call hooks in the same order - before any early returns
  const { user, versionInfo } = useLoaderData() as { user: User | null; versionInfo: VersionInfo | null };
  
  // Use translation with error handling - always call this hook
  const { t, ready } = useTranslation('navigation', { useSuspense: false });

  // Early return after all hooks are called
  if (!user) {
    return (
      <div className="hidden">
        {/* Empty component to maintain consistent hook calls */}
      </div>
    );
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
      <header className={cn(
        'sticky top-0 z-50 bg-background ',
        className
      )}>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-3 lg:h-10 2xl:h-11 lg:px-4 2xl:px-5">
                  {user.picture ? (
                    <img src={user.picture} alt={user.email} className="w-6 h-6 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-full" />
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
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          v{versionInfo.version}
                        </Badge>
                        <Badge
                          variant={versionInfo.environment === 'production' ? 'default' : 'secondary'}
                          className="text-xs px-1 py-0"
                        >
                          {versionInfo.environment === 'production' ? 'PROD' : 'DEV'}
                        </Badge>
                        <span className="text-muted-foreground" title={`Commit: ${versionInfo.commitHash}`}>
                          {versionInfo.commitHash.substring(0, 7)}
                        </span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {safeT('logout', 'Logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right Section - Mobile Menu */}
          <div className="flex md:hidden items-center gap-2">
            <ModeToggle />
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
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          v{versionInfo.version}
                        </Badge>
                        <Badge
                          variant={versionInfo.environment === 'production' ? 'default' : 'secondary'}
                          className="text-xs px-1 py-0"
                        >
                          {versionInfo.environment === 'production' ? 'PROD' : 'DEV'}
                        </Badge>
                        <span className="text-muted-foreground" title={`Commit: ${versionInfo.commitHash}`}>
                          {versionInfo.commitHash.substring(0, 7)}
                        </span>
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
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                >
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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Share2, LogOut, User as UserIcon, Menu, Globe } from 'lucide-react';
import { Link } from 'react-router';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { useLoaderData } from 'react-router';
import { useLogout } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useState } from 'react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { User } from '@/root'; 

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
  const { user } = useLoaderData() as { user: User | null };
  const logout = useLogout();
  const [langDialogOpen, setLangDialogOpen] = useState(false);
  
  // Use translation with error handling - always call this hook
  const { t, ready, i18n } = useTranslation('navigation', { useSuspense: false });

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
    await logout.mutateAsync();
  };

  return (
    <>
      <header className={cn(
        'sticky top-0 z-50 bg-background shadow-sm border-b border-border',
        className
      )}>
        <nav className="relative mx-auto flex max-w-8xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Left Section - Logo & Title */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
               <img 
                 src="/logo4.png" 
                 alt="GradeMaster Logo" 
                 className="w-8 h-8 rounded"
               />
               
              <div className="hidden sm:block text-lg font-semibold text-foreground">
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
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher variant="dropdown" />
            {onShare && (
              <Button variant="outline" size="sm" onClick={onShare} className="gap-2">
                <Share2 className="w-4 h-4" />
                <span>{safeT('share', 'Share')}</span>
              </Button>
            )}
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-3">
                  {user.picture ? (
                    <img src={user.picture} alt={user.email} className="w-6 h-6 rounded-full" />
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )}
                  
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem disabled>
                  <span className="text-sm truncate">{user.email}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                  disabled={logout.isPending}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {logout.isPending ? safeT('loggingOut', 'Logging out...') : safeT('logout', 'Logout')}
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
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem disabled>
                  <span className="text-sm truncate">{user.email}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onShare && (
                  <>
                    <DropdownMenuItem onClick={onShare}>
                      <Share2 className="w-4 h-4 mr-2" />
{safeT('share', 'Share')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => setLangDialogOpen(true)}
                >
                  <Globe className="w-4 h-4 mr-2" />
{safeT('language', 'Language')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                  disabled={logout.isPending}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {logout.isPending ? safeT('loggingOut', 'Logging out...') : safeT('logout', 'Logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </header>

      <Dialog open={langDialogOpen} onOpenChange={setLangDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{safeT('selectLanguage', 'Select Language')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <LanguageSwitcher variant="tabs" className="w-full" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
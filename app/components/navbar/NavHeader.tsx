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
import { User } from '@/root'; // 確保路徑是正確的

interface NavHeaderProps {
  title?: string;
  onShare?: () => void;
  className?: string;
}

export function NavHeader({ 
  title = '作業評分系統', 
  onShare, 
  className 
}: NavHeaderProps) {
  const { user } = useLoaderData() as { user: User | null };
  console.log('NavHeader user:', user);
  const logout = useLogout();
  const [langDialogOpen, setLangDialogOpen] = useState(false);

  if (!user) {
    return null;
  }

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
            <Link to="/dashboard" className="flex items-center gap-3">
               <img 
                 src="/logo4.png" 
                 alt="GradeMaster Logo" 
                 className="w-8 h-8 rounded"
               />
               
              <div className="hidden sm:block text-lg font-semibold text-foreground">
                {title}
              </div>
            </Link>
          </div>

          {/* Center Section - Mobile Title */}
          <div className="absolute left-1/2 -translate-x-1/2 sm:hidden">
            <div className="text-sm font-medium text-foreground/80 truncate max-w-32">
              {title}
            </div>
          </div>

          {/* Right Section - Desktop Controls */}
          <div className="hidden md:flex items-center gap-3">
            {onShare && (
              <Button variant="outline" size="sm" onClick={onShare} className="gap-2">
                <Share2 className="w-4 h-4" />
                <span>分享</span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="px-2">
                  <Globe className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem onClick={() => {/* 切換到繁中 */}}>
                  繁體中文
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {/* 切換到英文 */}}>
                  English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                  {logout.isPending ? '登出中...' : '登出'}
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
                      分享
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => {/* 切換語言選單 */}}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  語言
                  {/* 或者可以做子選單 */}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                  disabled={logout.isPending}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {logout.isPending ? '登出中...' : '登出'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </header>

      <Dialog open={langDialogOpen} onOpenChange={setLangDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>選擇語言</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <Button variant="outline" onClick={() => {/* 切換語言 */}}>繁體中文</Button>
            <Button variant="outline" onClick={() => {/* 切換語言 */}}>English</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
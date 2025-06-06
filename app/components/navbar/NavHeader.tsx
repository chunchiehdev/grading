import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import { cn } from '@/lib/utils';
import { ChevronDown, Share2, LogOut, User, GraduationCap } from 'lucide-react';
import { Link } from 'react-router';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { useLoaderData } from 'react-router';
import { useLogout } from '@/hooks/useAuth';

interface NavHeaderProps {
  title?: string;
  onShare?: () => void;
  _userName?: string;
  userImage?: string;
  className?: string;
}

const NavHeader = ({ title = '作業評分系統', onShare, userImage, className }: NavHeaderProps) => {
  const { user } = useLoaderData() as { user: { email: string } | null };
  const logout = useLogout();

  if (!user) {
    return null;
  }

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    await logout.mutateAsync();
  };

  return (
    <div
      className={cn(
        'sticky top-0 p-3 mb-1.5 flex items-center justify-between z-10 h-[60px] font-semibold ',
        'border-b border-border',
        className
      )}
    >
      {/* Center Title */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-1 text-sm font-semibold text-foreground/80">{title}</div>
      </div>

      {/* Left Controls */}
      <div className="flex items-center gap-0">
        <Link to="/dashboard">
          <Button variant="ghost" className="flex items-center gap-3 ml-2 px-3 py-2 hover:bg-slate-50">
            {/* Logo Icon */}
            <div className="flex items-center gap-2">
              <div 
                className="w-12 h-10 flex items-center justify-center"
                dangerouslySetInnerHTML={{
                  __html: `<dotlottie-player src="https://lottie.host/955baaf6-ba82-4c0e-a72c-9a7b00bf7858/0tsxdhkaXh.lottie" background="transparent" speed="1" style="width: 40px; height: 40px" loop autoplay></dotlottie-player>`
                }}
              />
            </div>
          </Button>
        </Link>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onShare} className="flex items-center gap-2">
          <Share2 className="w-4 h-4" />
          <span>分享</span>
        </Button>
        <ModeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 p-0">
              {userImage ? (
                <img src={userImage} alt={user.email} className="w-8 h-8 rounded-full" />
              ) : (
                <User className="w-5 h-5" />
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
    </div>
  );
};

export { NavHeader };

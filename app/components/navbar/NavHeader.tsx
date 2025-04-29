import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";
import { ChevronDown, Share2, LogOut, User, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { Link, Form } from "react-router";
import { ModeToggle } from "@/components/mode-toggle";

interface NavHeaderProps {
  title?: string;
  onShare?: () => void;
  _userName?: string;
  userImage?: string;
  className?: string;
  user?: { email: string } | null;
}

const NavHeader = ({
  title = "作業評分系統",
  onShare,
  _userName,
  userImage,
  className,
  user,
}: NavHeaderProps) => {
  return (
    <div
      className={cn(
        "sticky top-0 p-3 mb-1.5 flex items-center justify-between z-10 h-[60px] font-semibold ",
        "border-b border-border",
        className
      )}
    >
      {/* Center Title */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-1 text-sm font-semibold text-foreground/80">
          {title}
        </div>
      </div>

      {/* Left Controls */}
      <div className="flex items-center gap-0">
        <Link to="/">
          <Button
            variant="ghost"
            className="flex items-center gap-1 ml-2 text-lg font-semibold"
          >
            <span>首頁</span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={onShare}
          className="flex items-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          <span>分享</span>
        </Button>
        <ModeToggle />
        {user && ( 
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-10 h-10 p-0"
              >
                {userImage ? (
                  <img
                    src={userImage}
                    alt={user.email}
                    className="w-8 h-8 rounded-full"
                  />
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
              <Form action="/logout" method="post">
                <DropdownMenuItem
                  asChild
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                >
                  <button type="submit" className="w-full flex items-center">
                    <LogOut className="w-4 h-4 mr-2" />
                    登出
                  </button>
                </DropdownMenuItem>
              </Form>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export { NavHeader };

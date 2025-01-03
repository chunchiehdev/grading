import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PanelLeft, Plus, ChevronDown, Share2, Menu } from "lucide-react";


interface NavHeaderProps {
  title?: string;
  onSidebarToggle?: () => void;
  onShare?: () => void;
  userName?: string;
  userImage?: string;
  className?: string;
}

const NavHeader = ({
  title = "作業評分系統",
  onSidebarToggle,
  onShare,
  userName,
  userImage,
  className,
}: NavHeaderProps) => {
  return (
    <div
      className={cn(
        "sticky top-0 p-3 mb-1.5 flex items-center justify-between z-10 h-[60px] font-semibold bg-white",
        "border-b border-gray-200",
        className
      )}
    >
      {/* Center Title */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-1 text-sm font-semibold text-gray-600">
          {title}
        </div>
      </div>

      {/* Left Controls */}
      <div className="flex items-center gap-0">
        
        <Button
          variant="ghost"
          className="flex items-center gap-1 ml-2 text-lg font-semibold"
        >
          {/* Just throw it in for now; fix it later.*/}
          <span>首頁</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
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

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-10 h-10 p-0"
              >
                {userImage ? (
                  <img
                    src={userImage}
                    alt={userName || "User"}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>設定檔</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export { NavHeader };

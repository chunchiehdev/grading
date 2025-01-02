import { Link } from "@remix-run/react";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen, PanelLeftClose, PlusCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  className,
  isCollapsed,
  onToggle,
}) => {
  
  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-screen z-[21]",
        "bg-gray-200",
        "transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[0px]" : "w-[260px]"
      )}
    >
      <div className="h-full w-full flex  flex-col">
        {/* Sidebar Header */}
        <div className="flex h-[60px] items-center justify-between px-3 border-b">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-xl" onClick={onToggle}>
                  {!isCollapsed ? <PanelLeftClose /> : <PanelLeftOpen />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isCollapsed ? "開啟側邊欄" : "關閉側邊欄"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {!isCollapsed && (
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-xl">
                      <PlusCircle />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>新增</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

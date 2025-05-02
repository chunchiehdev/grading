import { useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PanelLeftOpen, PanelLeftClose, PlusCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import PropTypes from 'prop-types';
// import { createNewGrading } from "@/utils/grading.server";

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ className, isCollapsed, onToggle }) => {
  const navigate = useNavigate();

  // const handleCreateNewGrading = useCallback(() => {
  //   createNewGrading(navigate, {
  //     source: 'sidebar',
  //     onNavigate: onToggle
  //   });
  // }, [navigate, onToggle]);

  return (
    <div
      className={cn(
        'fixed left-0 top-0 h-screen z-[21]',
        'bg-secondary',
        'transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-[0px]' : 'w-[260px]',
        className
      )}
    >
      <div className="h-full w-full flex flex-col">
        {/* Sidebar Header */}
        <div className="flex h-[60px] items-center justify-between px-3 border-b">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-xl" onClick={onToggle}>
                  {!isCollapsed ? <PanelLeftClose /> : <PanelLeftOpen />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{isCollapsed ? '開啟側邊欄' : '關閉側邊欄'}</TooltipContent>
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

Sidebar.propTypes = {
  className: PropTypes.string,
  isCollapsed: PropTypes.bool,
  onToggle: PropTypes.func,
};

export default Sidebar;

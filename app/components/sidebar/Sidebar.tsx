import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PanelLeftOpen, PanelLeftClose, PlusCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

import PropTypes from 'prop-types';

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ className, isCollapsed, onToggle }) => {
  const { t } = useTranslation('common');

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
              <TooltipContent side="right">{isCollapsed ? t('openSidebar') : t('closeSidebar')}</TooltipContent>
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
                  <TooltipContent>{t('add')}</TooltipContent>
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

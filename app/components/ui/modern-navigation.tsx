import * as React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface NavigationTab {
  label: string;
  value: string;
  to?: string; // Optional route for navigation
}

interface ModernNavigationProps {
  tabs: NavigationTab[];
  currentTab?: string;
  actions?: React.ReactNode;
  viewControls?: React.ReactNode;
  className?: string;
  onTabChange?: (value: string) => void;
}

export function ModernNavigation({
  tabs,
  currentTab,
  actions,
  viewControls,
  className,
  onTabChange,
}: ModernNavigationProps) {
  const activeTab = currentTab || tabs[0]?.value;

  const handleTabChange = (value: string) => {
    if (onTabChange) {
      onTabChange(value);
    }
  };

  const handleMobileTabChange = (value: string) => {
    if (onTabChange) {
      onTabChange(value);
    }
  };

  return (
    <div className={cn('flex items-center bg-background py-3 sm:py-4 w-full relative', className)}>
      <div className="w-full sm:w-[95%] md:w-[90%] lg:w-[85%] xl:w-[80%] mx-auto px-4 sm:px-6 flex items-center gap-3 sm:gap-4">
        {/* Desktop Tabs Navigation */}
        <div className="hidden md:flex flex-1 justify-start">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="bg-transparent border-none h-auto p-0 space-x-6 lg:space-x-8">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    'text-sm lg:text-base font-medium px-0 py-2',
                    'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
                    'data-[state=active]:border-b-2 data-[state=active]:border-primary',
                    'rounded-none border-b-2 border-transparent',
                    'hover:text-primary transition-colors'
                  )}
                >
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Mobile Select Dropdown */}
        <div className="flex md:hidden flex-1">
          <Select value={activeTab} onValueChange={handleMobileTabChange}>
            <SelectTrigger className={cn(
              'w-auto min-w-[140px] h-9',
              'border border-input bg-background',
              'text-sm font-medium',
              'focus:ring-2 focus:ring-ring focus:ring-offset-1',
              'transition-all'
            )}>
              <SelectValue>{tabs.find((tab) => tab.value === activeTab)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent className="min-w-[180px]">
              {tabs.map((tab) => (
                <SelectItem
                  key={tab.value}
                  value={tab.value}
                  className="text-sm py-2.5"
                >
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Actions - Right Side */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

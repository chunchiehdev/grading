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
    <div className={cn('flex items-center bg-background py-4 w-full relative', className)}>
      <div className="w-[95%] sm:w-[90%] lg:w-[85%] xl:w-[80%] mx-auto px-6 flex items-center">
        <div className="hidden md:flex flex-1 justify-start">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="bg-transparent border-none h-auto p-0 space-x-8">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    'text-base font-medium px-0 py-2',
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

        <div className="block md:hidden">
          <Select value={activeTab} onValueChange={handleMobileTabChange}>
            <SelectTrigger className="w-auto min-w-[150px] border-none shadow-none bg-transparent">
              <SelectValue>{tabs.find((tab) => tab.value === activeTab)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {tabs.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 右側操作 - 在所有螢幕尺寸顯示 */}
        <div className="flex items-center gap-3 ml-auto">
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

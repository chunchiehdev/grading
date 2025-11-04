import * as React from 'react';
import { NavLink } from 'react-router';
import { cn } from '@/lib/utils';

interface NavigationTab {
  label: string;
  value: string;
  to: string; 
  end?: boolean; 
}

interface ModernNavigationProps {
  tabs: NavigationTab[];
  actions?: React.ReactNode;
  className?: string;
}

export function ModernNavigation({
  tabs,
  actions,
  className,
}: ModernNavigationProps) {
  return (
    <div className={cn('flex items-center bg-background w-full relative ', className)}>
      <div className="w-[95%] sm:w-[90%] lg:w-[85%] xl:w-[80%] mx-auto flex items-center gap-3 sm:gap-4">
        {/* Navigation Links - Horizontal scroll on mobile, flex on desktop */}
        <nav className="flex-1 overflow-x-auto -mb-[1px] py-3 sm:py-4">
          <div className="flex gap-6 lg:gap-8 min-w-max md:min-w-0 h-full items-center">
            {tabs.map((tab) => (
              <NavLink
                key={tab.value}
                to={tab.to}
                end={tab.end ?? true} // Default to exact match to prevent partial matching
                prefetch="intent" // Desktop: prefetch on hover
                className={({ isActive }) =>
                  cn(
                    'text-sm lg:text-base font-medium px-2 pb-3 whitespace-nowrap',
                    'border-b-2 transition-colors inline-block',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                  )
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Actions - Right Side */}
        {actions && (
          <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0 py-3 sm:py-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

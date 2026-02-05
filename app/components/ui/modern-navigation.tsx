import * as React from 'react';
import { NavLink } from 'react-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavigationTab {
  label: string;
  value: string;
  to: string; 
  icon: React.ReactNode;
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
    <div className={cn('bg-background w-full relative', className)}>
      <div className="w-[90%] sm:w-[85%] lg:w-[80%] mx-auto relative">
        {/* Navigation Links - Centered Large Icons */}
        <div className="flex items-center justify-center py-3 sm:py-4">
          <nav>
            <div className="flex gap-2 sm:gap-3 items-center">
              {tabs.map((tab) => (
                <NavLink
                  key={tab.value}
                  to={tab.to}
                  end={tab.end ?? true}
                  prefetch="intent"
                  title={tab.label}
                >
                  {({ isActive }) => (
                    <Button
                      variant="ghost"
                      size="icon-2xl"
                      className={cn(
                        'transition-colors',
                        isActive
                          ? 'text-primary bg-primary/10 hover:bg-primary/15'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}
                    >
                      {tab.icon}
                    </Button>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>

        {/* Actions - Absolute Right Side */}
        {actions && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 sm:gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router';

const pageHeaderVariants = cva(' ', {
  variants: {
    size: {
      default: 'py-6',
      sm: 'py-4',
      lg: 'py-8',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  menuItems?: { label: string; to: string; icon?: LucideIcon }[];
  menuButtonLabel?: string;
  showInlineActions?: boolean;
  size?: VariantProps<typeof pageHeaderVariants>['size'];
}

export function PageHeader({
  title,
  subtitle,
  actions,
  menuItems,
  menuButtonLabel = 'Actions',
  showInlineActions = true,
  size = 'default',
  className,
  children,
  ...props
}: PageHeaderProps) {
  return (
    <header className={cn(pageHeaderVariants({ size }), className)} {...props}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            {title && <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>}
            {subtitle && <p className="text-muted-foreground mt-2 sm:mt-3 px-1">{subtitle}</p>}
          </div>

          {/* Actions: always visible */}
          <div className="flex items-center gap-2">
            {menuItems && menuItems.length > 0 ? (
              <div className={cn(showInlineActions ? 'sm:hidden' : '')}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon-sm" aria-label={menuButtonLabel}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {menuItems.map((item, idx) => (
                      <DropdownMenuItem key={idx} asChild>
                        <Link to={item.to} className="flex items-center gap-2">
                          {item.icon ? <item.icon className="h-4 w-4" /> : null}
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : null}

            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}

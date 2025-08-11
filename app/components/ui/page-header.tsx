import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const pageHeaderVariants = cva(
  ' ',
  {
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
  }
);

export interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  size?: VariantProps<typeof pageHeaderVariants>['size'];
}

export function PageHeader({ 
  title, 
  subtitle, 
  actions, 
  size = 'default', 
  className, 
  children,
  ...props 
}: PageHeaderProps) {
  return (
    <header className={cn(pageHeaderVariants({ size }), className)} {...props}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-gray-600 mt-3 px-1">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-4 ">
              {actions}
            </div>
          )}
        </div>
        {children}
      </div>
    </header>
  );
} 
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

// Semantic, theme-aware variants using design tokens only
const containerVariants = cva(
  'relative flex items-center justify-between rounded-lg border transition-all duration-200 cursor-pointer p-4 md:p-6',
  {
    variants: {
      intent: {
        teacher: 'hover:bg-muted peer-checked:outline  peer-checked:outline-2 peer-checked:shadow-lg peer-checked:outline-primary',
        student: 'hover:bg-muted peer-checked:outline  peer-checked:outline-2 peer-checked:shadow-lg peer-checked:outline-primary',
      },
    },
    defaultVariants: { intent: 'teacher' },
  }
);

const iconVariants = cva(
  'w-10 h-10 rounded-full flex items-center justify-center',
  {
    variants: {
      intent: {
        teacher: 'bg-primary text-primary-foreground',
        student: 'bg-primary text-primary-foreground',
      },
    },
    defaultVariants: { intent: 'teacher' },
  }
);

export interface RoleCardProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  title: string;
  description: string;
  icon: LucideIcon;
  value: string;
  name: string;
  variant?: 'teacher' | 'student';
}

export function RoleCard({
  title,
  description,
  icon: Icon,
  value,
  name,
  variant = 'teacher',
  className,
  ...props
}: RoleCardProps) {
  return (
    <label className="block" {...props}>
      <input type="radio" name={name} value={value} className="sr-only peer" />
      <div
        className={cn(
          'bg-background border-border focus-within:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
          containerVariants({ intent: variant }),
          className
        )}
      >
        <div className="flex items-center flex-1 min-w-0">
          <div className={cn('flex-shrink-0', iconVariants({ intent: variant }))}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 ml-4">
            <h3 className="text-base md:text-lg font-medium text-foreground truncate">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 md:line-clamp-none">
              {description}
            </p>
          </div>
        </div>
        
      </div>
    </label>
  );
}

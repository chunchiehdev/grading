import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

const statsCardVariants = cva('w-10 h-10 rounded-lg flex items-center justify-center', {
  variants: {
    variant: {
      default: 'bg-blue-100 text-blue-600',
      success: 'bg-green-100 text-green-600',
      warning: 'bg-orange-100 text-orange-600',
      destructive: 'bg-red-100 text-red-600',
      secondary: 'bg-purple-100 text-purple-600',
      transparent: 'bg-transparent text-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: VariantProps<typeof statsCardVariants>['variant'];
  size?: 'sm' | 'lg';
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
  size = 'lg',
  className,
  ...props
}: StatsCardProps) {
  return (
    <Card className={cn('shadow-sm border', className)} {...props}>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={cn(statsCardVariants({ variant }))}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn(' font-bold text-foreground', size === 'sm' ? 'text-sm' : 'text-xl')}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

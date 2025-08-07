import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

const roleCardVariants = cva(
  'relative flex items-center p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm',
  {
    variants: {
      variant: {
        teacher: 'bg-teal-50 border-teal-200 hover:border-teal-300 peer-checked:border-teal-500 peer-checked:bg-teal-100',
        student: 'bg-emerald-50 border-emerald-200 hover:border-emerald-300 peer-checked:border-emerald-500 peer-checked:bg-emerald-100',
      },
    },
    defaultVariants: {
      variant: 'teacher',
    },
  }
);

const roleIconVariants = cva(
  'w-10 h-10 rounded-full flex items-center justify-center mr-4 shadow-sm',
  {
    variants: {
      variant: {
        teacher: 'bg-teal-500',
        student: 'bg-emerald-500',
      },
    },
    defaultVariants: {
      variant: 'teacher',
    },
  }
);

const roleIndicatorVariants = cva(
  'w-5 h-5 border-2 rounded-full flex items-center justify-center transition-colors',
  {
    variants: {
      variant: {
        teacher: 'border-stone-300 peer-checked:border-teal-500 peer-checked:bg-teal-500',
        student: 'border-stone-300 peer-checked:border-emerald-500 peer-checked:bg-emerald-500',
      },
    },
    defaultVariants: {
      variant: 'teacher',
    },
  }
);

export interface RoleCardProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  title: string;
  description: string;
  icon: LucideIcon;
  value: string;
  name: string;
  variant?: VariantProps<typeof roleCardVariants>['variant'];
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
      <input
        type="radio"
        name={name}
        value={value}
        className="sr-only peer"
      />
      <div className={cn(roleCardVariants({ variant }), className)}>
        <div className="flex-1">
          <div className="flex items-center">
            <div className={cn(roleIconVariants({ variant }))}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-stone-800">{title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{description}</p>
            </div>
          </div>
        </div>
        <div className={cn(roleIndicatorVariants({ variant }))}>
          <div className="w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-opacity" />
        </div>
      </div>
    </label>
  );
} 
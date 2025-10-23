import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border-2 border-foreground/20 dark:border-foreground/30 bg-background shadow-sm hover:border-accent hover:bg-accent/30 dark:hover:bg-accent/40 hover:shadow-md hover:scale-105 active:scale-95 transition-all',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-foreground dark:hover:text-foreground ',
        link: 'text-primary underline-offset-4 hover:underline',
        emphasis:
          'bg-[hsl(var(--accent-emphasis))] text-[hsl(var(--accent-emphasis-foreground))] shadow hover:bg-[hsl(var(--accent-emphasis))]/80 hover:shadow-lg hover:shadow-[hsl(var(--accent-emphasis))]/40 hover:scale-105 active:scale-95 transition-all',
        minimal: 'text-foreground hover:bg-accent/15 dark:hover:bg-accent/25 hover:shadow-md hover:scale-105 active:scale-95 duration-200',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8 [&_svg]:size-3',
        'icon-lg': 'h-10 w-10 [&_svg]:size-5',
        'icon-xl': 'h-12 w-12 [&_svg]:size-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

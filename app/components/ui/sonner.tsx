import { useTheme } from '@/theme-provider';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          success:
            'group-[.toaster]:bg-primary/10 group-[.toaster]:text-foreground group-[.toaster]:border-primary/30',
          error:
            'group-[.toaster]:bg-destructive/10 group-[.toaster]:text-destructive group-[.toaster]:border-destructive/30',
          warning:
            'group-[.toaster]:bg-amber-500/10 group-[.toaster]:text-amber-700 dark:group-[.toaster]:text-amber-400 group-[.toaster]:border-amber-500/30',
          info:
            'group-[.toaster]:bg-muted group-[.toaster]:text-foreground group-[.toaster]:border-border',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

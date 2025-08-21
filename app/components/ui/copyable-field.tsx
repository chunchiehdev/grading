import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from './button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CopyableFieldProps {
  label: string;
  value: string;
  className?: string;
  codeClassName?: string;
  isCode?: boolean;
}

export function CopyableField({ 
  label, 
  value, 
  className,
  codeClassName,
  isCode = false 
}: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      toast.error('Failed to copy');
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className={cn("bg-muted/30 p-4 rounded-lg", className)}>
      <label className="text-sm font-semibold text-foreground mb-3 block text-center">
        {label}
      </label>
      <div className="flex items-center justify-center space-x-2">
        <code 
          className={cn(
            "bg-background text-foreground px-4 py-3 rounded-lg border shadow-sm flex-1 text-center",
            isCode ? "font-mono text-xl tracking-widest" : "text-sm break-all",
            codeClassName
          )}
        >
          {value}
        </code>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : `Copy ${label.toLowerCase()}`}
          title={copied ? 'Copied' : `Copy ${label.toLowerCase()}`}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
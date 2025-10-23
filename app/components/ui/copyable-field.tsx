import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

export function CopyableField({ label, value, className, codeClassName, isCode = false }: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation('common');

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
    <div className={cn('bg-accent/5 p-4 rounded-lg border border-accent/20', className)}>
      <label className="text-sm font-semibold text-foreground mb-3 block text-center">{label}</label>
      <div className="flex items-center justify-center space-x-2">
        <code
          className={cn(
            'bg-background text-foreground px-4 py-3 rounded-lg border border-accent/40 shadow-sm flex-1 text-center transition-colors hover:border-accent/60',
            isCode ? 'font-mono text-xl tracking-widest' : 'text-sm break-all',
            codeClassName
          )}
        >
          {value}
        </code>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          aria-label={copied ? t('copied') : `${t('copy')} ${label.toLowerCase()}`}
          title={copied ? t('copied') : `${t('copy')} ${label.toLowerCase()}`}
          className="hover:bg-accent/20 hover:border-accent/60 transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-green-600 dark:text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

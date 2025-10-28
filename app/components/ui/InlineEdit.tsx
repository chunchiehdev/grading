import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Edit3, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface InlineEditProps {
  value: string;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  onSave: (value: string) => void;
  onCancel?: () => void;
  variant?: 'title' | 'subtitle' | 'body';
}

export const InlineEdit = ({
  value,
  placeholder,
  multiline = false,
  className,
  onSave,
  onCancel,
  variant = 'body',
}: InlineEditProps) => {
  const { t } = useTranslation('common');
  const defaultPlaceholder = placeholder || t('clickToEdit');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onSave(editValue.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && e.ctrlKey && multiline) {
      handleSave();
    }
  };

  const getDisplayClass = () => {
    const baseClass = 'group flex items-center gap-2 rounded-md transition-colors';
    switch (variant) {
      case 'title':
        return cn(baseClass, 'text-lg font-semibold hover:bg-muted/50 px-2 py-1');
      case 'subtitle':
        return cn(baseClass, 'text-base font-medium hover:bg-muted/50 px-2 py-1');
      default:
        return cn(baseClass, 'text-sm hover:bg-muted/50 px-2 py-1');
    }
  };

  if (isEditing) {
    const InputComponent = multiline ? Textarea : Input;
    return (
      <div className="flex items-start gap-2">
        {multiline ? (
          <Textarea
            ref={inputRef as React.Ref<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder={defaultPlaceholder}
            className={cn('flex-1', className)}
            rows={3}
          />
        ) : (
          <Input
            ref={inputRef as React.Ref<HTMLInputElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder={defaultPlaceholder}
            className={cn('flex-1', className)}
          />
        )}
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(getDisplayClass(), className, 'cursor-pointer')} onClick={() => setIsEditing(true)}>
      <span className={cn('flex-1', !value && 'text-muted-foreground italic')}>{value || defaultPlaceholder}</span>
      <Edit3 className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

/**
 * CustomInstructionsField Component
 * Feature 004: AI Grading with Knowledge Base Context
 *
 * Text area for custom grading instructions with character counter
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface CustomInstructionsFieldProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
  placeholder?: string;
  showDescription?: boolean;
  showTips?: boolean;
}

export function CustomInstructionsField({
  value = '',
  onChange,
  maxLength = 5000,
  disabled = false,
  placeholder,
  showDescription = true,
  showTips = true,
}: CustomInstructionsFieldProps) {
  const { t } = useTranslation('grading');
  const [charCount, setCharCount] = useState(value.length);

  useEffect(() => {
    setCharCount(value.length);
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;

    if (newValue.length <= maxLength) {
      onChange(newValue);
      setCharCount(newValue.length);
    }
  };

  const isNearLimit = charCount > maxLength * 0.9;
  const isAtLimit = charCount >= maxLength;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="custom-grading-instructions" className="block text-sm font-medium text-foreground">
          {t('customInstructions')} ({t('optional')})
        </label>
        <span
          className={`text-sm ${
            isAtLimit
              ? 'text-destructive font-semibold'
              : isNearLimit
                ? 'text-orange-600 dark:text-orange-500'
                : 'text-muted-foreground'
          }`}
        >
          {charCount} / {maxLength}
        </span>
      </div>

      {showDescription && <p className="text-sm text-muted-foreground">{t('customInstructionsDescription')}</p>}

      <textarea
        id="custom-grading-instructions"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder={
          placeholder ||
          t('customInstructionsPlaceholder', {
            defaultValue:
              '重點檢查學生是否正確套用公式。注意單位換算和計算步驟的完整性。\n\nExample: Focus on whether students correctly apply the formula. Pay attention to unit conversion and completeness of calculation steps.',
          })
        }
        rows={6}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm
          bg-background text-foreground
          focus:ring-ring focus:border-ring
          disabled:bg-muted disabled:cursor-not-allowed
          ${isAtLimit ? 'border-destructive' : 'border-border'}
        `}
      />

      {isNearLimit && !isAtLimit && (
        <p className="text-sm text-orange-600 dark:text-orange-500">
          {t('approachingCharLimit', { remaining: maxLength - charCount })}
        </p>
      )}

      {isAtLimit && <p className="text-sm text-destructive font-semibold">{t('charLimitReached')}</p>}

      {showTips && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 {t('instructionsTip1')}</p>
          <p>💡 {t('instructionsTip2')}</p>
        </div>
      )}
    </div>
  );
}

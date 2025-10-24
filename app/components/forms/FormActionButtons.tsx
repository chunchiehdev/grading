import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

interface FormActionButtonsProps {
  /** URL to navigate to when Cancel is clicked */
  cancelTo: string;

  /** Text for submit button */
  submitText: string;

  /** Text for cancel button */
  cancelText: string;

  /** Whether form is currently submitting */
  isLoading?: boolean;

  /** Disable submit button (e.g., validation failed) */
  isDisabled?: boolean;

  /** Optional additional className for the button container */
  className?: string;
}

export function FormActionButtons({
  cancelTo,
  submitText,
  cancelText,
  isLoading = false,
  isDisabled = false,
  className = '',
}: FormActionButtonsProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-5 xl:gap-6 pt-4 lg:pt-6 xl:pt-8 ${className}`.trim()}
    >
      <Button
        asChild
        variant="secondary"
        className="flex-1 h-11 sm:h-12 lg:h-14 xl:h-16 rounded-xl text-base lg:text-lg xl:text-xl font-medium"
      >
        <Link to={cancelTo}>{cancelText}</Link>
      </Button>
      <Button
        type="submit"
        variant="emphasis"
        disabled={isLoading || isDisabled}
        className="flex-1 h-11 sm:h-12 lg:h-14 xl:h-16 rounded-xl text-base lg:text-lg xl:text-xl font-medium"
      >
        {submitText}
      </Button>
    </div>
  );
}

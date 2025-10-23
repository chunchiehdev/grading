import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, ArrowRight, X } from 'lucide-react';

interface ValidationError {
  message: string;
  code?: string;
  isExpired?: boolean;
  isAlreadyEnrolled?: boolean;
  course?: {
    name: string;
    teacher: { name: string; email: string };
    description?: string;
  };
}

/**
 * InvitationCodeInput Component
 * Allows students to enter an invitation code to join a course
 * Validates code via API before navigation to /join?code=<code>
 *
 * Features:
 * - API validation before navigation
 * - Centered modal error dialog with TailwindCSS
 * - Error handling for empty/invalid/expired codes
 * - Loading state during validation
 * - i18n support
 */
export function InvitationCodeInput() {
  const { t } = useTranslation(['course']);
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear previous error
    setValidationError(null);

    // Validate input
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setValidationError({
        message: t('discovery.invitationCodeRequired'),
      });
      return;
    }

    if (trimmedCode.length < 3) {
      setValidationError({
        message: t('discovery.invitationCodeInvalid'),
      });
      return;
    }

    // Set loading state and validate via API
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/invitations/validate?code=${encodeURIComponent(trimmedCode)}`,
        { method: 'GET', credentials: 'include' }
      );

      const data = await response.json();

      if (!data.isValid) {
        setValidationError({
          message: data.error || t('discovery.invitationCodeInvalid'),
          code: trimmedCode,
          isExpired: data.error?.includes('expired'),
          isAlreadyEnrolled: data.isAlreadyEnrolled,
          course: data.course,
        });
        setIsLoading(false);
        return;
      }

      // Check if already enrolled
      if (data.isAlreadyEnrolled) {
        setValidationError({
          message: t('course:joinCourse.alreadyEnrolled'),
          code: trimmedCode,
          isAlreadyEnrolled: true,
          course: data.course,
        });
        setIsLoading(false);
        return;
      }

      // Validation successful, navigate to join page
      navigate(`/join?code=${encodeURIComponent(trimmedCode)}`);
    } catch (error) {
      console.error('Error validating invitation code:', error);
      setValidationError({
        message: t('discovery.invitationCodeInvalid'),
        code: trimmedCode,
      });
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="max-w-md">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t('discovery.invitationCodeLabel')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('discovery.invitationCodeDescription')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder={t('discovery.invitationCodePlaceholder')}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                }}
                disabled={isLoading}
                className="flex-1"
                maxLength={50}
                aria-label="Invitation code"
                autoComplete="off"
              />
              <Button
                type="submit"
                disabled={isLoading || !code.trim()}
                size="default"
                className="gap-2"
              >
                {isLoading ? (
                  <span className="inline-block animate-spin">↻</span>
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {t('discovery.joinButton')}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Centered Modal Error Dialog - using fixed positioning */}
      {validationError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 dark:bg-black/60"
            onClick={() => setValidationError(null)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6 animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setValidationError(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>

            {/* Content */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {validationError.isAlreadyEnrolled
                    ? t('course:joinCourse.alreadyEnrolled')
                    : t('course:joinCourse.notValid')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {validationError.message}
                </p>
              </div>

              {/* Course Info if available */}
              {validationError.course && (
                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 text-left space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                      {t('course:courseInfo')}
                    </p>
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {validationError.course.name}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>
                      <span className="font-semibold">{t('course:instructorLabel')}:</span>{' '}
                      {validationError.course.teacher.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {validationError.course.teacher.email}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setValidationError(null);
                    setCode('');
                  }}
                >
                  {t('common:close')}
                </Button>
                {validationError.isExpired && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setValidationError(null);
                      setCode('');
                    }}
                  >
                    {t('discovery.contactTeacher', {
                      defaultValue: 'Contact Teacher',
                    })}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

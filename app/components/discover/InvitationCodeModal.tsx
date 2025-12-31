'use client';

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

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

interface InvitationCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * InvitationCodeModal
 * Modal for validating and joining courses with invitation codes
 *
 * Features:
 * - Code input with validation
 * - Real-time validation via API
 * - Error display with course information
 * - Success confirmation
 * - Navigation to /join on success
 * - Full focus management
 */
export function InvitationCodeModal({ open, onOpenChange }: InvitationCodeModalProps) {
  const { t } = useTranslation(['course']);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [code, setCode] = useState('');
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validatedCode, setValidatedCode] = useState<string | null>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setCode('');
      setValidationError(null);
      setValidatedCode(null);
      setIsValidating(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate input
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setValidationError({
        message: t('course:discovery.invitationCodeRequired'),
      });
      return;
    }

    if (trimmedCode.length < 3) {
      setValidationError({
        message: t('course:discovery.invitationCodeInvalid'),
      });
      return;
    }

    // Start validation
    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await fetch(
        `/api/invitations/validate?code=${encodeURIComponent(trimmedCode)}`,
        { method: 'GET', credentials: 'include' }
      );

      const data = await response.json();

      if (!data.isValid) {
        setValidationError({
          message: data.error || t('course:discovery.invitationCodeInvalid'),
          code: trimmedCode,
          isExpired: data.error?.includes('expired'),
          isAlreadyEnrolled: data.isAlreadyEnrolled,
          course: data.course,
        });
        setIsValidating(false);
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
        setIsValidating(false);
        return;
      }

      // Success - mark as validated
      setValidatedCode(trimmedCode);
      setIsValidating(false);

      // Navigate after brief delay to show success state
      setTimeout(() => {
        navigate(`/join?code=${encodeURIComponent(trimmedCode)}`);
        onOpenChange(false);
      }, 800);
    } catch (error) {
      console.error('Error validating invitation code:', error);
      setValidationError({
        message: t('course:discovery.invitationCodeInvalid'),
        code: trimmedCode,
      });
      setIsValidating(false);
    }
  };

  // Show success state
  if (validatedCode) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-md"
          aria-labelledby="invitation-modal-title"
          aria-describedby="invitation-modal-description"
        >
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            </div>
            <DialogTitle id="invitation-modal-title">
              {t('course:discovery.codeValidated')}
            </DialogTitle>
            <DialogDescription id="invitation-modal-description">
              {t('course:discovery.joinCourse')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
            <span>Redirecting to course...</span>
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        aria-labelledby="invitation-modal-title"
        aria-describedby="invitation-modal-description"
      >
        {/* Header */}
        <DialogHeader>
          <DialogTitle id="invitation-modal-title">
            {t('course:discovery.invitationModalTitle')}
          </DialogTitle>
          <DialogDescription id="invitation-modal-description">
            {t('course:discovery.invitationModalDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* Error State */}
        {validationError && (
          <div className="space-y-4">
            {/* Error Alert */}
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5 text-destructive">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {validationError.isAlreadyEnrolled
                    ? t('course:joinCourse.alreadyEnrolled')
                    : t('course:joinCourse.notValid')}
                </p>
                <p className="text-xs opacity-75 mt-1">{validationError.message}</p>
              </div>
            </div>

            {/* Course Info if Available */}
            {validationError.course && (
              <Card className="border-border/50">
                <CardContent className="pt-6 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                      {t('course:discovery.courseInfo')}
                    </p>
                    <p className="text-sm font-semibold text-foreground mt-2">
                      {validationError.course.name}
                    </p>
                    {validationError.course.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {validationError.course.description}
                      </p>
                    )}
                  </div>

                  {/* Teacher Info */}
                  <div className="pt-2 border-t border-border/50 space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                      {t('course:discovery.instructor')}
                    </p>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarFallback className="text-xs font-semibold">
                          {validationError.course.teacher.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {validationError.course.teacher.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {validationError.course.teacher.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Retry Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setValidationError(null);
                setCode('');
                inputRef.current?.focus();
              }}
            >
              {t('common:tryAgain')}
            </Button>
          </div>
        )}

        {/* Normal State - Input Form */}
        {!validationError && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Code Input */}
            <div className="space-y-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder={t('course:discovery.invitationCodePlaceholder')}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={isValidating}
                className="font-mono tracking-widest text-center text-[16px] uppercase"
                maxLength={50}
                aria-label={t('course:discovery.invitationCodeLabel')}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground px-1">
                {t('course:discovery.invitationCodeLength', {
                  defaultValue: 'Usually uppercase letters and numbers',
                })}
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isValidating || !code.trim()}
              className="w-full gap-2"
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('course:discovery.validatingCode')}
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  {t('course:discovery.validateButton', {
                    defaultValue: 'Validate Code',
                  })}
                </>
              )}
            </Button>

            {/* Helper Text */}
            <p className="text-xs text-muted-foreground text-center">
              {t('course:discovery.invitationCodeDescription')}
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

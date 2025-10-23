import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Share2 } from 'lucide-react';
import { QRDisplay } from './qr-display';
import { toast } from 'sonner';

interface InvitationDisplayProps {
  code: string;
  qrCodeUrl: string;
  baseUrl: string;
  codeLabel: string;
  urlLabel: string;
  qrDescription?: string;
}

export function InvitationDisplay({
  code,
  qrCodeUrl,
  baseUrl,
  codeLabel,
  urlLabel,
  qrDescription,
}: InvitationDisplayProps) {
  const { t } = useTranslation('course');
  const [copiedCode, setCopiedCode] = useState(false);

  const invitationUrl = `${baseUrl}/join?code=${code}`;
  const finalQrDescription = qrDescription || t('courseInvitation.scanQRDescription');

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success(t('copied', { ns: 'common' }));
      setTimeout(() => setCopiedCode(false), 1500);
    } catch (err) {
      toast.error('Failed to copy');
      console.error('Failed to copy: ', err);
    }
  };

  const handleShareQR = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('courseInvitation.title'),
          text: finalQrDescription,
          url: invitationUrl,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      toast.info('Share not supported on this device');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto gap-6 py-8 px-4 sm:px-6 lg:px-8">
      {/* Main Heading */}
      <div className="w-full text-center space-y-1">
        <h2 className="text-2xl font-bold text-foreground">{t('courseInvitation.shareWithStudents')}</h2>
        <p className="text-sm text-muted-foreground">{t('courseInvitation.invitationInstructions')}</p>
      </div>

      {/* QR Code - Primary Focus */}
      <div className="w-full flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-accent/20 rounded-2xl blur-xl opacity-50" />
          <div className="relative min-w-[240px] min-h-[240px] flex items-center justify-center bg-card rounded-2xl border border-border p-6 shadow-lg">
            <QRDisplay src={qrCodeUrl} alt="Course invitation QR code" description={finalQrDescription} />
          </div>
        </div>

        {/* Invitation Code Display */}
        <div className="w-full text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">{codeLabel}</p>
          <div className="flex items-center justify-center gap-2">
            <code className="flex-1 bg-background text-foreground px-4 py-3 rounded-lg border border-accent/40 text-center font-mono text-lg tracking-widest font-bold">
              {code}
            </code>
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-input bg-background hover:bg-accent/20 hover:border-accent/60 transition-colors flex-shrink-0"
              aria-label={copiedCode ? 'Copied' : `Copy ${codeLabel.toLowerCase()}`}
              title={copiedCode ? 'Copied' : `Copy ${codeLabel.toLowerCase()}`}
            >
              {copiedCode ? (
                <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* QR Label */}
        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground max-w-sm">{finalQrDescription}</p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={handleShareQR}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors shadow-sm"
            title={t('courseInvitation.shareQRCode')}
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('courseInvitation.shareQRCode')}</span>
          </button>

          <button
            onClick={handleCopyCode}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border bg-background hover:bg-accent/10 transition-colors font-medium"
            title={t('courseInvitation.copyInvitationCode')}
          >
            {copiedCode ? (
              <>
                <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
                <span className="hidden sm:inline text-green-600 dark:text-green-500">{t('copied', { ns: 'common' })}</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">{t('courseInvitation.copyInvitationCode')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check } from 'lucide-react';
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
  const [copiedUrl, setCopiedUrl] = useState(false);

  const invitationUrl = `${baseUrl}/join?code=${code}`;
  const finalQrDescription = qrDescription || t('courseInvitation.scanQRDescription');

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success(t('common:copied'));
      setTimeout(() => setCopiedCode(false), 1500);
    } catch (err) {
      toast.error('Failed to copy');
      console.error('Failed to copy: ', err);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopiedUrl(true);
      toast.success(t('common:copied'));
      setTimeout(() => setCopiedUrl(false), 1500);
    } catch (err) {
      toast.error('Failed to copy');
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto gap-8 py-8 px-4 sm:px-6 lg:px-8">
      {/* QR Code - Featured first and centered */}
      <div className="w-full flex flex-col items-center gap-4">
        <div className="min-w-[200px] min-h-[200px] flex items-center justify-center bg-card rounded-lg border border-border p-4">
          <QRDisplay src={qrCodeUrl} alt="Course invitation QR code" description={finalQrDescription} />
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-sm">{finalQrDescription}</p>
      </div>

      {/* Invitation Details Card - Unified container */}
      <div className="w-full bg-card rounded-lg border border-border overflow-hidden">
        {/* Invitation Code */}
        <div className="p-6 border-b border-border">
          <label className="text-sm font-semibold text-foreground mb-3 block text-center">{codeLabel}</label>
          <div className="flex items-center justify-center space-x-2">
            <code className="bg-background text-foreground px-4 py-3 rounded-lg border border-accent/40 shadow-sm flex-1 text-center font-mono text-xl tracking-widest transition-colors hover:border-accent/60">
              {code}
            </code>
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-input bg-background hover:bg-accent/20 hover:border-accent/60 transition-colors cursor-pointer"
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

        {/* Invitation URL */}
        <div className="p-6">
          <label className="text-sm font-semibold text-foreground mb-3 block text-center">{urlLabel}</label>
          <div className="flex items-center justify-center space-x-2">
            <code className="bg-background text-foreground px-4 py-3 rounded-lg border border-accent/40 shadow-sm flex-1 text-center text-sm break-all transition-colors hover:border-accent/60">
              {invitationUrl}
            </code>
            <button
              onClick={handleCopyUrl}
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-input bg-background hover:bg-accent/20 hover:border-accent/60 transition-colors cursor-pointer"
              aria-label={copiedUrl ? 'Copied' : `Copy ${urlLabel.toLowerCase()}`}
              title={copiedUrl ? 'Copied' : `Copy ${urlLabel.toLowerCase()}`}
            >
              {copiedUrl ? (
                <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Responsive divider for visual separation */}
      <div className="w-full max-w-sm h-px bg-border" />

      {/* Instructions text */}
      <div className="w-full text-center space-y-2">
        <p className="text-sm font-medium text-foreground">{t('courseInvitation.shareWithStudents')}</p>
        <p className="text-xs text-muted-foreground">
          {t('courseInvitation.invitationInstructions')}
        </p>
      </div>
    </div>
  );
}

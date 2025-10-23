import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Share2 } from 'lucide-react';
import { QRDisplay } from './qr-display';
import { Button } from './button';
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

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      toast.success(t('copied', { ns: 'common' }));
    } catch (err) {
      toast.error('Failed to copy');
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      {/* QR Code - Minimal Container */}
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="w-48 h-48 flex items-center justify-center bg-white rounded-sm border border-border">
          <QRDisplay src={qrCodeUrl} alt="Course invitation QR code" className="w-full h-full object-contain" />
        </div>
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          {finalQrDescription}
        </p>
      </div>

      {/* Spacer */}
      <div className="w-full h-px bg-border/50" />

      {/* Invitation Code - Minimal Display */}
      <div className="flex flex-col items-center gap-4 w-full">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {codeLabel}
        </p>
        <code className="text-2xl font-mono font-bold tracking-wider text-foreground">
          {code}
        </code>
        <Button
          onClick={handleCopyCode}
          variant="ghost"
          size="sm"
          className="text-xs uppercase tracking-widest"
          title={t('copied', { ns: 'common' })}
        >
          {copiedCode ? (
            <>
              <Check className="h-3 w-3 text-green-600 dark:text-green-500" />
              <span>{t('copied', { ns: 'common' })}</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>{t('copy', { ns: 'common' })}</span>
            </>
          )}
        </Button>
      </div>

      {/* Spacer */}
      <div className="w-full h-px bg-border/50" />

      {/* Action Buttons */}
      <div className="flex gap-4 w-full justify-center flex-wrap">
        <Button
          onClick={handleShareQR}
          variant="emphasis"
          size="default"
          className="uppercase tracking-widest"
          title={t('courseInvitation.shareQRCode')}
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">{t('courseInvitation.shareQRCode')}</span>
        </Button>

        <Button
          onClick={handleCopyUrl}
          variant="outline"
          size="default"
          className="uppercase tracking-widest"
          title={t('courseInvitation.copyInvitationLink')}
        >
          <Copy className="h-4 w-4" />
          <span className="hidden sm:inline">{t('courseInvitation.copyInvitationLink')}</span>
        </Button>
      </div>
    </div>
  );
}

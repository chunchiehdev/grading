import { CopyableField } from './copyable-field';
import { QRDisplay } from './qr-display';

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
  qrDescription = 'Students can scan this code to join',
}: InvitationDisplayProps) {
  const invitationUrl = `${baseUrl}/join?code=${code}`;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Invitation Details */}
      <div className="flex flex-col justify-center space-y-6 text-center">
        <CopyableField label={codeLabel} value={code} isCode={true} />

        <CopyableField label={urlLabel} value={invitationUrl} />
      </div>

      {/* QR Code */}
      <QRDisplay src={qrCodeUrl} alt="Course invitation QR code" description={qrDescription} />
    </div>
  );
}

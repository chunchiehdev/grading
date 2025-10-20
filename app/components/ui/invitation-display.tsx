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
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto gap-8 py-8 px-4 sm:px-6 lg:px-8">
      {/* QR Code - Featured first and centered */}
      <div className="w-full flex flex-col items-center gap-4">
        <div className="min-w-[200px] min-h-[200px] flex items-center justify-center bg-card rounded-lg border border-border p-4">
          <QRDisplay src={qrCodeUrl} alt="Course invitation QR code" description={qrDescription} />
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-sm">{qrDescription}</p>
      </div>

      {/* Invitation Details - Below QR code */}
      <div className="w-full flex flex-col justify-center space-y-6 text-center">
        <CopyableField label={codeLabel} value={code} isCode={true} />

        <CopyableField label={urlLabel} value={invitationUrl} />
      </div>

      {/* Responsive divider for visual separation */}
      <div className="w-full max-w-sm h-px bg-border" />

      {/* Instructions text */}
      <div className="w-full text-center space-y-2">
        <p className="text-sm font-medium text-foreground">Share with Students</p>
        <p className="text-xs text-muted-foreground">
          Students can scan the QR code, enter the code, or click the invitation link to join this course.
        </p>
      </div>
    </div>
  );
}

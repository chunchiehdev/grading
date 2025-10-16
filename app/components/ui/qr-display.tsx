import { cn } from '@/lib/utils';

interface QRDisplayProps {
  src: string;
  alt: string;
  title?: string;
  description?: string;
  className?: string;
}

export function QRDisplay({ src, alt, title = 'QR Code', description, className }: QRDisplayProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', className)}>
      <div className="bg-muted/30 p-6 rounded-lg w-full max-w-xs mx-auto">
        <div className="text-sm font-semibold text-foreground mb-4">{title}</div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <img src={src} alt={alt} className="w-44 h-44 mx-auto" />
        </div>
        {description && <p className="text-xs text-muted-foreground mt-3">{description}</p>}
      </div>
    </div>
  );
}

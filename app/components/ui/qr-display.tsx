interface QRDisplayProps {
  src: string;
  alt: string;
  className?: string;
}

export function QRDisplay({ src, alt, className = '' }: QRDisplayProps) {
  return <img src={src} alt={alt} className={className} />;
}

import { useCallback, useEffect, useState } from 'react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { cn } from '@/lib/utils';
import { Upload, Check, Loader2 } from 'lucide-react';

export interface CircularUploadProps {
  onUploadComplete?: (files: Array<{ fileId: string; fileName: string; fileSize: number; mimeType: string }>) => void;
  onLocalFileSelected?: (file: File) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  className?: string;
  diameter?: number; // px
}

export function CircularUpload({
  onUploadComplete,
  onLocalFileSelected,
  acceptedFileTypes = ['.pdf', '.doc', '.docx', '.txt'],
  maxFileSize = 100 * 1024 * 1024,
  className,
  diameter = 56,
}: CircularUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const hookOnComplete = useCallback(
    (files: Array<{ fileId: string; fileName: string; fileSize: number; mimeType: string }>) => {
      onUploadComplete?.(files);
    },
    [onUploadComplete]
  );

  const { uploadFiles, isUploading, lastError } = useFileUpload({ onUploadComplete: hookOnComplete });

  useEffect(() => {
    if (lastError?.message) setError(lastError.message);
  }, [lastError]);

  const validate = (file: File): string | null => {
    if (file.size > maxFileSize) return `檔案超過大小限制 ${(maxFileSize / (1024 * 1024)).toFixed(0)}MB`;
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!acceptedFileTypes.includes(ext)) return `不支援的檔案類型: ${ext}`;
    return null;
  };

  const handleFiles = async (files: File[]) => {
    setError(null);
    if (!files?.length) return;
    const err = validate(files[0]);
    if (err) return setError(err);
    onLocalFileSelected?.(files[0]);
    await uploadFiles([files[0]]);
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          const files = Array.from(e.dataTransfer.files);
          await handleFiles(files);
        }}
        className={cn(
          'relative rounded-full border flex items-center justify-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-border bg-background',
          className
        )}
        style={{ width: diameter, height: diameter }}
      >
        <input
          id="circular-upload-input"
          type="file"
          className="hidden"
          onChange={async (e) => {
            const input = e.currentTarget;
            const files = input.files ? Array.from(input.files) : [];
            await handleFiles(files);
            input.value = '';
          }}
        />
        <label htmlFor="circular-upload-input" className={cn('cursor-pointer flex items-center justify-center')}>
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          ) : lastError ? (
            <Upload className="w-6 h-6 text-destructive" />
          ) : (
            <>
              <Upload className="w-6 h-6 text-muted-foreground" />
            </>
          )}
        </label>
        {/* Success check shown transiently could be added via parent state if desired */}
      </div>
      {error && <div className="text-xs text-destructive text-center">{error}</div>}
      <div className="text-[11px] text-muted-foreground">支援 {acceptedFileTypes.join(', ')}</div>
    </div>
  );
}

export default CircularUpload;

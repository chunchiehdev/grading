import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileUp, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTranslation } from 'react-i18next';

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

interface FileUploadProps {
  maxFiles: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  onUploadComplete?: (results: Array<{ fileId: string; fileName: string; fileSize: number; mimeType: string }>) => void;
}

export const CompactFileUpload = ({
  maxFiles,
  maxFileSize = 100 * 1024 * 1024,
  acceptedFileTypes = ['.pdf', '.doc', '.docx', '.txt'],
  onUploadComplete,
}: FileUploadProps) => {
  const { t } = useTranslation('grading');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { files: uploadedFiles, uploadFiles, isUploading } = useFileUpload({
    onUploadComplete: (files) => {
      if (onUploadComplete) {
        const simplified = files.map((f: any) => ({
          fileId: f.fileId,
          fileName: f.fileName,
          fileSize: f.fileSize,
          mimeType: f.mimeType,
        }));
        onUploadComplete(simplified);
      }
    }
  });

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return t('grading:fileUpload.errors.fileSizeExceeded', {
        fileName: file.name,
        maxSize: formatFileSize(maxFileSize)
      });
    }
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(fileExt)) {
      return t('grading:fileUpload.errors.unsupportedFileType', { fileExt });
    }
    return null;
  };

  const handleFiles = useCallback(async (newFiles: File[]) => {
    setError(null);

    if (newFiles.length > maxFiles) {
      setError(t('grading:fileUpload.errors.tooManyFiles', { maxFiles }));
      return;
    }

    for (const file of newFiles) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    try {
      await uploadFiles(newFiles);
    } catch (err: any) {
      setError(err?.message || t('grading:fileUpload.errors.uploadFailed'));
    }
  }, [uploadFiles, maxFiles, validateFile]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    await handleFiles(droppedFiles);
  }, [handleFiles]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const currentFile = uploadedFiles?.[0];
  const isSuccess = currentFile?.status === 'success';
  const hasError = currentFile?.status === 'error';

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      <div
        onDragEnter={() => setIsDragging(true)}
        onDragOver={handleDrag}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-4 transition-all duration-200',
          isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary',
          isSuccess && 'border-blue-300 bg-blue-50',
          hasError && 'border-red-300 bg-red-50'
        )}
      >
        <div className={cn(
          'p-4 rounded-full transition-all duration-200',
          isDragging ? 'bg-primary/10 text-primary scale-110' : 'bg-muted text-muted-foreground',
          isSuccess && 'bg-blue-100 text-blue-600',
          hasError && 'bg-red-100 text-red-600'
        )}>
          {isSuccess ? (
            <Check className="h-8 w-8" />
          ) : (
            <Upload className="h-8 w-8" />
          )}
        </div>

        {isSuccess ? (
          <div className="text-center">
            <p className="text-lg font-medium text-blue-700">{currentFile.file.name}</p>
            <p className="text-sm text-blue-600">{formatFileSize(currentFile.file.size)} • {t('grading:fileUpload.status.uploadSuccess')}</p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <p className="text-lg font-medium">
                {isDragging ? t('grading:fileUpload.dragDrop.releaseToUpload') : t('grading:fileUpload.dragDrop.dragFilesHere')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('grading:fileUpload.supportedFormats', {
                  formats: acceptedFileTypes.join(', '),
                  maxSize: formatFileSize(maxFileSize)
                })}
              </p>
            </div>

            <input
              type="file"
              className="hidden"
              id="file-upload"
              accept={acceptedFileTypes.join(',')}
              onChange={async (e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                await handleFiles(files);
                e.target.value = '';
              }}
            />
            <Button asChild variant="outline" size="lg" disabled={isUploading}>
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileUp className="h-4 w-4 mr-2" />
                {isUploading ? t('grading:fileUpload.status.uploading') : t('grading:fileUpload.actions.selectFiles')}
              </label>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default CompactFileUpload;

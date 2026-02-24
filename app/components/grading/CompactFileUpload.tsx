import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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

  const {
    files: uploadedFiles,
    uploadFiles,
    isUploading,
  } = useFileUpload({
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
    },
  });

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return t('grading:fileUpload.errors.fileSizeExceeded', {
        fileName: file.name,
        maxSize: formatFileSize(maxFileSize),
      });
    }
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(fileExt)) {
      return t('grading:fileUpload.errors.unsupportedFileType', { fileExt });
    }
    return null;
  };

  const handleFiles = useCallback(
    async (newFiles: File[]) => {
      if (newFiles.length > maxFiles) {
        toast.error(t('grading:fileUpload.errors.tooManyFiles', { maxFiles }));
        return;
      }

      for (const file of newFiles) {
        const validationError = validateFile(file);
        if (validationError) {
          toast.error(validationError);
          return;
        }
      }

      try {
        await uploadFiles(newFiles);
      } catch (err: any) {
        const errorMsg = err?.message || t('grading:fileUpload.errors.uploadFailed');
        // Check if error message is an i18n key (starts with namespace)
        const displayMsg = errorMsg.includes(':') ? t(errorMsg) : errorMsg;
        toast.error(displayMsg);
      }
    },
    [uploadFiles, maxFiles, validateFile, t]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      await handleFiles(droppedFiles);
    },
    [handleFiles]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const currentFile = uploadedFiles?.[0];
  const isSuccess = currentFile?.status === 'success';
  const hasError = currentFile?.status === 'error';

  return (
    <div className="space-y-4">
      <div
        onDragEnter={() => setIsDragging(true)}
        onDragOver={handleDrag}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed p-4 sm:p-8 flex flex-col items-center justify-center gap-3 sm:gap-4 transition-colors',
          isDragging
            ? 'border-[#D2691E] bg-[#D2691E]/5 dark:border-[#E87D3E]'
            : isSuccess
              ? 'border-[#2B2B2B] dark:border-gray-200'
              : hasError
                ? 'border-[#D2691E] dark:border-[#E87D3E]'
                : 'border-[#2B2B2B] dark:border-gray-200'
        )}
      >
        {isSuccess ? (
          <div className="text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center border-2 border-[#2B2B2B] mx-auto dark:border-gray-200">
              <span className="text-2xl">✓</span>
            </div>
            <p className="font-medium text-[#2B2B2B] dark:text-gray-100">{currentFile.file.name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatFileSize(currentFile.file.size)} · {t('grading:fileUpload.status.uploadSuccess')}
            </p>
          </div>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center border-2 border-[#2B2B2B] dark:border-gray-200">
              <Upload className="h-6 w-6 text-[#2B2B2B] dark:text-gray-200" />
            </div>

            <div className="text-center">
              <p className="font-medium text-[#2B2B2B] dark:text-gray-100">
                {isDragging
                  ? t('grading:fileUpload.dragDrop.releaseToUpload')
                  : t('grading:fileUpload.dragDrop.dragFilesHere')}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t('grading:fileUpload.supportedFormats', {
                  formats: acceptedFileTypes.join(', '),
                  maxSize: formatFileSize(maxFileSize),
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
            <Button
              asChild
              variant="outline"
              size="lg"
              disabled={isUploading}
              className="border-2 border-[#2B2B2B] dark:border-gray-200"
            >
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileUp className="mr-2 h-4 w-4" />
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

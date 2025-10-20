/**
 * ReferenceFileUpload Component
 * Feature 004: AI Grading with Knowledge Base Context
 *
 * Multi-file upload UI with parse status indicators for reference materials
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { UploadedFile } from '@/generated/prisma/client';

interface ReferenceFileUploadProps {
  value: string[]; // Array of file IDs
  onChange: (fileIds: string[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

interface UploadedFileWithStatus extends UploadedFile {
  uploadProgress?: number;
}

export function ReferenceFileUpload({
  value = [],
  onChange,
  maxFiles = 5,
  disabled = false,
}: ReferenceFileUploadProps) {
  const { t } = useTranslation('grading');
  const [files, setFiles] = useState<UploadedFileWithStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load file details when value changes
  const loadFileDetails = async () => {
    if (value.length === 0) {
      setFiles([]);
      return;
    }

    try {
      const response = await fetch('/api/files/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: value }),
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data.data?.files || []);
      }
    } catch (err) {
      console.error('Failed to load file details:', err);
    }
  };

  // Load file details on mount and when value changes
  useEffect(() => {
    loadFileDetails();
  }, [value.join(',')]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (value.length + selectedFiles.length > maxFiles) {
      setError(t('maxFilesExceeded', { max: maxFiles }));
      return;
    }

    setIsUploading(true);
    setError(null);

    const uploadedIds: string[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          const fileId = result.data?.fileId || result.fileId;
          if (fileId) {
            uploadedIds.push(fileId);
          }
        } else {
          const errorData = await response.json();
          setError(errorData.error || errorData.message || 'Upload failed');
          break;
        }
      }

      if (uploadedIds.length > 0) {
        const newFileIds = [...value, ...uploadedIds];
        onChange(newFileIds);
        await loadFileDetails();
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }

    // Reset input
    event.target.value = '';
  };

  const handleRemoveFile = (fileId: string) => {
    const newFileIds = value.filter((id) => id !== fileId);
    onChange(newFileIds);
    setFiles(files.filter((f) => f.id !== fileId));
  };

  const handleRetryParse = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/reparse`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadFileDetails();
      }
    } catch (err) {
      console.error('Retry parse failed:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '✓';
      case 'PROCESSING':
      case 'PENDING':
        return '⏳';
      case 'FAILED':
        return '❌';
      default:
        return '?';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return t('fileParsed');
      case 'PROCESSING':
        return t('fileParsing');
      case 'PENDING':
        return t('filePending');
      case 'FAILED':
        return t('fileParseFailed');
      default:
        return status;
    }
  };

  const canAddMore = value.length < maxFiles && !disabled;

  return (
    <div className="space-y-4">
      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 border border-border rounded-lg bg-card"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-lg" title={getStatusText(file.parseStatus)}>
                  {getStatusIcon(file.parseStatus)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.originalFileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.fileSize / 1024).toFixed(1)} KB • {getStatusText(file.parseStatus)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {file.parseStatus === 'FAILED' && (
                  <button
                    type="button"
                    onClick={() => handleRetryParse(file.id)}
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    {t('retry')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveFile(file.id)}
                  className="text-sm text-destructive hover:text-destructive/80"
                  disabled={disabled}
                >
                  {t('remove')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {canAddMore && (
        <div>
          <label
            htmlFor="reference-file-upload"
            className="inline-flex items-center px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-card hover:bg-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? t('uploading') : t('addFiles')}
          </label>
          <input
            id="reference-file-upload"
            type="file"
            multiple
            accept=".pdf,.docx,.txt"
            onChange={handleFileSelect}
            disabled={isUploading || disabled}
            className="hidden"
          />
          <p className="mt-1 text-xs text-muted-foreground">{t('supportedFormats')}: PDF, DOCX, TXT</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-2">
          {error}
        </div>
      )}

      {/* Max files reached */}
      {value.length >= maxFiles && (
        <div className="text-sm text-muted-foreground">{t('maxFilesReached', { max: maxFiles })}</div>
      )}
    </div>
  );
}

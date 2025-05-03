// src/services/file-upload.server.ts
import { uploadToStorage } from '@/services/storage.server';
import { UploadProgressService } from '@/services/progress.server';

export async function uploadFiles(files: File[], uploadId: string) {
  const results = [];

  for (const file of files) {
    // Update initial progress
    await UploadProgressService.updateFileProgress(uploadId, file.name, {
      status: 'uploading',
      progress: 0
    });

    try {
      // Get file buffer
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Update progress to 50%
      await UploadProgressService.updateFileProgress(uploadId, file.name, {
        status: 'uploading',
        progress: 50
      });
      
      // Generate file key
      const fileKey = `uploads/${Date.now()}-${file.name}`;
      
      // Upload to storage
      const result = await uploadToStorage(buffer, fileKey, file.type);
      
      // Update final progress
      await UploadProgressService.updateFileProgress(uploadId, file.name, {
        status: 'success',
        progress: 100
      });
      
      // Add to results
      results.push({
        name: file.name,
        size: file.size,
        type: file.type,
        url: result.url,
        key: fileKey
      });
    } catch (error) {
      console.error(`Failed to upload file ${file.name}:`, error);
      
      // Update error status
      await UploadProgressService.updateFileProgress(uploadId, file.name, {
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed'
      });
      
      throw error;
    }
  }
  
  return results;
}
import { UploadProgressService } from "./progress.server";
import type { UploadedFileInfo } from "@/types/files";

/**
 * Handles file uploads and returns information about the uploaded files
 */
export async function uploadFiles(files: File[], uploadId: string): Promise<UploadedFileInfo[]> {
  const results: UploadedFileInfo[] = [];
  
  for (const file of files) {
    try {
      // Update progress to indicate file processing
      await UploadProgressService.updateFileProgress(uploadId, file.name, {
        status: "uploading",
        progress: 10,
      });
      
      // In a real implementation, this would upload to S3, cloud storage, etc.
      // For now, we'll create a mock implementation
      const key = `upload_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      
      // Simulate upload progress
      await UploadProgressService.updateFileProgress(uploadId, file.name, {
        status: "uploading",
        progress: 50,
      });
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Final progress update
      await UploadProgressService.updateFileProgress(uploadId, file.name, {
        status: "success",
        progress: 100,
      });
      
      // Add result
      results.push({
        name: file.name,
        size: file.size,
        type: file.type,
        key,
        url: `/api/files/${key}`,
        uploadedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      
      // Update progress to indicate failure
      await UploadProgressService.updateFileProgress(uploadId, file.name, {
        status: "error",
        progress: 0,
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  }
  
  return results;
} 
import { withErrorHandler, createApiResponse } from '@/middleware/api.server';
import { uploadFiles } from '@/services/file-upload.server';
import { UploadProgressService } from '@/services/progress.server';

export async function action({ request, params }: { request: Request; params: { id: string } }) {
  return withErrorHandler(async () => {
    if (request.method !== "POST") {
      return createApiResponse({ success: false, error: "Method not allowed" }, 405);
    }
    
    const uploadId = params.id;
    if (!uploadId) {
      return createApiResponse({ success: false, error: "Missing upload ID" }, 400);
    }
    
    try {
      const formData = await request.formData();
      const files = formData.getAll('files') as File[];
      
      if (!files || files.length === 0) {
        return createApiResponse({ success: false, error: "No files provided" }, 400);
      }
      
      // Handle file upload
      const uploadResults = await uploadFiles(files, uploadId);
      
      // Update progress
      await UploadProgressService.finalizeUpload(uploadId, uploadResults);
      
      return createApiResponse({
        success: true,
        uploadId,
        files: uploadResults
      });
    } catch (error) {
      console.error("File upload error:", error);
      return createApiResponse(
        { success: false, error: error instanceof Error ? error.message : "Upload failed" }, 
        500
      );
    }
  });
} 
import { getUserId } from '@/services/auth.server';
import { uploadFile } from '@/services/uploaded-file.server';
import { UploadProgressService } from '@/services/progress.server';

/**
 * API endpoint loader that rejects GET requests for file uploads
 */
export async function loader({ request }: { request: Request }) {
  return Response.json(
    {
      error: 'only for post',
      message: 'use post request',
    },
    { status: 405 }
  );
}

/**
 * API endpoint to handle file uploads with progress tracking and database storage
 */
export async function action({ request }: { request: Request }) {
  try {
    // Get user authentication
    const userId = await getUserId(request);
    if (!userId) {
      return Response.json(
        {
          success: false,
          error: '用戶未認證',
        },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const uploadId = formData.get('uploadId') as string;
    const files = formData.getAll('files') as File[];

    if (!uploadId) {
      return Response.json(
        {
          success: false,
          error: 'Missing uploadId',
        },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return Response.json(
        {
          success: false,
          error: 'No files provided',
        },
        { status: 400 }
      );
    }

    console.log(`🚀 Processing ${files.length} files for user ${userId}, uploadId: ${uploadId}`);

    const fileResults = await Promise.all(
      files.map(async (file) => {
        try {
          await UploadProgressService.updateFileProgress(uploadId, file.name, {
            status: 'uploading',
            progress: 0,
          });

          // Upload using the new service
          const result = await uploadFile({
            userId,
            file,
            originalFileName: file.name
          });

          if (!result.success) {
            throw new Error(result.error || 'Upload failed');
          }

          await UploadProgressService.updateFileProgress(uploadId, file.name, {
            status: 'success',
            progress: 100,
          });

          console.log(`✅ File uploaded successfully: ${file.name} -> ${result.fileId}`);

          return {
            fileId: result.fileId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            success: true
          };
        } catch (error) {
          console.error(`❌ Upload failed for ${file.name}:`, error);

          await UploadProgressService.updateFileProgress(uploadId, file.name, {
            status: 'error',
            progress: 0,
            error: error instanceof Error ? error.message : '上傳失敗',
          });

          return {
            fileName: file.name,
            success: false,
            error: error instanceof Error ? error.message : '上傳失敗'
          };
        }
      })
    );

    const successfulUploads = fileResults.filter(result => result.success);
    const failedUploads = fileResults.filter(result => !result.success);

    // Log completion status
    console.log(`Upload completed for ${uploadId}: ${successfulUploads.length}/${files.length} successful`);

    return Response.json({
      success: true,
      uploadId,
      results: fileResults,
      summary: {
        total: files.length,
        successful: successfulUploads.length,
        failed: failedUploads.length,
      },
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '上傳過程中發生錯誤',
      },
      { status: 500 }
    );
  }
}
import { uploadToStorage } from '@/services/storage.server';
import { UploadProgressService } from '@/services/progress.server';

/**
 * API endpoint loader that rejects GET requests for file uploads
 * @param {Object} params - Route parameters
 * @param {Request} params.request - HTTP request object
 * @returns {Promise<Response>} JSON error response indicating POST method required
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
 * Temporary multipart form data parser until proper implementation
 * @param {Request} request - HTTP request with multipart form data
 * @param {any} uploadHandler - Upload handler function (unused in current implementation)
 * @returns {Promise<FormData>} Parsed form data
 */
async function parseMultipartFormData(request: Request, uploadHandler: any) {
  // This is a simplified version that doesn't track progress
  // You'll need to implement a proper multipart parser
  const formData = await request.formData();
  return formData;
}

/**
 * Creates an upload handler for processing file uploads with progress tracking
 * @param {string} uploadId - Unique upload session identifier
 * @returns {Function} Upload handler function for processing file chunks
 */
function createUploadHandler(uploadId: string) {
  return async ({ name, filename, data, contentType }: any) => {
    if (name !== 'files' || !filename) {
      return undefined;
    }

    try {
      const chunks: Uint8Array[] = [];
      let totalSize = 0;
      const fileKey = `uploads/${Date.now()}-${filename}`;

      await UploadProgressService.updateFileProgress(uploadId, filename, {
        status: 'uploading',
        progress: 0,
      });

      for await (const chunk of data) {
        chunks.push(chunk);
        totalSize += chunk.length;

        await UploadProgressService.updateFileProgress(uploadId, filename, {
          status: 'uploading',
          progress: Math.floor((50 * chunks.length) / (chunks.length + 1)),
        });
      }

      const buffer = Buffer.concat(chunks);

      await UploadProgressService.updateFileProgress(uploadId, filename, {
        status: 'uploading',
        progress: 75,
      });

      const result = await uploadToStorage(buffer, fileKey, contentType);

      await UploadProgressService.updateFileProgress(uploadId, filename, {
        status: 'success',
        progress: 100,
      });

      return JSON.stringify({
        name: filename,
        size: buffer.length,
        type: contentType,
        url: result.url,
        key: fileKey,
      });
    } catch (error) {
      console.error(`上傳檔案 ${filename} 失敗:`, error);

      await UploadProgressService.updateFileProgress(uploadId, filename, {
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : '上傳失敗',
      });

      throw error;
    }
  };
}

/**
 * API endpoint to handle file uploads with progress tracking
 * @param {Object} params - Route parameters
 * @param {Request} params.request - HTTP request with multipart form data containing files and uploadId
 * @returns {Promise<Response>} JSON response with upload results or error
 */
export async function action({ request }: { request: Request }) {
  try {
    let uploadId: string;

    const clonedRequest = request.clone();

    const formDataForId = await clonedRequest.formData();
    uploadId = formDataForId.get('uploadId') as string;
    const uploadHandler = createUploadHandler(uploadId);

    // Use our temporary implementation
    const formData = await parseMultipartFormData(request, uploadHandler);

    const files = formData.getAll('files') as File[];
    const fileResults = await Promise.all(
      files.map(async (file) => {
        const fileKey = `uploads/${Date.now()}-${file.name}`;

        await UploadProgressService.updateFileProgress(uploadId, file.name, {
          status: 'uploading',
          progress: 0,
        });

        const buffer = Buffer.from(await file.arrayBuffer());

        await UploadProgressService.updateFileProgress(uploadId, file.name, {
          status: 'uploading',
          progress: 50,
        });

        const result = await uploadToStorage(buffer, fileKey, file.type);

        await UploadProgressService.updateFileProgress(uploadId, file.name, {
          status: 'success',
          progress: 100,
        });

        return {
          name: file.name,
          size: file.size,
          type: file.type,
          url: result.url,
          key: fileKey,
        };
      })
    );

    return Response.json({
      success: true,
      uploadId,
      files: fileResults,
    });
  } catch (error) {
    console.error('檔案上傳處理失敗:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '檔案上傳處理失敗',
      },
      { status: 500 }
    );
  }
}

import { uploadToStorage } from "@/services/storage.server";
import { UploadProgressService } from "@/services/progress.server";

export async function loader({ request }: { request: Request }) {
  return Response.json(
    {
      error: "only for post",
      message: "use post request",
    },
    { status: 405 }
  );
}

// Create a temporary implementation until the proper multipart handling is set up
async function parseMultipartFormData(request: Request, uploadHandler: any) {
  // This is a simplified version that doesn't track progress
  // You'll need to implement a proper multipart parser
  const formData = await request.formData();
  return formData;
}

function createUploadHandler(uploadId: string) {
  return async ({ name, filename, data, contentType }: any) => {
    if (name !== "files" || !filename) {
      return undefined;
    }

    try {
      const chunks: Uint8Array[] = [];
      let totalSize = 0;
      const fileKey = `uploads/${Date.now()}-${filename}`;

      await UploadProgressService.updateFile(uploadId, filename, {
        fileName: filename,
        fileSize: 0,
        progress: 0,
        status: "uploading",
      });

      for await (const chunk of data) {
        chunks.push(chunk);
        totalSize += chunk.length;

        await UploadProgressService.updateFile(uploadId, filename, {
          fileName: filename,
          fileSize: totalSize,
          progress: Math.floor((50 * chunks.length) / (chunks.length + 1)), 
          status: "uploading",
        });
      }

      const buffer = Buffer.concat(chunks);

      await UploadProgressService.updateFile(uploadId, filename, {
        fileName: filename,
        fileSize: buffer.length,
        progress: 75,
        status: "uploading",
      });

      const result = await uploadToStorage(buffer, fileKey, contentType);

      await UploadProgressService.updateFile(uploadId, filename, {
        fileName: filename,
        fileSize: buffer.length,
        progress: 100,
        status: "success",
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

      await UploadProgressService.updateFile(uploadId, filename, {
        fileName: filename,
        fileSize: 0,
        progress: 0,
        status: "error",
        error: error instanceof Error ? error.message : "上傳失敗",
      });

      throw error;
    }
  };
}

export async function action({ request }: { request: Request }) {
  try {
    let uploadId: string;

    const clonedRequest = request.clone();

    const formDataForId = await clonedRequest.formData();
    uploadId = formDataForId.get("uploadId") as string;
    const uploadHandler = createUploadHandler(uploadId);

    // Use our temporary implementation
    const formData = await parseMultipartFormData(
      request,
      uploadHandler
    );

    const fileDataStrings = formData.getAll("files") as string[];

    const files = fileDataStrings.map((fileStr) => JSON.parse(fileStr));

    return Response.json({
      success: true,
      uploadId,
      files,
    });
  } catch (error) {
    console.error("檔案上傳處理失敗:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "檔案上傳處理失敗",
      },
      { status: 500 }
    );
  }
}

import crypto from "crypto";
import { UploadProgressService } from "@/services/progress.server";

/**
 * get new id
 */
export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return Response.json(
      { success: false, error: "只接受 POST 請求" },
      { status: 405 }
    );
  }

  try {
    const uploadId = crypto.randomUUID();

    try {
      await UploadProgressService.initialize(uploadId);
    } catch (initError) {
      console.warn("初始化上傳進度記錄失敗:", initError);
    }

    console.log("生成新的上傳 ID:", uploadId);

    return Response.json({
      success: true,
      uploadId,
    });
  } catch (error) {
    console.error("生成上傳 ID 失敗:", error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "生成上傳 ID 失敗",
      },
      { status: 500 }
    );
  }
}

/**
 * 
 */
export async function loader() {
  return Response.json(
    {
      success: false,
      error: "use POST to upload ID",
    },
    { status: 405 }
  );
}

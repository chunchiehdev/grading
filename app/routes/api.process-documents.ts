import { ActionFunction } from "@remix-run/node";
import { processDocuments } from "@/services/document-processor.server"
import type { UploadedFileInfo, DocumentSummary } from "@/types/files";

const MAX_CONTENT = 200
export const action: ActionFunction = async ({ request }) => {
  try {
    if (request.method !== "POST") {
      return Response.json({ success: false, error: "只支援 POST 請求" }, { status: 405 });
    }
    
    const reqData = await request.json();
    const files: UploadedFileInfo[] = JSON.parse(reqData.files || "[]");
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return Response.json({ 
        success: false, 
        error: "未提供有效的檔案資訊" 
      }, { status: 400 });
    }
    
    console.log(`開始處理 ${files.length} 個檔案...`);
    
    const { documents, errors } = await processDocuments(files);
    
    console.log("testing")
   const documentSummaries: DocumentSummary[] = documents.map(doc => ({
      fileName: doc.fileName,
      fileKey: doc.fileKey,
      content: doc.content,
      hasError: !!doc.error,
      contentLength: doc.content.length,
      error: doc.error
    }));
    

    return Response.json({
      success: true,
      documentCount: documents.length,
      documents: documentSummaries,
      errors: errors.length > 0 ? errors : undefined,
      processedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("文件處理失敗:", error);
    return Response.json({
      success: false,
      error: "文件處理服務目前不可用，請稍後再試",
      serviceUnavailable: true 
    }, { status: 503 }); 
  }
};

export const loader = () => {
  return Response.json({ error: "Method Not Allowed" }, { status: 405 });
};
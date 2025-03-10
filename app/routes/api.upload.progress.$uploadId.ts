import type { LoaderFunctionArgs } from "@remix-run/node";
import { eventStream } from "remix-utils/sse/server";
import { UploadProgressService } from "@/services/progress.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { uploadId } = params;
  
  if (!uploadId) {
    return new Response("Missing uploadId", { status: 400 });
  }

  return eventStream(request.signal, (send) => {

    const id: string = uploadId;

    sendProgress();
    
    const interval = setInterval(sendProgress, 100);
    
    async function sendProgress() {
      try {
        const progress = await UploadProgressService.getFiles(id);
        
        if (progress) {
          send({ 
            event: "upload-progress", 
            data: JSON.stringify(progress) 
          });
        }
      } catch (error) {
        console.error("獲取上傳進度失敗:", error);
        send({ 
          event: "error", 
          data: JSON.stringify({ error: "無法獲取上傳進度" }) 
        });
      }
    }
    
    return () => {
      clearInterval(interval);
    };
  });
}
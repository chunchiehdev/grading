import { UploadProgressService } from "@/services/progress.server";

export async function loader({ params, request }: { params: { uploadId: string }, request: Request }) {
  const { uploadId } = params;
  
  if (!uploadId) {
    return new Response("Missing uploadId", { status: 400 });
  }

  // Check if this is an SSE request
  const acceptHeader = request.headers.get("Accept");
  const isEventStream = acceptHeader && acceptHeader.includes("text/event-stream");
  
  if (isEventStream) {
    // Set up SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Initial data
          const progress = await UploadProgressService.getFiles(uploadId);
          if (progress) {
            controller.enqueue(`event: upload-progress\ndata: ${JSON.stringify(progress)}\n\n`);
          }
          
          // Setup interval to check for updates
          const interval = setInterval(async () => {
            try {
              const updatedProgress = await UploadProgressService.getFiles(uploadId);
              if (updatedProgress) {
                controller.enqueue(`event: upload-progress\ndata: ${JSON.stringify(updatedProgress)}\n\n`);
              }
            } catch (err) {
              console.error("Error in SSE interval:", err);
            }
          }, 1000);
          
          // Cleanup on timeout or completion
          setTimeout(() => {
            clearInterval(interval);
            controller.close();
          }, 5 * 60 * 1000); // 5 minutes max
        } catch (error) {
          console.error("Error in SSE stream:", error);
          controller.close();
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });
  }
  
  // Regular JSON response for non-SSE requests
  try {
    const progress = await UploadProgressService.getFiles(uploadId);
    
    if (!progress) {
      return Response.json({ error: "No progress data found" }, { status: 404 });
    }
    
    return Response.json(progress);
  } catch (error) {
    console.error("Error getting upload progress:", error);
    return Response.json(
      { error: "Failed to get upload progress" },
      { status: 500 }
    );
  }
}
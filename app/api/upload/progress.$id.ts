import { UploadProgressService } from '@/services/progress.server';

/**
 * Server-sent events endpoint for tracking file upload progress
 */
export async function loader({ params }: { params: { id: string } }) {
  const uploadId = params.id;

  if (!uploadId) {
    return new Response('Upload ID is required', { status: 400 });
  }

  console.log(`🔗 New SSE connection for uploadId: ${uploadId}`);

  // Set headers for server-sent events
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Create a new readable stream
  const stream = new ReadableStream({
    async start(controller) {
      let interval: NodeJS.Timeout | null = null;
      let isClosed = false;
      let isClosing = false; 
      
      const closeController = () => {
        if (isClosed) {
          console.log(`⚠️ SSE Controller already closed for ${uploadId}`);
          return;
        }
        if (isClosing) {
          console.log(`⚠️ SSE Controller already closing for ${uploadId}`);
          return;
        }
        
        isClosing = true;
        isClosed = true;
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        try {
          controller.close();
          console.log(`🔌 SSE Controller closed for ${uploadId}`);
        } catch (e: any) {
          // Controller already closed, ignore
          console.log(`💡 SSE Controller was already closed for ${uploadId}:`, e.message);
        }
      };

      const safeEnqueue = (data: Uint8Array) => {
        if (isClosed || isClosing) {
          console.log(`⚠️ Attempted to write to closed/closing SSE for ${uploadId}`);
          return false;
        }
        try {
          controller.enqueue(data);
          return true;
        } catch (error: any) {
          console.log(`❌ Error enqueuing SSE data for ${uploadId}:`, error.message);
          closeController();
          return false;
        }
      };
      
      try {
        // Send initial message to keep connection alive
        if (!safeEnqueue(new TextEncoder().encode(': ping\n\n'))) return;
        
        // Send initial progress data
        const progress = await UploadProgressService.getProgress(uploadId);
        console.log(`📊 Initial progress for ${uploadId}:`, progress);
        if (!safeEnqueue(new TextEncoder().encode(`event: upload-progress\ndata: ${JSON.stringify(progress)}\n\n`))) return;

        // Set up interval to send progress updates
        interval = setInterval(async () => {
          if (isClosed || isClosing) return;
          try {
            // Send keep-alive comment
            if (!safeEnqueue(new TextEncoder().encode(': ping\n\n'))) return;
            
            const updatedProgress = await UploadProgressService.getProgress(uploadId);
            const event = `event: upload-progress\ndata: ${JSON.stringify(updatedProgress)}\n\n`;
            if (!safeEnqueue(new TextEncoder().encode(event))) return;

            // Check if all files are done 
            const hasFiles = Object.keys(updatedProgress).length > 0;
            if (hasFiles && !isClosing) {
              const allDone = Object.values(updatedProgress).every(
                (file: any) => file.status === 'success' || file.status === 'error'
              );

              if (allDone) {
                console.log(`🎉 All files uploaded for ${uploadId}, scheduling close`);
                isClosing = true; 
                setTimeout(closeController, 2000); // Give time for final update
                return;
              }
            }
          } catch (error) {
            console.error(`❌ Error sending progress update for ${uploadId}:`, error);
            closeController();
          }
        }, 500);

        // Clean up interval when client disconnects or timeout
        setTimeout(() => {
          console.log(`⏰ SSE connection timeout for ${uploadId}`);
          closeController();
        }, 15 * 60 * 1000); 
      } catch (error) {
        console.error(`❌ Error in upload progress stream for ${uploadId}:`, error);
        closeController();
      }
    },
    cancel() {
      console.log(`🚫 SSE stream cancelled by client for ${uploadId}`);
    }
  });

  return new Response(stream, { headers });
}

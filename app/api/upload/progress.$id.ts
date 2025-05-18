import { UploadProgressService } from '@/services/progress.server';

/**
 * Server-sent events endpoint for tracking file upload progress
 */
export async function loader({ params }: { params: { id: string } }) {
  const uploadId = params.id;

  if (!uploadId) {
    return new Response('Upload ID is required', { status: 400 });
  }

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
      
      const closeController = () => {
        if (!isClosed && interval) {
          isClosed = true;
          clearInterval(interval);
          controller.close();
        }
      };
      
      try {
        // Send initial message to keep connection alive
        controller.enqueue(new TextEncoder().encode(': ping\n\n'));
        
        // Send initial progress data
        const progress = await UploadProgressService.getProgress(uploadId);
        controller.enqueue(new TextEncoder().encode(`event: upload-progress\ndata: ${JSON.stringify(progress)}\n\n`));

        // Set up interval to send progress updates
        interval = setInterval(async () => {
          if (isClosed) return;
          try {
            // Send keep-alive comment
            controller.enqueue(new TextEncoder().encode(': ping\n\n'));
            
            const updatedProgress = await UploadProgressService.getProgress(uploadId);
            const event = `event: upload-progress\ndata: ${JSON.stringify(updatedProgress)}\n\n`;
            controller.enqueue(new TextEncoder().encode(event));

            // Check if all files are done
            const allDone = Object.values(updatedProgress).every(
              (file: any) => file.status === 'success' || file.status === 'error'
            );

            if (allDone) {
              // Send one final update then close
              setTimeout(closeController, 1000);
            }
          } catch (error) {
            console.error('Error sending progress update:', error);
            closeController();
          }
        }, 500);

        // Clean up interval when client disconnects
        setTimeout(closeController, 15 * 60 * 1000); // Max 15 minutes
      } catch (error) {
        console.error('Error in upload progress stream:', error);
        closeController();
      }
    },
  });

  return new Response(stream, { headers });
}

// Prevent caching for this route

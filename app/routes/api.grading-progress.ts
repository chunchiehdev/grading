// api.grading-progress.ts
import { eventStream } from "remix-utils/sse/server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { progressMap } from "~/utils/progressMap.server";

export const shouldRevalidate = () => false;

export async function loader({ request }: LoaderFunctionArgs) {
  console.log('SSE request received');
  
  if (!request.headers.get("accept")?.includes("text/event-stream")) {
    return new Response("SSE not supported", {
      status: 400,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
  
  const url = new URL(request.url);
  const taskId = url.searchParams.get("taskId");
  
  if (!taskId) {
    return new Response("Missing taskId", { 
      status: 400,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
  
  console.log('=== SSE Connection Start ===');
  console.log('TaskId:', taskId);
  
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  });

  let lastProgress: string | null = null;
  let isComplete = false;

  return eventStream(request.signal, function setup(send) {
    console.log('=== SSE Stream Setup ===');
    const initialProgress = progressMap.get(taskId);
    if (initialProgress) {
      console.log('=== Initial Progress ===', initialProgress);
      send({ 
        event: "grading-progress",
        data: JSON.stringify(initialProgress)
      });
      lastProgress = JSON.stringify(initialProgress);
    }

    const interval = setInterval(() => {
      const progress = progressMap.get(taskId);
      
      // 只在進度有變化時發送
      if (progress && JSON.stringify(progress) !== lastProgress) {
        console.log('=== Progress Update ===', {
          phase: progress.phase,
          progress: progress.progress,
          message: progress.message
        });
        
        send({ 
          event: "grading-progress",
          data: JSON.stringify(progress)
        });
        lastProgress = JSON.stringify(progress);

        // 處理完成狀態
        if (progress.phase === 'complete' && !isComplete) {
          isComplete = true;
          console.log('=== Grading Complete ===');
          console.log('=== Cleaning Up Resources ===');
          clearInterval(interval);
          progressMap.delete(taskId);
        }
      }
    }, 500); // 增加檢查間隔到 500ms 減少資源消耗

    return function cleanup() {
      console.log('=== SSE Connection Cleanup Start ===');
      clearInterval(interval);
      
      if (progressMap.has(taskId)) {
        console.log('=== Removing Task from Progress Map ===');
        progressMap.delete(taskId);
      }
      
      console.log('=== SSE Connection Cleanup Complete ===');
    };
  }, { headers });
}
// api.grading-progress.ts
import { eventStream } from "remix-utils/sse/server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { ProgressService } from "~/services/progress.server";

export const shouldRevalidate = () => false;

export async function loader({ request }: LoaderFunctionArgs) {
  console.log("SSE request received");

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

  console.log("=== SSE Connection Start ===");
  console.log("TaskId:", taskId);

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  let lastProgress: string | null = null;
  let isComplete = false;

  return eventStream(
    request.signal,
    function setup(send) {
      ProgressService.get(taskId).then((initialProgress) => {
        if (initialProgress) {
          send({
            event: "grading-progress",
            data: JSON.stringify(initialProgress),
          });
          lastProgress = JSON.stringify(initialProgress);
        }
      });
      const interval = setInterval(async () => {
        try {
          const progress = await ProgressService.get(taskId);

          if (progress && JSON.stringify(progress) !== lastProgress) {
            send({
              event: "grading-progress",
              data: JSON.stringify(progress),
            });
            lastProgress = JSON.stringify(progress);

            if (progress.phase === "complete" && !isComplete) {
              isComplete = true;
              clearInterval(interval);
              await ProgressService.delete(taskId);
            }
          }
        } catch (error) {
          console.error("Error fetching progress:", error);
        }
      }, 500);

      return function cleanup() {
        clearInterval(interval);

        ProgressService.exists(taskId).then(async (exists) => {
          if (exists) {
            await ProgressService.delete(taskId);
          }
        });

      };
    },
    { headers }
  );
}

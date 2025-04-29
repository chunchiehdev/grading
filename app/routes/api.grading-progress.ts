// api.grading-progress.ts
import type { LoaderFunctionArgs } from "react-router";
import { ProgressService } from "@/services/progress.server";

export const shouldRevalidate = () => false;

export async function loader({ request }: LoaderFunctionArgs) {
  console.log("=== Loader executed for /api/grading-progress ===");
  
  const url = new URL(request.url);
  const taskId = url.searchParams.get("taskId");

  if (!taskId) {
    return Response.json({ error: "Missing taskId" }, { status: 400 });
  }

  console.log("TaskId:", taskId);

  try {
    const progress = await ProgressService.get(taskId);
    
    if (!progress) {
      return Response.json({ error: "No progress found" }, { status: 404 });
    }
    
    return Response.json(progress);
  } catch (error) {
    console.error("Error fetching progress:", error);
    return Response.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}

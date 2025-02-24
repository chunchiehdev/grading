import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { createNewGrading } from "@/utils/grading.server";

export const action: ActionFunction = async ({ request }) => {
  try {
    const body = await request.json();
    const taskId = await createNewGrading({
      request,
      source: body.source || "unknown",
    });
    return json({ taskId });
  } catch (error) {
    return json({ error: "Failed to create grading task" }, { status: 500 });
  }
};
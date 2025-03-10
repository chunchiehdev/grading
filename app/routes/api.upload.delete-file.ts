import { ActionFunctionArgs } from "@remix-run/node";
import { deleteFromStorage } from "@/services/storage.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "DELETE") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { key } = await request.json();
    
    if (!key) {
      return new Response("Missing key parameter", { status: 400 });
    }

    await deleteFromStorage(key);
    
    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error deleting file from storage:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to delete file" 
      }), 
      { 
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}

export async function loader() {
  return new Response("Method not allowed", { status: 405 });
}
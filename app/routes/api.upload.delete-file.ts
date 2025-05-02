import { withErrorHandler, createApiResponse } from '@/middleware/api.server';

export async function action({ request }: { request: Request }) {
  return withErrorHandler(async () => {
    if (request.method !== "DELETE") {
      return createApiResponse({ success: false, error: "Method not allowed" }, 405);
    }
    
    try {
      const { key } = await request.json();
      
      if (!key) {
        return createApiResponse({ success: false, error: "Missing file key" }, 400);
      }
      
      // In a real implementation, this would delete from S3 or another storage
      console.log(`Would delete file with key: ${key}`);
      
      return createApiResponse({
        success: true,
        message: "File deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      return createApiResponse(
        { success: false, error: error instanceof Error ? error.message : "Failed to delete file" },
        500
      );
    }
  });
}

export async function loader() {
  return new Response("Method not allowed", { status: 405 });
}
import { UploadProgressService } from "@/services/progress.server";

export async function action({ params }: { params: { uploadId: string, filename: string } }) {
  const { uploadId, filename } = params;
  
  console.log("uploadId filename", uploadId, filename)
  if (!uploadId || !filename) {
    return new Response("Missing parameters", { status: 400 });
  }

  try {
    
    const progressData = await UploadProgressService.getFiles(uploadId);
    
    if (progressData && progressData[decodeURIComponent(filename)]) {
    
      await UploadProgressService.updateFile(
        uploadId,
        decodeURIComponent(filename), 
        {
          fileName: decodeURIComponent(filename),
          fileSize: 0,
          progress: 0,
          status: "error",
          error: "Upload cancelled"
        }
      );
    }
    
    return new Response("Progress cleared", { status: 200 });
  } catch (error) {
    console.error("Error clearing progress:", error);
    return new Response("Failed to clear progress", { status: 500 });
  }
}

export async function loader() {
  return new Response("Method not allowed", { status: 405 });
}
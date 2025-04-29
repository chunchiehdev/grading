// app/routes/test-sse.tsx
/**
 * This file just for testing. It's not used in the app.
 */

import { useState, useEffect, useRef } from "react";

// Custom hook for EventSource
const useEventSource = (url: string, options?: { event?: string, enabled?: boolean }) => {
  const [data, setData] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url || options?.enabled === false) {
      return;
    }

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    const eventName = options?.event || 'message';
    
    const handler = (event: MessageEvent) => {
      setData(event.data);
    };

    eventSource.addEventListener(eventName, handler);

    return () => {
      eventSource.removeEventListener(eventName, handler);
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [url, options?.event, options?.enabled]);

  return data;
};

export default function TestSSE() {
  const count = useEventSource("/api/counter", {
    event: "counter"
  });
  
  const uploadProgress = useEventSource("/api/upload/progress/test-id", {
    event: "upload-progress"
  });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">SSE Test Page</h1>
      
      <div className="bg-white shadow rounded p-4 mb-4">
        <h2 className="text-xl font-semibold mb-2">Counter Test</h2>
        <p className="text-gray-700">Current count: {count || "Connecting..."}</p>
      </div>
      
      <div className="bg-white shadow rounded p-4">
        <h2 className="text-xl font-semibold mb-2">Upload Progress Test</h2>
        <p className="text-gray-700">
          {uploadProgress 
            ? <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(JSON.parse(uploadProgress), null, 2)}</pre>
            : "Connecting..."}
        </p>
      </div>
    </div>
  );
}
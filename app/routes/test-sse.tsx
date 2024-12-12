// app/routes/test-sse.tsx
import { useEventSource } from "remix-utils/sse/react";

export default function TestSSE() {
  const count = useEventSource("/api/counter", {
    event: "counter"
  });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">SSE Test Page</h1>
      <div className="bg-white shadow rounded p-4">
        <p className="text-gray-700">Current count: {count || "Connecting..."}</p>
      </div>
    </div>
  );
}
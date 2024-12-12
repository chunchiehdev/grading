import { eventStream } from "remix-utils/sse/server";
import type { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  console.log("=== SSE Counter Connection Attempt");

  return eventStream(request.signal, function setup(send) {
    console.log("=== SSE Counter Stream Setup");
    let count = 0;
    
    const interval = setInterval(() => {
      count++;
      console.log(`=== Sending count: ${count}`);
      send({ 
        event: "counter", 
        data: count.toString() 
      });
    }, 1000);
    
    return function cleanup() {
      console.log("=== SSE Counter Cleanup");
      clearInterval(interval);
    };
  });
}


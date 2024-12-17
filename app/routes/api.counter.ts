import { eventStream } from "remix-utils/sse/server";
import type { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {

  return eventStream(request.signal, function setup(send) {
    let count = 0;
    
    const interval = setInterval(() => {
      count++;
      send({ 
        event: "counter", 
        data: count.toString() 
      });
    }, 1000);
    
    return function cleanup() {
      clearInterval(interval);
    };
  });
}


import { useRouteError, isRouteErrorResponse } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';
import { Form, useActionData } from 'react-router';
import { useEffect, useState } from 'react';
import { redis } from '@/lib/redis';
import { ErrorPage } from '@/components/errors/ErrorPage';

// Action to simulate backend publishing
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const sessionId = formData.get('sessionId') as string;
  const message = formData.get('message') as string;

  if (sessionId && message) {
    if (message === 'simulate_stream') {
        // Fire-and-forget background simulator
        console.log(`[Test] Starting simulation for session:${sessionId}`);
        (async () => {
            const steps = [
                "Thinking about the rubric structure...",
                "Reading student submission (500 words)...",
                "Evaluating criterion 1: Argument Quality...",
                "Found weak evidence in paragraph 2...",
                "Drafting feedback for criterion 1...",
                "Moving to criterion 2: Evidence...",
                "Conclusion: Score 80/100"
            ];
            
            for (const step of steps) {
                await new Promise(r => setTimeout(r, 800)); // 0.8s delay
                await redis.publish(
                  `session:${sessionId}`,
                  JSON.stringify({
                    type: 'thought',
                    content: step,
                    timestamp: new Date().toISOString(),
                  })
                );
            }
        })().catch(err => console.error(err));
        
        return { success: true, simulated: true };
    }

    console.log(`[Test] Publishing to session:${sessionId}: ${message}`);
    await redis.publish(
      `session:${sessionId}`,
      JSON.stringify({
        type: 'thought',
        content: message,
        timestamp: new Date().toISOString(),
      })
    );
    return { success: true };
  }
  return { success: false };
}

export default function TestSSE() {
  const [sessionId] = useState('test-session-' + Math.floor(Math.random() * 1000));
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState('Disconnected');

  useEffect(() => {
    // 1. Connect to SSE
    const url = `/api/grading/events/${sessionId}`;
    console.log('[Test] Connecting to:', url);
    const evtSource = new EventSource(url);

    setStatus('Connecting...');

    evtSource.onopen = () => {
      setStatus('Connected');
      setMessages(prev => [...prev, '✅ System: Connection Open']);
    };

    evtSource.onmessage = (event) => {
      console.log('[Test] Raw Event:', event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') {
            setMessages(prev => [...prev, `🟢 System: ${data.content}`]);
        } else if (data.type === 'thought') {
            setMessages(prev => [...prev, `🧠 AI (Bulk): ${data.content}`]);
        } else if (data.type === 'thought_stream') {
            // For testing, we might want to see chunks or accumulate them
            // Here we just log chunks to show activity
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.startsWith('🧠 AI (Stream):')) {
                    return [...prev.slice(0, -1), lastMsg + data.content];
                }
                return [...prev, `🧠 AI (Stream): ${data.content}`];
            });
        }
      } catch (e) {
        setMessages(prev => [...prev, `❌ Error: Failed to parse ${event.data}`]);
      }
    };

    evtSource.onerror = (err) => {
      console.error('[Test] SSE Error:', err);
      // setStatus('Error');
      // evtSource.close();
    };

    return () => {
      evtSource.close();
    };
  }, [sessionId]);

  return (
    <div className="p-10 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">SSE Isolation Test</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <p><strong>Session ID:</strong> {sessionId}</p>
        <p><strong>Status:</strong> {status}</p>
      </div>

      <div className="border border-blue-500 rounded-lg p-6 min-h-[300px] bg-black text-green-400 font-mono text-sm overflow-y-auto">
         {messages.length === 0 && <p className="text-gray-500 italic">Waiting for messages...</p>}
         {messages.map((m, i) => (
            <div key={i} className="mb-1 border-b border-gray-800 pb-1">{m}</div>
         ))}
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold">Simulate Backend Publish</h2>
        <div className="flex gap-2">
            <Form method="post" className="flex gap-2 w-full">
                <input type="hidden" name="sessionId" value={sessionId} />
                <input 
                    type="text" 
                    name="message" 
                    defaultValue="Test thought from backend"
                    className="flex-1 border p-2 rounded"
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Publish to Redis
                </button>
            </Form>
        </div>
        <div className="flex gap-2">
            <Form method="post" className="flex gap-2">
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="message" value="Analzying input structure..." />
                <button type="submit" className="bg-gray-600 text-white px-4 py-2 rounded">
                    Msg 1
                </button>
            </Form>
            <Form method="post" className="flex gap-2">
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="message" value="Evaluating prompt criteria..." />
                <button type="submit" className="bg-gray-600 text-white px-4 py-2 rounded">
                    Msg 2
                </button>
            </Form>
            
            <div className="w-full flex justify-end">
                <Form method="post" className="flex gap-2">
                    <input type="hidden" name="sessionId" value={sessionId} />
                    <input type="hidden" name="message" value="simulate_stream" />
                    <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold shadow-lg transition-transform active:scale-95">
                        ▶️ Simulate AI Thinking Stream
                    </button>
                </Form>
            </div>
        </div>
      </div>
    </div>
  );
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ErrorPage statusCode={404} messageKey="errors.generic.message" returnTo="/" />;
  }

  return <ErrorPage statusCode="errors.generic.title" messageKey="errors.generic.message" returnTo="/" />;
}

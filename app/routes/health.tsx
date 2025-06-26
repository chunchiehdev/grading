import { checkHealth } from '@/utils/healthCheck.server';
export async function loader() {
  const health = await checkHealth();

  const response = {
    status: health.status,
    timestamp: health.timestamp,
    message: health.status === 'healthy' ? 'Service is healthy' : 'Service is unhealthy',
  };

  const statusCode = health.status === 'healthy' ? 200 : 500;

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

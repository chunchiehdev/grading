import { type ActionFunctionArgs, data } from 'react-router';
import logger from '@/utils/logger';

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return data({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const payload = await request.json();
    // Use a special prefix so we can easily grep these from the log file later for the thesis
    logger.info(`[ResearchLog] ${JSON.stringify(payload)}`);
    
    // In a real production environment for the thesis, we might want to write this 
    // to a separate 'research-events' table in Prisma, but for now, 
    // structured logging is sufficient for qualitative analysis.
    
    return data({ success: true });
  } catch (error) {
    logger.error('Failed to parse log request', error);
    return data({ error: 'Invalid Request' }, { status: 400 });
  }
};

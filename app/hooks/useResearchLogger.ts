import { useCallback } from 'react';
import { useLocation } from 'react-router';

type LogEvent = 
  | 'SPARRING_START' 
  | 'SPARRING_RESPONSE' 
  | 'SPARRING_DECISION'
  | 'REVEAL_SCORE'
  | 'VIEW_RUBRIC_DETAIL';

export function useResearchLogger() {
  const location = useLocation();

  const logEvent = useCallback((event: LogEvent, data: any) => {
    // Fire and forget
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        data,
        url: location.pathname,
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error('Log failed', err));
  }, [location]);

  return { logEvent };
}

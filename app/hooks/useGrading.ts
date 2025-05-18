import { useMutation } from '@tanstack/react-query';
import { useGradingStore } from '@/stores/gradingStore';
import { useUiStore } from '@/stores/uiStore';
import { useEffect, useRef, useState } from 'react';
import logger from '@/utils/logger';

interface GradeWithRubricParams {
  fileKey: string;
  rubricId: string;
  gradingId: string;
}

export function useGrading() {
  const { startGrading, updateProgress, setResult, setError, gradingProgress } = useGradingStore();
  const { setStep, setCanProceed } = useUiStore();
  const progressSubscriptionRef = useRef<(() => void) | null>(null);
  const [sseStatus, setSseStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

  const subscribeToProgress = (gradingId: string) => {
    // Clean up any existing connection first
    if (progressSubscriptionRef.current) {
      logger.info('Closing existing SSE connection before creating a new one');
      progressSubscriptionRef.current();
      progressSubscriptionRef.current = null;
    }
    
    setSseStatus('connecting');
    logger.info(`🔄 Subscribing to progress updates for ${gradingId}`);
    
    try {
      const eventSource = new EventSource(`/api/grade-progress?gradingId=${gradingId}`);
      
      eventSource.onopen = () => {
        logger.info(`📡 SSE connection opened for ${gradingId}`);
        setSseStatus('connected');
      };
      
      eventSource.onmessage = (event) => {
        try {
          const progressData = JSON.parse(event.data);
          logger.info(`📊 Progress update for ${gradingId}:`, progressData);
          
          if (progressData.phase === 'completed') {
            logger.info(`✅ Grading completed:`, progressData.result);
            
            // Save the result data to localStorage directly as a backup
            try {
              const backupKey = `grade-result-${gradingId}`;
              localStorage.setItem(backupKey, JSON.stringify(progressData.result));
              logger.info(`💾 Saved backup of result to localStorage: ${backupKey}`);
            } catch (err) {
              console.warn('Failed to save backup result to localStorage:', err);
            }
            
            // Update the store
            setResult(progressData.result);
            setStep('result');
            setCanProceed(true);
            eventSource.close();
            setSseStatus('idle');
          } else if (progressData.phase === 'error') {
            console.error(`❌ Grading error:`, progressData.error);
            setError(progressData.error || '評分過程中發生錯誤');
            setCanProceed(false);
            eventSource.close();
            setSseStatus('error');
          } else {
            if (progressData.phase && ['check', 'grade', 'verify'].includes(progressData.phase)) {
              updateProgress({
                phase: progressData.phase,
                progress: progressData.progress,
                message: progressData.message,
              });
            } else {
              if (typeof progressData.progress !== 'undefined' || typeof progressData.message !== 'undefined') {
                updateProgress({
                  progress: progressData.progress,
                  message: progressData.message,
                });
              }
            }
          }
        } catch (err) {
          console.error('Error processing progress update:', err);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setSseStatus('error');
        setError('進度追蹤連接失敗');
        eventSource.close();
      };
      
      progressSubscriptionRef.current = () => {
        logger.info(`Closing SSE connection for ${gradingId}`);
        eventSource.close();
        setSseStatus('idle');
      };
    } catch (error) {
      console.error('Error setting up SSE connection:', error);
      setSseStatus('error');
      setError('無法建立進度追蹤連接');
    }
  };

  const gradeMutation = useMutation({
    mutationFn: async ({ fileKey, rubricId, gradingId }: GradeWithRubricParams) => {
      logger.info(`🚀 Starting grading:`, { fileKey, rubricId, gradingId });
      const formData = new FormData();
      formData.append('fileKey', fileKey);
      formData.append('rubricId', rubricId);
      formData.append('gradingId', gradingId);
      
      try {
        const response = await fetch('/api/grade-with-rubric', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error response from server: ${response.status} ${errorText}`);
          throw new Error(`評分請求失敗: ${response.status}`);
        }
        
        const data = await response.json();
        logger.info(`📡 API response:`, data);
        return data;
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    },
    onMutate: () => {
      startGrading();
      setStep('grading');
      setCanProceed(false);
    },
    onSuccess: (data) => {
      logger.info(`📬 Grading request successful:`, data);
      // The actual result will come through the SSE channel
    },
    onError: (error) => {
      console.error(`❌ Grading request failed:`, error);
      setResult(null);
      setError(error instanceof Error ? error.message : '評分過程中發生錯誤');
      setCanProceed(false);
    }
  });

  // Clean up SSE connection on unmount
  useEffect(() => {
    return () => {
      if (progressSubscriptionRef.current) {
        progressSubscriptionRef.current();
      }
    };
  }, []);

  return {
    gradeWithRubric: gradeMutation.mutate,
    isGrading: gradeMutation.isPending || sseStatus === 'connecting' || sseStatus === 'connected',
    error: gradeMutation.error,
    gradingProgress,
    subscribeToProgress,
    sseStatus,
  };
} 
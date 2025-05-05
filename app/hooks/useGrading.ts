import { useMutation } from '@tanstack/react-query';
import { useGradingStore } from '@/stores/gradingStore';
import { useUiStore } from '@/stores/uiStore';

interface GradeWithRubricParams {
  fileKey: string;
  rubricId: string;
}

export function useGrading() {
  const { startGrading, updateProgress, setResult, setError } = useGradingStore();
  const { setStep, setCanProceed } = useUiStore();

  const gradeMutation = useMutation({
    mutationFn: async ({ fileKey, rubricId }: GradeWithRubricParams) => {
      const formData = new FormData();
      formData.append('fileKey', fileKey);
      formData.append('rubricId', rubricId);

      const response = await fetch('/api/grade-with-rubric', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('評分請求失敗');
      }

      return response.json();
    },
    onMutate: () => {
      startGrading();
      setStep('grading');
      setCanProceed(false);
    },
    onSuccess: (data) => {
      if (data.success && data.data?.success && data.data.feedback) {
        const gradingResult = {
          score: data.data.feedback.score || 0,
          imageUnderstanding: data.data.feedback.imageUnderstanding,
          analysis: data.data.feedback.analysis || '',
          criteriaScores: data.data.feedback.criteriaScores || [],
          strengths: data.data.feedback.strengths || [],
          improvements: data.data.feedback.improvements || [],
          overallSuggestions: data.data.feedback.overallSuggestions,
          createdAt: data.data.feedback.createdAt || new Date(),
          gradingDuration: data.data.feedback.gradingDuration,
        };
        setResult(gradingResult);
        setError(null);
        setStep('result');
        setCanProceed(true);
      } else {
        setResult(null);
        setError(data.data?.error || '評分過程中發生錯誤');
        setCanProceed(false);
      }
    },
    onError: (error) => {
      setResult(null);
      setError(error instanceof Error ? error.message : '評分過程中發生錯誤');
      setCanProceed(false);
    }
  });

  return {
    gradeWithRubric: gradeMutation.mutate,
    isGrading: gradeMutation.isPending,
    error: gradeMutation.error
  };
} 
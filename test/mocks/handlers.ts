import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock grade-with-rubric endpoint
  http.post('/api/grade-with-rubric', async () => {
    return HttpResponse.json({
      success: true,
      gradingId: 'test-grading-id',
      data: {
        success: true,
        feedback: {
          score: 85,
          analysis: 'Test analysis',
          criteriaScores: [],
          strengths: [],
          improvements: [],
        },
      },
    });
  }),

  // Mock grade-progress endpoint
  http.get('/api/grade-progress', async ({ request }) => {
    const url = new URL(request.url);
    const gradingId = url.searchParams.get('gradingId');

    if (!gradingId) {
      return new HttpResponse(null, { status: 400 });
    }

    // Simulate progress updates
    const progress = {
      status: 'grading',
      progress: 50,
      message: '正在評分中...',
    };

    return new HttpResponse(
      `data: ${JSON.stringify(progress)}\n\n`,
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }),
]; 
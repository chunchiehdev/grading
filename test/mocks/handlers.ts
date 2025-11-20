import { http, HttpResponse, passthrough } from 'msw';

// Mock handlers for external APIs
// These handlers check the environment variable at REQUEST TIME, not module load time
export const handlers = [
  // Mock/Bypass Gemini API
  http.post('https://generativelanguage.googleapis.com/v1beta/models/*', ({ request }) => {
    // 🔧 FIX: Check environment at request time to allow runtime changes
    const useRealApis = process.env.USE_REAL_APIS === 'true';

    if (useRealApis) {
      //   Bypass this request - let it go to the real API
      return passthrough();
    }

    // ❌ Return mock data (only when USE_REAL_APIS !== 'true')
    return HttpResponse.json({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  totalScore: 85,
                  maxScore: 100,
                  breakdown: [
                    {
                      criteriaId: '1',
                      name: 'Content Quality',
                      score: 85,
                      feedback: 'Excellent analysis with clear arguments.',
                    },
                  ],
                  overallFeedback: 'Great work overall!',
                }),
              },
            ],
          },
        },
      ],
    });
  }),

  // Mock/Bypass OpenAI API
  http.post('https://api.openai.com/v1/chat/completions', ({ request }) => {
    // 🔧 FIX: Check environment at request time
    const useRealApis = process.env.USE_REAL_APIS === 'true';

    if (useRealApis) {
      //   Bypass this request - let it go to the real API
      return passthrough();
    }

    // ❌ Return mock data (only when USE_REAL_APIS !== 'true')
    return HttpResponse.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              totalScore: 80,
              maxScore: 100,
              breakdown: [
                {
                  criteriaId: '1',
                  name: 'Content Quality',
                  score: 80,
                  feedback: 'Good analysis with room for improvement.',
                },
              ],
              overallFeedback: 'Solid work with some areas for enhancement.',
            }),
          },
        },
      ],
    });
  }),

  // Mock PDF Parser API (dev endpoint only)
  http.post('https://devgradingpdf.grading.software/parse', ({ request }) => {
    // 🔧 FIX: Check environment at request time
    const useRealApis = process.env.USE_REAL_APIS === 'true';

    if (useRealApis) {
      //   Bypass this request - let it go to the real API
      return passthrough();
    }

    // ❌ Return mock data (only when USE_REAL_APIS !== 'true')
    const taskId = `mock-task-${Date.now()}`;
    return HttpResponse.json({
      task_id: taskId,
      success: true,
    });
  }),

  // Mock PDF task status polling endpoint (dev only)
  http.get('https://devgradingpdf.grading.software/task/:taskId', ({ request }) => {
    // 🔧 FIX: Check environment at request time
    const useRealApis = process.env.USE_REAL_APIS === 'true';

    if (useRealApis) {
      //   Bypass this request - let it go to the real API
      return passthrough();
    }

    // ❌ Return mock data (only when USE_REAL_APIS !== 'true')
    return HttpResponse.json({
      status: 'success',
      content: 'This is parsed PDF content for testing.\n\nTest Essay: Climate Change Analysis\n\nClimate change is one of the most pressing issues of our time.',
      metadata: {
        pages: 1,
        words: 50,
      },
    });
  }),
];

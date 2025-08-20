import { http, HttpResponse } from 'msw';

// Mock handlers for external APIs
export const handlers = [
  // Mock Gemini API
  http.post('https://generativelanguage.googleapis.com/v1beta/models/*', () => {
    return HttpResponse.json({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              totalScore: 85,
              maxScore: 100,
              breakdown: [
                {
                  criteriaId: '1',
                  name: 'Content Quality',
                  score: 85,
                  feedback: 'Excellent analysis with clear arguments.'
                }
              ],
              overallFeedback: 'Great work overall!'
            })
          }]
        }
      }]
    });
  }),
  
  // Mock OpenAI API
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [{
        message: {
          content: JSON.stringify({
            totalScore: 80,
            maxScore: 100,
            breakdown: [
              {
                criteriaId: '1',
                name: 'Content Quality',
                score: 80,
                feedback: 'Good analysis with room for improvement.'
              }
            ],
            overallFeedback: 'Solid work with some areas for enhancement.'
          })
        }
      }]
    });
  }),
  
  // Mock PDF Parser API
  http.post('http://140.115.126.192:8001/parse', () => {
    return HttpResponse.json({
      success: true,
      data: {
        text: 'This is parsed PDF content for testing.',
        metadata: {
          pages: 1,
          words: 8
        }
      }
    });
  })
];
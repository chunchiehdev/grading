import { getGeminiService } from '../app/services/gemini.server';
import logger from '../app/utils/logger';

async function test503Handling() {
  console.log('🧪 Testing 503 error handling...');
  
  const geminiService = getGeminiService();
  
  // Mock a simple grading request
  const testRequest = {
    content: 'This is a test document for grading.',
    criteria: [
      { id: 'test-1', name: 'Content Quality', maxScore: 10 },
      { id: 'test-2', name: 'Structure', maxScore: 10 }
    ],
    fileName: 'test.txt',
    rubricName: 'Test Rubric'
  };
  
  console.log('📝 Sending test grading request...');
  const startTime = Date.now();
  
  try {
    const result = await geminiService.gradeDocument(testRequest);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Request completed in ${duration}ms`);
    console.log('📊 Result:', {
      success: result.success,
      error: result.error,
      retryable: result.metadata?.retryable,
      errorType: result.metadata?.errorType
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ Request failed after ${duration}ms:`, error);
  }
}

// Run the test
test503Handling().catch(console.error); 
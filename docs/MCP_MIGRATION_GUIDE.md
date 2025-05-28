# MCP Migration Guide: From HTTP POST to JSON-RPC

This document provides a comprehensive guide for migrating from the old HTTP POST-based MCP implementation to the new JSON-RPC 2.0 protocol.

## Overview of Changes

### Before: HTTP POST Implementation
- Used simple HTTP POST requests to MCP server
- Returned hardcoded dummy data
- Basic error handling
- No proper protocol standardization
- Limited retry and fallback mechanisms

### After: JSON-RPC 2.0 Implementation
- Uses standardized JSON-RPC 2.0 protocol
- Prepared for real AI integration
- Comprehensive error handling and classification
- Robust retry mechanisms with circuit breaker
- Service abstraction for multiple AI providers
- Enhanced logging and monitoring

## Architecture Changes

### 1. New Service Layer Structure

```
OLD STRUCTURE:
┌─────────────────────┐
│ document-processor  │ ──┐
└─────────────────────┘   │
                          ├─► MCPGradingClient ──► HTTP POST ──► MCP Server
┌─────────────────────┐   │
│ rubric.server       │ ──┘
└─────────────────────┘

NEW STRUCTURE:
┌─────────────────────┐
│ document-processor  │ ──┐
└─────────────────────┘   │
                          ├─► AIServiceManager ──► MCPAIService ──► JsonRpcClient ──► MCP Server
┌─────────────────────┐   │                    │                                │
│ rubric.server       │ ──┘                    └─► [Other AI Services]          └─► JSON-RPC 2.0
└─────────────────────┘
```

### 2. Key Components

#### New Components Added:
- `JsonRpcClient`: Handles JSON-RPC 2.0 communication
- `AIServiceAbstractions`: Interface definitions for AI services
- `MCPAIService`: JSON-RPC based MCP service implementation
- `ErrorHandler`: Centralized error handling and classification
- `RetryHandler`: Retry logic with exponential backoff
- `CircuitBreaker`: Prevents cascading failures

#### Modified Components:
- `document-processor.server.ts`: Uses new AI service manager
- `rubric.server.ts`: Integrates with AI service abstractions
- `mcp.server.ts`: Maintains backward compatibility
- `mcp.ts`: Enhanced configuration options

## Code Migration Examples

### 1. Document Analysis Migration

#### Old Implementation:
```typescript
// OLD: HTTP POST based
const mcpClient = createMCPGradingClient();
const mcpResponse = await mcpClient.analyzeDocument(
  file.name,
  file.type,
  fileData.buffer
);

if (!mcpResponse.success) {
  // Basic error handling
  throw new Error(mcpResponse.error);
}
```

#### New Implementation:
```typescript
// NEW: AI Service Manager with JSON-RPC
const serviceManager = getAIServiceManager();
const analysisResult = await serviceManager.analyzeDocument(
  file.name,
  file.type,
  fileData.buffer,
  {
    format: file.type,
    fileSize: fileData.buffer.length,
    needsOCR: file.type.includes('image'),
  }
);

if (!analysisResult.success) {
  // Enhanced error handling with fallback
  if (FALLBACK_TO_API) {
    return await processDocumentWithAPI(file);
  }
  throw new EnhancedError(analysisResult.error);
}
```

### 2. Grading Migration

#### Old Implementation:
```typescript
// OLD: Direct MCP client usage
const mcpClient = createMCPGradingClient();
const mcpResponse = await mcpClient.gradeDocument(documentResult, rubric, gradingId);

if (!mcpResponse.success) {
  return { success: false, error: mcpResponse.error };
}

const gradingResult = convertMCPResponseToLegacyFormat(mcpResponse);
```

#### New Implementation:
```typescript
// NEW: AI Service Manager with progress callbacks
const serviceManager = new AIServiceManager(registry, strategy);

const progressCallback = async (progress: number, message: string) => {
  if (gradingId) {
    await GradingProgressService.updateProgress(gradingId, { 
      phase: 'grade', 
      progress: Math.min(30 + (progress * 0.6), 90),
      message 
    });
  }
};

const aiResult = await serviceManager.gradeDocument(documentResult, rubric, {
  gradingId,
  progressCallback,
  requirements: {
    language: 'zh-TW',
    contentLength: documentResult.content.length,
    needsCustomRubric: true,
  },
});

if (!aiResult.success) {
  return { success: false, error: aiResult.error };
}

const gradingResult = convertAIResultToLegacyFormat(aiResult);
```

## Configuration Changes

### Environment Variables

#### New Variables Added:
```bash
# Error handling
MCP_CIRCUIT_BREAKER=true
MCP_ENHANCED_ERRORS=true
MCP_MAX_RETRIES=3
MCP_BASE_RETRY_DELAY=1000
MCP_MAX_RETRY_DELAY=10000
MCP_CIRCUIT_BREAKER_THRESHOLD=5
MCP_CIRCUIT_BREAKER_TIMEOUT=60000
```

#### Existing Variables (No Change Required):
```bash
USE_MCP=true
MCP_GRADING_SERVER_URL=http://localhost:3001/mcp
MCP_AUTH_TOKEN=your_token_here
MCP_FALLBACK_TO_API=true
```

### Configuration Object Changes

#### Old Configuration:
```typescript
const mcpClient = new MCPGradingClient({
  serverUrl: process.env.MCP_SERVER_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' }
});
```

#### New Configuration:
```typescript
const mcpService = new MCPAIService();
// Configuration is handled internally via mcpConfig
// Supports circuit breaker, enhanced errors, retries, etc.
```

## Protocol Changes

### Request Format Changes

#### Old HTTP POST Format:
```typescript
// HTTP POST with custom format
const response = await fetch(serverUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    method: 'grade_document',
    params: { /* custom params */ }
  })
});
```

#### New JSON-RPC Format:
```typescript
// JSON-RPC 2.0 compliant
const response = await jsonRpcClient.call('grade_document', {
  document: { /* document data */ },
  rubric: { /* rubric data */ },
  options: { /* grading options */ }
});
```

### Response Format Changes

#### Old Response Format:
```typescript
{
  success: boolean,
  data?: any,
  error?: string
}
```

#### New Response Format:
```typescript
// JSON-RPC 2.0 compliant
{
  jsonrpc: "2.0",
  result?: {
    overallScore: number,
    overallAnalysis: string,
    criteriaScores: Array<...>,
    // ... additional fields
  },
  error?: {
    code: number,
    message: string,
    data?: any
  },
  id: string | number
}
```

## Error Handling Migration

### Old Error Handling:
```typescript
try {
  const result = await mcpClient.gradeDocument(...);
  if (!result.success) {
    console.error('Grading failed:', result.error);
    // Basic fallback
    return fallbackGrading();
  }
} catch (error) {
  console.error('Request failed:', error);
  throw error;
}
```

### New Error Handling:
```typescript
try {
  const result = await RetryHandler.withRetry(
    () => serviceManager.gradeDocument(...),
    {
      maxAttempts: mcpConfig.errorHandling.maxRetries,
      operationName: 'document_grading',
      onRetry: (error, attempt) => {
        logger.warn(`Grading retry ${attempt}:`, error.message);
      }
    }
  );
} catch (error) {
  const enhancedError = ErrorHandler.handle(error, 'grading', { documentId });
  
  if (ErrorHandler.shouldFallback(enhancedError)) {
    logger.info('Falling back to legacy API');
    return fallbackGrading();
  }
  
  throw enhancedError;
}
```

## Migration Steps

### Step 1: Environment Setup
1. Add new environment variables to your `.env` file
2. Update MCP server URL to support JSON-RPC (if needed)
3. Test configuration with `printMCPConfigSummary()`

### Step 2: Gradual Migration
1. **Phase 1**: Deploy new code with feature flags disabled
2. **Phase 2**: Enable enhanced error handling (`MCP_ENHANCED_ERRORS=true`)
3. **Phase 3**: Enable circuit breaker (`MCP_CIRCUIT_BREAKER=true`)
4. **Phase 4**: Switch to new AI services (`USE_MCP=true` with new implementation)

### Step 3: MCP Server Updates
1. Update your MCP server to support JSON-RPC 2.0 protocol
2. Implement new method signatures (`analyze_document`, `grade_document`)
3. Add health check endpoint (`health` method)
4. Test with new client implementation

### Step 4: Monitoring and Validation
1. Monitor error rates and performance metrics
2. Validate JSON-RPC protocol compliance
3. Test fallback mechanisms
4. Verify logging and error classification

## Testing the Migration

### Unit Tests
```typescript
// Test JSON-RPC client
describe('JsonRpcClient', () => {
  it('should make valid JSON-RPC 2.0 requests', async () => {
    const client = createJsonRpcClient({ serverUrl: 'http://test' });
    // Test implementation
  });
});

// Test AI service abstractions
describe('AIServiceManager', () => {
  it('should select appropriate service based on requirements', async () => {
    const manager = new AIServiceManager(registry, strategy);
    // Test implementation
  });
});
```

### Integration Tests
```typescript
// Test end-to-end grading workflow
describe('Grading Integration', () => {
  it('should complete full grading workflow with new implementation', async () => {
    // Test full workflow from document upload to grading results
  });
});
```

### Load Testing
```bash
# Test with multiple concurrent requests
npm run test:load

# Monitor circuit breaker behavior
npm run test:circuit-breaker

# Test fallback mechanisms
npm run test:fallback
```

## Rollback Plan

If issues arise during migration:

### Immediate Rollback:
```bash
# Disable new features
MCP_ENHANCED_ERRORS=false
MCP_CIRCUIT_BREAKER=false

# Or disable MCP entirely
USE_MCP=false
```

### Partial Rollback:
1. Keep error handling improvements
2. Disable only problematic features
3. Maintain logging enhancements

### Complete Rollback:
1. Revert to previous git commit
2. Update environment variables
3. Restart services

## Performance Considerations

### Improvements:
- Better error recovery reduces failed requests
- Circuit breaker prevents cascade failures
- Retry logic with exponential backoff
- Connection pooling in JSON-RPC client

### Monitoring:
- Track response times
- Monitor error rates by category
- Circuit breaker state changes
- Fallback usage frequency

## Security Considerations

### Enhanced Security Features:
- Proper JSON-RPC request validation
- Enhanced authentication token handling
- Request/response logging for audit trails
- Error message sanitization

### Best Practices:
- Use HTTPS for all MCP communication
- Rotate authentication tokens regularly
- Monitor for suspicious error patterns
- Implement rate limiting

## Troubleshooting Common Issues

### JSON-RPC Format Errors:
```
Error: Invalid JSON-RPC response: missing jsonrpc field
Solution: Ensure MCP server returns valid JSON-RPC 2.0 responses
```

### Circuit Breaker Opening:
```
Error: Circuit breaker is OPEN
Solution: Check MCP server health, wait for timeout, or disable circuit breaker
```

### Authentication Failures:
```
Error: JSON-RPC Error 401: Unauthorized
Solution: Verify MCP_AUTH_TOKEN is correct and not expired
```

### Performance Issues:
```
Issue: Slower response times
Solution: Adjust timeout values, check network latency, monitor server resources
```

This migration guide provides a comprehensive roadmap for transitioning to the new JSON-RPC based MCP implementation while maintaining system reliability and performance.
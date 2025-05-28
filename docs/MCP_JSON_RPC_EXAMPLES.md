# MCP JSON-RPC Protocol Examples

This document provides examples of how the refactored MCP implementation uses JSON-RPC 2.0 protocol for communication with MCP servers.

## JSON-RPC 2.0 Protocol Structure

### Request Format
```json
{
  "jsonrpc": "2.0",
  "method": "method_name",
  "params": {
    // method parameters
  },
  "id": "unique_request_id"
}
```

### Response Format (Success)
```json
{
  "jsonrpc": "2.0",
  "result": {
    // result data
  },
  "id": "unique_request_id"
}
```

### Response Format (Error)
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": {
      // additional error information
    }
  },
  "id": "unique_request_id"
}
```

## Document Analysis Examples

### Request: Analyze Document
```json
{
  "jsonrpc": "2.0",
  "method": "analyze_document",
  "params": {
    "document": {
      "fileName": "assignment.pdf",
      "contentType": "application/pdf",
      "content": "base64_encoded_file_content",
      "metadata": {
        "size": 1024000,
        "lastModified": "2024-01-15T10:30:00Z"
      }
    },
    "options": {
      "extractImages": true,
      "performOCR": true,
      "targetLanguage": "auto"
    }
  },
  "id": "doc_analysis_123"
}
```

### Response: Document Analysis Success
```json
{
  "jsonrpc": "2.0",
  "result": {
    "text": "Extracted document content...",
    "content": "Full document text content...",
    "metadata": {
      "language": "zh-TW",
      "wordCount": 1250,
      "pageCount": 3,
      "extractedImages": ["image1_base64", "image2_base64"],
      "confidence": 0.95,
      "processingTime": 2500
    }
  },
  "id": "doc_analysis_123"
}
```

### Response: Document Analysis Error
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "Document processing failed",
    "data": {
      "reason": "Unsupported file format",
      "supportedFormats": ["pdf", "docx", "txt", "jpg", "png"],
      "fileName": "assignment.pdf"
    }
  },
  "id": "doc_analysis_123"
}
```

## Grading Examples

### Request: Grade Document
```json
{
  "jsonrpc": "2.0",
  "method": "grade_document",
  "params": {
    "document": {
      "content": "Student's assignment content...",
      "fileName": "assignment.pdf",
      "contentType": "application/pdf",
      "metadata": {
        "wordCount": 1250,
        "language": "zh-TW"
      }
    },
    "rubric": {
      "id": "rubric_uuid_123",
      "name": "Essay Grading Rubric",
      "description": "Comprehensive essay evaluation criteria",
      "criteria": [
        {
          "id": "criteria_1",
          "name": "Content Quality",
          "description": "Evaluation of content depth and accuracy",
          "levels": [
            {
              "score": 5,
              "description": "Excellent content with deep analysis"
            },
            {
              "score": 4,
              "description": "Good content with adequate analysis"
            },
            {
              "score": 3,
              "description": "Satisfactory content"
            },
            {
              "score": 2,
              "description": "Below average content"
            },
            {
              "score": 1,
              "description": "Poor content quality"
            }
          ],
          "weight": 1.0
        },
        {
          "id": "criteria_2",
          "name": "Writing Style",
          "description": "Grammar, structure, and clarity",
          "levels": [
            {
              "score": 5,
              "description": "Excellent writing style"
            },
            {
              "score": 4,
              "description": "Good writing style"
            },
            {
              "score": 3,
              "description": "Adequate writing style"
            },
            {
              "score": 2,
              "description": "Below average writing"
            },
            {
              "score": 1,
              "description": "Poor writing style"
            }
          ],
          "weight": 1.0
        }
      ]
    },
    "options": {
      "gradingId": "grading_session_456",
      "language": "zh-TW",
      "detailLevel": "comprehensive",
      "includeExamples": true
    }
  },
  "id": "grade_request_789"
}
```

### Response: Grading Success
```json
{
  "jsonrpc": "2.0",
  "result": {
    "overallScore": 87,
    "overallAnalysis": "This assignment demonstrates a solid understanding of the topic with well-structured arguments. The content shows good research and analysis, though some points could be developed further. The writing is clear and generally well-organized.",
    "criteriaScores": [
      {
        "criteriaId": "criteria_1",
        "criteriaName": "Content Quality",
        "score": 4,
        "maxScore": 5,
        "comments": "Good content with solid analysis. The arguments are well-supported with evidence, though some areas could benefit from deeper exploration.",
        "suggestions": [
          "Consider adding more specific examples to support your main points",
          "Explore counterarguments to strengthen your analysis"
        ]
      },
      {
        "criteriaId": "criteria_2",
        "criteriaName": "Writing Style",
        "score": 4,
        "maxScore": 5,
        "comments": "Well-written with clear structure and good flow. Minor grammatical issues but overall excellent communication.",
        "suggestions": [
          "Review comma usage in complex sentences",
          "Consider varying sentence structure for better flow"
        ]
      }
    ],
    "strengths": [
      "Clear thesis statement and logical argument structure",
      "Good use of evidence to support claims",
      "Effective conclusion that ties together main points",
      "Appropriate academic tone throughout"
    ],
    "areasForImprovement": [
      "Some arguments could be developed with more detail",
      "Minor grammatical and punctuation errors",
      "Consider addressing potential counterarguments"
    ],
    "overallSuggestions": "This is a well-written assignment that demonstrates good understanding. Focus on developing arguments more thoroughly and proofreading for minor errors to reach the next level.",
    "imageUnderstanding": "The document contains clear text without images requiring analysis.",
    "processingTime": 15000
  },
  "id": "grade_request_789"
}
```

### Response: Grading Error
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid parameters",
    "data": {
      "reason": "Missing required rubric criteria",
      "details": "The rubric must contain at least one criteria with valid scoring levels",
      "receivedCriteria": 0,
      "requiredMinimum": 1
    }
  },
  "id": "grade_request_789"
}
```

## Health Check Examples

### Request: Health Check
```json
{
  "jsonrpc": "2.0",
  "method": "health",
  "params": {},
  "id": "health_check_001"
}
```

### Response: Health Check Success
```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "capabilities": [
      "analyze_document",
      "grade_document"
    ],
    "metrics": {
      "uptime": 86400,
      "processedDocuments": 1250,
      "averageProcessingTime": 3500
    }
  },
  "id": "health_check_001"
}
```

## Error Codes

### Standard JSON-RPC Error Codes
- `-32700`: Parse error (Invalid JSON)
- `-32600`: Invalid Request (Invalid JSON-RPC format)
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error

### Custom MCP Error Codes
- `-32000`: Document processing error
- `-32001`: Grading service error
- `-32002`: Authentication error
- `-32003`: Rate limit exceeded
- `-32004`: Service unavailable
- `-32005`: Unsupported format
- `-32006`: Content too large
- `-32007`: Invalid rubric

## Notification Examples (No Response Expected)

### Notification: Progress Update
```json
{
  "jsonrpc": "2.0",
  "method": "progress_update",
  "params": {
    "gradingId": "grading_session_456",
    "phase": "analysis",
    "progress": 45,
    "message": "Analyzing document structure..."
  }
}
```

### Notification: Status Update
```json
{
  "jsonrpc": "2.0",
  "method": "status_update",
  "params": {
    "service": "document_analyzer",
    "status": "maintenance",
    "message": "Service will be unavailable for 5 minutes",
    "estimatedDowntime": 300000
  }
}
```

## Implementation Notes

1. **Content Encoding**: Large file content should be base64 encoded for JSON transport
2. **Request IDs**: Use unique, descriptive IDs for tracking requests
3. **Error Handling**: Always check for error field in responses
4. **Timeouts**: Implement appropriate timeouts for long-running operations
5. **Retries**: Use exponential backoff for retryable errors
6. **Validation**: Validate all parameters before sending requests
7. **Logging**: Log all requests and responses for debugging
8. **Security**: Use proper authentication headers
9. **Versioning**: Include API version in headers or params
10. **Rate Limiting**: Respect server rate limits and implement client-side throttling
/**
 * PDF Parser types and interfaces
 */

// PDF Parser API response for task submission
export interface PdfParserSubmitResponse {
  task_id: string;
  status?: string;
}

// PDF Parser result from task status endpoint
export interface ParseResult {
  status: 'pending' | 'processing' | 'success' | 'failed';
  content?: string;
  error?: string;
}

// Fetch options type
export interface FetchOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

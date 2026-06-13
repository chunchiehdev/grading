/**
 * Storage service types and interfaces
 */

/**
 * AWS S3/MinIO error object interface
 * Matches the shape of AWS SDK errors with optional properties
 */
export interface S3Error {
  message: string;
  Code?: string;
  name?: string;
  statusCode?: number;
  $metadata?: {
    httpStatusCode?: number;
    attempts?: number;
    totalRetryDelay?: number;
  };
}

/**
 * Reader interface for ReadableStream (Web API)
 */
interface StreamReader {
  read(): Promise<{ value?: Uint8Array; done: boolean }>;
  releaseLock(): void;
}

/**
 * Response Body type that might have getReader method
 */
export interface ReadableStreamBody {
  getReader(): StreamReader;
}

// 可以在 app/types/errors.ts 中定義
export class ValidationError extends Error {
    constructor(public errors: string[]) {
      super('Validation failed');
      this.name = 'ValidationError';
    }
  }
  
  export class GradingServiceError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'GradingServiceError';
    }
  }
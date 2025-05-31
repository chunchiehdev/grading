// @deprecated - This test file is for the old Upload model which has been replaced 
// by the new GradingSession + UploadedFile + GradingResult structure.
// These tests should be updated or removed after full migration.

/*
All tests in this file have been temporarily disabled during the migration
to the new database schema. The Upload model has been replaced with:
- UploadedFile (for file metadata)
- GradingSession (for grouping related grading operations)  
- GradingResult (for individual file-rubric grading results)

See test/models/grading-flow.test.ts for tests covering the new structure.
*/

import { describe } from 'vitest';

describe.skip('Upload Model - DEPRECATED', () => {
  // All tests have been removed during migration
  // See grading-flow.test.ts for new structure tests
}); 
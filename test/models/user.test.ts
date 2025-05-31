// @deprecated - This test file references the old Upload model relationships
// The User model structure has changed with new relationships
// These tests should be updated to test the new schema relationships

/*
This file contains tests for User model relationships with the old Upload model.
The User model now has relationships with:
- Rubric (enhanced with version control)  
- UploadedFile (replaces Upload)
- GradingSession (new)

These tests should be updated to use the new schema and relationships.
See test/models/grading-flow.test.ts for tests covering the new structure.
*/

import { describe } from 'vitest';

describe.skip('User Model - NEEDS UPDATE', () => {
  // All tests have been skipped pending update to new schema relationships
  // See grading-flow.test.ts for current user-related tests
}); 
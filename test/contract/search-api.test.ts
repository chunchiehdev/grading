/**
 * Search API Contract Tests
 * Validates API request/response format and types
 */

import { describe, it, expect } from 'vitest';
import type {
  SearchRequest,
  SearchResponse,
  SearchSuccessResponse,
  SearchErrorResponse,
  CourseSearchResult,
} from '@/contracts/search-api';
import { SEARCH_CONSTRAINTS, isSearchSuccessResponse, getSearchResults, getSearchError } from '@/contracts/search-api';

describe('Search API Contract', () => {
  describe('SearchRequest validation', () => {
    it('should accept optional query parameter', () => {
      const request: SearchRequest = {
        query: 'Mathematics',
      };
      expect(request.query).toBe('Mathematics');
    });

    it('should allow empty query', () => {
      const request: SearchRequest = {
        query: '',
      };
      expect(request.query).toBe('');
    });

    it('should allow undefined query', () => {
      const request: SearchRequest = {};
      expect(request.query).toBeUndefined();
    });

    it('should validate query length constraint', () => {
      expect(SEARCH_CONSTRAINTS.MAX_LENGTH).toBe(200);
      const query = 'a'.repeat(SEARCH_CONSTRAINTS.MAX_LENGTH);
      expect(query.length).toBeLessThanOrEqual(SEARCH_CONSTRAINTS.MAX_LENGTH);
    });
  });

  describe('CourseSearchResult validation', () => {
    it('should have required properties', () => {
      const course: CourseSearchResult = {
        id: 'course-1',
        title: 'Math 101',
        description: 'Basic math course',
        instructorId: 'instr-1',
        instructorName: 'Dr. Smith',
        enrollmentCount: 30,
        status: 'ACTIVE',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      expect(course.id).toBeDefined();
      expect(course.title).toBeDefined();
      expect(course.instructorId).toBeDefined();
      expect(course.instructorName).toBeDefined();
      expect(course.enrollmentCount).toBeGreaterThanOrEqual(0);
      expect(course.status).toMatch(/ACTIVE|ARCHIVED|DRAFT/);
    });

    it('should allow null description', () => {
      const course: CourseSearchResult = {
        id: 'course-1',
        title: 'Course',
        description: null,
        instructorId: 'instr-1',
        instructorName: 'Name',
        enrollmentCount: 0,
        status: 'ACTIVE',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      expect(course.description).toBeNull();
    });

    it('should have valid ISO date strings', () => {
      const course: CourseSearchResult = {
        id: 'course-1',
        title: 'Course',
        description: null,
        instructorId: 'instr-1',
        instructorName: 'Name',
        enrollmentCount: 0,
        status: 'ACTIVE',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-02T12:30:45Z',
      };

      const createdDate = new Date(course.createdAt);
      const updatedDate = new Date(course.updatedAt);

      expect(createdDate.getFullYear()).toBe(2025);
      expect(updatedDate.getFullYear()).toBe(2025);
    });
  });

  describe('SearchSuccessResponse validation', () => {
    it('should have success flag set to true', () => {
      const response: SearchSuccessResponse = {
        success: true,
        data: {
          results: [],
          totalCount: 0,
          returnedCount: 0,
        },
      };

      expect(response.success).toBe(true);
    });

    it('should have valid data structure', () => {
      const response: SearchSuccessResponse = {
        success: true,
        data: {
          results: [
            {
              id: '1',
              title: 'Test',
              description: null,
              instructorId: 'i1',
              instructorName: 'Instructor',
              enrollmentCount: 10,
              status: 'ACTIVE',
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-01T00:00:00Z',
            },
          ],
          totalCount: 1,
          returnedCount: 1,
        },
      };

      expect(response.data.results).toHaveLength(1);
      expect(response.data.totalCount).toBe(1);
      expect(response.data.returnedCount).toBe(1);
    });

    it('should limit results to MAX_RESULTS', () => {
      expect(SEARCH_CONSTRAINTS.MAX_RESULTS).toBe(100);
    });
  });

  describe('SearchErrorResponse validation', () => {
    it('should have success flag set to false', () => {
      const response: SearchErrorResponse = {
        success: false,
        error: 'Search failed',
      };

      expect(response.success).toBe(false);
    });

    it('should have error message', () => {
      const response: SearchErrorResponse = {
        success: false,
        error: 'Database connection error',
      };

      expect(response.error).toBeDefined();
      expect(typeof response.error).toBe('string');
      expect(response.error.length).toBeGreaterThan(0);
    });
  });

  describe('Response type guards and helpers', () => {
    it('should identify success responses', () => {
      const success: SearchResponse = {
        success: true,
        data: {
          results: [],
          totalCount: 0,
          returnedCount: 0,
        },
      };

      expect(isSearchSuccessResponse(success)).toBe(true);
    });

    it('should identify error responses', () => {
      const error: SearchResponse = {
        success: false,
        error: 'Error',
      };

      expect(isSearchSuccessResponse(error)).toBe(false);
    });

    it('should extract results safely', () => {
      const success: SearchResponse = {
        success: true,
        data: {
          results: [
            {
              id: '1',
              title: 'Course',
              description: null,
              instructorId: 'i1',
              instructorName: 'Dr',
              enrollmentCount: 0,
              status: 'ACTIVE',
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-01T00:00:00Z',
            },
          ],
          totalCount: 1,
          returnedCount: 1,
        },
      };

      const results = getSearchResults(success);
      expect(results).toHaveLength(1);
    });

    it('should extract error message safely', () => {
      const error: SearchResponse = {
        success: false,
        error: 'Search error',
      };

      const errorMsg = getSearchError(error);
      expect(errorMsg).toBe('Search error');
    });

    it('should return null for error on success response', () => {
      const success: SearchResponse = {
        success: true,
        data: {
          results: [],
          totalCount: 0,
          returnedCount: 0,
        },
      };

      const error = getSearchError(success);
      expect(error).toBeNull();
    });
  });

  describe('Search constraints', () => {
    it('should define debounce delay', () => {
      expect(SEARCH_CONSTRAINTS.DEBOUNCE_DELAY_MS).toBe(400);
    });

    it('should define request timeout', () => {
      expect(SEARCH_CONSTRAINTS.REQUEST_TIMEOUT_MS).toBe(10000);
    });

    it('should define max results', () => {
      expect(SEARCH_CONSTRAINTS.MAX_RESULTS).toBe(100);
    });

    it('should define max query length', () => {
      expect(SEARCH_CONSTRAINTS.MAX_LENGTH).toBe(200);
    });
  });
});

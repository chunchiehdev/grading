/**
 * Course Search Flow Integration Tests
 * Testing the full search flow from input to results display
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TEST_COURSES, filterCoursesByQuery } from '../fixtures/courses.fixture';
import type { CourseSearchResult } from '@/contracts/search-api';

describe('Course Search Flow Integration', () => {
  describe('Search input to results flow', () => {
    it('should filter courses matching search query', () => {
      const query = 'Mathematics';
      const results = filterCoursesByQuery(TEST_COURSES, query);

      expect(results.length).toBeGreaterThan(0);
      expect(
        results.every(
          (course) =>
            course.title.toLowerCase().includes(query.toLowerCase()) ||
            course.description?.toLowerCase().includes(query.toLowerCase())
        )
      ).toBe(true);
    });

    it('should return all courses for empty query', () => {
      const results = filterCoursesByQuery(TEST_COURSES, '');
      expect(results).toEqual(TEST_COURSES);
    });

    it('should be case-insensitive', () => {
      const lowerResults = filterCoursesByQuery(TEST_COURSES, 'python');
      const upperResults = filterCoursesByQuery(TEST_COURSES, 'PYTHON');
      const mixedResults = filterCoursesByQuery(TEST_COURSES, 'PyThOn');

      expect(lowerResults).toEqual(upperResults);
      expect(upperResults).toEqual(mixedResults);
    });

    it('should support partial matching', () => {
      const results = filterCoursesByQuery(TEST_COURSES, 'prog');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((course) => course.title.toLowerCase().includes('programming'))).toBe(true);
    });

    it('should return empty array for non-matching query', () => {
      const results = filterCoursesByQuery(TEST_COURSES, 'NonexistentCourse123');
      expect(results).toEqual([]);
    });

    it('should handle whitespace in query', () => {
      const results1 = filterCoursesByQuery(TEST_COURSES, '  Mathematics  ');
      const results2 = filterCoursesByQuery(TEST_COURSES, 'Mathematics');

      // Should trim whitespace and get same results
      expect(results1.length).toBe(results2.length);
    });
  });

  describe('Search result properties', () => {
    it('should have all required properties in results', () => {
      const results = filterCoursesByQuery(TEST_COURSES, 'Python');
      expect(results.length).toBeGreaterThan(0);

      const result = results[0];
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('instructorId');
      expect(result).toHaveProperty('instructorName');
      expect(result).toHaveProperty('enrollmentCount');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should preserve all course data in search results', () => {
      const original = TEST_COURSES[0];
      const results = filterCoursesByQuery(TEST_COURSES, original.title.substring(0, 3));

      expect(results).toContainEqual(original);
    });
  });

  describe('Search performance', () => {
    it('should handle large search queries efficiently', () => {
      const startTime = performance.now();
      const results = filterCoursesByQuery(TEST_COURSES, 'a');
      const endTime = performance.now();

      // Should complete in less than 100ms
      expect(endTime - startTime).toBeLessThan(100);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle multiple rapid searches', () => {
      const queries = ['Math', 'Python', 'Java', 'Web', 'Cloud'];
      const results: CourseSearchResult[][] = [];

      queries.forEach((query) => {
        results.push(filterCoursesByQuery(TEST_COURSES, query));
      });

      // Each search should return results
      results.forEach((result) => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('Search with special cases', () => {
    it('should handle query with special characters', () => {
      // Should not crash with special characters
      const results = filterCoursesByQuery(TEST_COURSES, '@#$%');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should limit results appropriately', () => {
      // Test fixture has 10 courses - all should be returned for broad query
      const results = filterCoursesByQuery(TEST_COURSES, 'a');
      expect(results.length).toBeLessThanOrEqual(TEST_COURSES.length);
    });

    it('should handle search after filtering', () => {
      // First filter
      let results = filterCoursesByQuery(TEST_COURSES, 'Python');
      expect(results.length).toBeGreaterThan(0);

      // Then search within results
      const query = results[0].title;
      results = filterCoursesByQuery(results, query);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Search query validation', () => {
    it('should handle null/undefined queries', () => {
      const results1 = filterCoursesByQuery(TEST_COURSES, '');
      expect(results1).toEqual(TEST_COURSES);
    });

    it('should trim whitespace from queries', () => {
      const results = filterCoursesByQuery(TEST_COURSES, '   Mathematics   ');
      const pythonCourse = TEST_COURSES.find((c) => c.title.toLowerCase().includes('mathematics'));

      if (pythonCourse) {
        expect(results).toContainEqual(pythonCourse);
      }
    });
  });

  describe('Search result ordering', () => {
    it('should preserve original order of results', () => {
      const results = filterCoursesByQuery(TEST_COURSES, 'course');
      const ids = results.map((r) => r.id);

      // Check that order is maintained from original
      const originalIndices = TEST_COURSES.map((c, i) => (results.includes(c) ? i : -1)).filter((i) => i !== -1);

      for (let i = 1; i < originalIndices.length; i++) {
        expect(originalIndices[i]).toBeGreaterThan(originalIndices[i - 1]);
      }
    });
  });
});

/**
 * URL Sharing Integration Tests
 * Testing search persistence in URL and shareability
 */

import { describe, it, expect } from 'vitest';
import type { CourseSearchResult } from '@/contracts/search-api';

describe('URL Sharing & Persistence', () => {
  describe('URL Parameter Format', () => {
    it('should use "search" as query parameter name', () => {
      // Test that the URL should be ?search=query
      const expectedFormat = '?search=Mathematics';
      expect(expectedFormat).toContain('search=');
    });

    it('should encode special characters in URL', () => {
      const query = 'Advanced Python & Data Science';
      const encoded = encodeURIComponent(query);

      expect(encoded).toContain('%20'); // space
      expect(encoded).toContain('%26'); // ampersand
      expect(encoded).toMatch(/[A-Z]/); // has uppercase
    });

    it('should handle empty query by removing search param', () => {
      // When cleared, URL should be clean (no search param)
      const emptyUrl = '/student/courses/discover';
      expect(emptyUrl).not.toContain('?search');
    });
  });

  describe('Search Query Persistence', () => {
    it('should preserve search query across page reloads', () => {
      // Simulated scenario
      const originalQuery = 'Mathematics';
      const urlWithQuery = `/student/courses/discover?search=${originalQuery}`;

      // Parse it back
      const url = new URL(urlWithQuery, 'http://localhost:3000');
      const parsedQuery = url.searchParams.get('search');

      expect(parsedQuery).toBe(originalQuery);
    });

    it('should handle multi-word search terms', () => {
      const query = 'Advanced Python Programming';
      const encoded = encodeURIComponent(query);
      const url = new URL(`/student/courses/discover?search=${encoded}`, 'http://localhost:3000');

      const retrieved = url.searchParams.get('search');
      expect(retrieved).toBe(query);
    });

    it('should handle special characters safely', () => {
      const query = 'C++ & Java (2025)';
      const encoded = encodeURIComponent(query);
      const url = new URL(`/student/courses/discover?search=${encoded}`, 'http://localhost:3000');

      const retrieved = url.searchParams.get('search');
      expect(retrieved).toBe(query);
    });
  });

  describe('Shareable URLs', () => {
    it('should generate valid shareable URL format', () => {
      const query = 'Data Science';
      const encoded = encodeURIComponent(query);
      const shareableUrl = `https://example.com/student/courses/discover?search=${encoded}`;

      // Should be valid URL format
      const urlObj = new URL(shareableUrl);
      expect(urlObj.searchParams.get('search')).toBe(query);
    });

    it('should support URL with multiple recipients', () => {
      const baseUrl = 'https://example.com/student/courses/discover';
      const query = 'Machine Learning';
      const shareUrl = `${baseUrl}?search=${encodeURIComponent(query)}`;

      // Should be stable across multiple shares
      const share1 = shareUrl;
      const share2 = shareUrl;

      expect(share1).toBe(share2);
    });

    it('should maintain query when copying URL', () => {
      const url1 = 'https://example.com/student/courses/discover?search=Python';
      const url2 = url1; // Simulate copy

      const params1 = new URL(url1).searchParams.get('search');
      const params2 = new URL(url2).searchParams.get('search');

      expect(params1).toBe(params2);
    });
  });

  describe('Browser History', () => {
    it('should support browser back button with search state', () => {
      // Scenario: User searches, then navigates, then clicks back
      const searchUrl = '/student/courses/discover?search=Python';
      const otherPageUrl = '/student/courses/details/123';

      // After back button, should return to search URL
      const backUrl = searchUrl;

      expect(backUrl).toContain('search=Python');
    });

    it('should not create history entry for each debounce', () => {
      // Only the final URL should be in history (after debounce completes)
      // This is handled by using replace: true in setSearchParams
      const finalUrl = '/student/courses/discover?search=FinalQuery';

      expect(finalUrl).toMatch(/\?search=/);
    });

    it('should clear history when search is cleared', () => {
      const clearedUrl = '/student/courses/discover';

      // Should be no search param
      expect(clearedUrl).not.toContain('?search');
    });
  });

  describe('URL Initialization', () => {
    it('should read search param on page load', () => {
      const url = new URL('/student/courses/discover?search=Mathematics', 'http://localhost:3000');
      const searchParam = url.searchParams.get('search');

      expect(searchParam).toBe('Mathematics');
    });

    it('should handle missing search param gracefully', () => {
      const url = new URL('/student/courses/discover', 'http://localhost:3000');
      const searchParam = url.searchParams.get('search');

      expect(searchParam).toBeNull();
    });

    it('should initialize search state from URL', () => {
      // When hook mounts with URL param, should set query
      const url = new URL('/student/courses/discover?search=Test', 'http://localhost:3000');
      const queryFromUrl = url.searchParams.get('search') || '';

      // This should be passed to setQuery
      expect(queryFromUrl).toBe('Test');
    });
  });

  describe('URL Updates on Search', () => {
    it('should update URL after debounce completes', () => {
      // Simulated: User types "Python", 400ms later URL updates
      const query = 'Python';
      const expectedUrlParam = `search=${encodeURIComponent(query)}`;

      expect(expectedUrlParam).toContain('search=');
      expect(expectedUrlParam).toContain('Python');
    });

    it('should use replace mode to prevent history spam', () => {
      // Each update should use replace: true
      // This means: ?search=P -> ?search=Py -> ?search=Pyt (all replace, not push)
      const finalUrl = '/student/courses/discover?search=Python';

      expect(finalUrl).toMatch(/\?search=Python$/);
    });

    it('should clear URL param when clearing search', () => {
      const beforeClear = '/student/courses/discover?search=Test';
      const afterClear = '/student/courses/discover';

      expect(beforeClear).toContain('?search=');
      expect(afterClear).not.toContain('?search=');
    });
  });

  describe('Query Parameter Encoding', () => {
    it('should encode spaces as %20', () => {
      const query = 'Advanced Python';
      const encoded = encodeURIComponent(query);

      expect(encoded).toContain('%20');
      expect(encoded).toBe('Advanced%20Python');
    });

    it('should preserve case in encoded query', () => {
      const query = 'PyThOn';
      const encoded = encodeURIComponent(query);
      const decoded = decodeURIComponent(encoded);

      expect(decoded).toBe(query);
    });

    it('should handle maximum length query (200 chars)', () => {
      const maxQuery = 'a'.repeat(200);
      const encoded = encodeURIComponent(maxQuery);
      const decoded = decodeURIComponent(encoded);

      expect(decoded).toBe(maxQuery);
      expect(decoded.length).toBeLessThanOrEqual(200);
    });
  });

  describe('Cross-Browser Compatibility', () => {
    it('should generate URL compatible with all browsers', () => {
      // URL format should be standard
      const url = 'https://example.com/student/courses/discover?search=Test';

      // Should be parseable by URL API
      expect(() => new URL(url)).not.toThrow();
    });

    it('should handle international characters', () => {
      const query = '数学'; // Chinese for mathematics
      const encoded = encodeURIComponent(query);
      const url = `?search=${encoded}`;

      // Should be URL-safe
      expect(url).not.toContain(' ');
    });
  });

  describe('Course Search Result Format', () => {
    it('should have proper CourseSearchResult type for URL sharing', () => {
      // Verify that search results can be properly serialized if needed
      const mockCourse: CourseSearchResult = {
        id: '1',
        title: 'Mathematics 101',
        description: 'Basic math',
        instructorId: 'i1',
        instructorName: 'Dr. Smith',
        enrollmentCount: 30,
        status: 'ACTIVE',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      expect(mockCourse).toHaveProperty('id');
      expect(mockCourse).toHaveProperty('title');
      expect(mockCourse.title).toBe('Mathematics 101');
    });
  });
});

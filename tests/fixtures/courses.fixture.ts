/**
 * Course Test Fixtures
 * Mock data for testing course search functionality
 */

import type { CourseSearchResult } from '@/contracts/search-api';

/**
 * Factory function to create mock course search results
 */
export function createMockCourse(overrides?: Partial<CourseSearchResult>): CourseSearchResult {
  return {
    id: 'course-' + Math.random().toString(36).substr(2, 9),
    title: 'Sample Course',
    description: 'A sample course for testing',
    instructorId: 'instructor-1',
    instructorName: 'John Doe',
    enrollmentCount: 42,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Collection of test courses for search scenarios
 */
export const TEST_COURSES: CourseSearchResult[] = [
  createMockCourse({
    id: 'course-1',
    title: 'Advanced Mathematics',
    description: 'Comprehensive course covering calculus, linear algebra, and differential equations.',
    instructorId: 'instructor-1',
    instructorName: 'Dr. Smith',
    enrollmentCount: 156,
    createdAt: '2025-01-15T10:30:00Z',
  }),
  createMockCourse({
    id: 'course-2',
    title: 'Python Programming',
    description: 'Learn Python from basics to advanced. Includes data structures, OOP, and web frameworks.',
    instructorId: 'instructor-2',
    instructorName: 'Jane Wilson',
    enrollmentCount: 234,
    createdAt: '2025-02-10T14:20:00Z',
  }),
  createMockCourse({
    id: 'course-3',
    title: 'Web Development with React',
    description: 'Master React, hooks, state management, and build modern web applications.',
    instructorId: 'instructor-3',
    instructorName: 'Bob Johnson',
    enrollmentCount: 189,
    createdAt: '2025-01-20T09:15:00Z',
  }),
  createMockCourse({
    id: 'course-4',
    title: 'Machine Learning Fundamentals',
    description: 'Introduction to machine learning, neural networks, and data science applications.',
    instructorId: 'instructor-4',
    instructorName: 'Dr. Chen',
    enrollmentCount: 112,
    createdAt: '2025-02-05T16:45:00Z',
  }),
  createMockCourse({
    id: 'course-5',
    title: 'Database Design and SQL',
    description: 'Design efficient databases and master SQL queries for data analysis and reporting.',
    instructorId: 'instructor-5',
    instructorName: 'Alice Brown',
    enrollmentCount: 98,
    createdAt: '2025-01-25T11:30:00Z',
  }),
  createMockCourse({
    id: 'course-6',
    title: 'Cloud Computing with AWS',
    description: 'Deploy and manage applications on Amazon Web Services. EC2, S3, Lambda, and more.',
    instructorId: 'instructor-1',
    instructorName: 'Dr. Smith',
    enrollmentCount: 145,
    createdAt: '2025-02-12T13:00:00Z',
  }),
  createMockCourse({
    id: 'course-7',
    title: 'Advanced Java Programming',
    description: 'Deep dive into Java features, design patterns, concurrency, and enterprise development.',
    instructorId: 'instructor-6',
    instructorName: 'Michael Davis',
    enrollmentCount: 87,
    createdAt: '2025-02-01T10:00:00Z',
  }),
  createMockCourse({
    id: 'course-8',
    title: 'TypeScript Mastery',
    description: 'Learn TypeScript for building scalable JavaScript applications with type safety.',
    instructorId: 'instructor-3',
    instructorName: 'Bob Johnson',
    enrollmentCount: 76,
    createdAt: '2025-02-08T15:30:00Z',
  }),
  createMockCourse({
    id: 'course-9',
    title: 'Cybersecurity Essentials',
    description: 'Understand security threats, cryptography, network security, and secure coding practices.',
    instructorId: 'instructor-7',
    instructorName: 'Sarah Lee',
    enrollmentCount: 65,
    createdAt: '2025-01-30T12:15:00Z',
  }),
  createMockCourse({
    id: 'course-10',
    title: 'DevOps and Containerization',
    description: 'Master Docker, Kubernetes, CI/CD pipelines, and modern DevOps practices.',
    instructorId: 'instructor-2',
    instructorName: 'Jane Wilson',
    enrollmentCount: 102,
    createdAt: '2025-02-06T14:45:00Z',
  }),
];

/**
 * Search test scenarios with expected results
 */
export const SEARCH_SCENARIOS = {
  mathematics: {
    query: 'Mathematics',
    expectedIds: ['course-1'],
    description: 'Should match "Advanced Mathematics"',
  },
  python: {
    query: 'Python',
    expectedIds: ['course-2'],
    description: 'Should match "Python Programming"',
  },
  web: {
    query: 'Web',
    expectedIds: ['course-3'],
    description: 'Should match "Web Development with React"',
  },
  programming: {
    query: 'Programming',
    expectedIds: ['course-2', 'course-7', 'course-8'],
    description: 'Should match Python, Java, and TypeScript courses',
  },
  learning: {
    query: 'Learning',
    expectedIds: ['course-4'],
    description: 'Should match "Machine Learning Fundamentals"',
  },
  advanced: {
    query: 'Advanced',
    expectedIds: ['course-1', 'course-7'],
    description: 'Should match "Advanced Mathematics" and "Advanced Java Programming"',
  },
  empty: {
    query: 'NonexistentCourse123',
    expectedIds: [],
    description: 'Should return no results for non-existent query',
  },
  casInsensitive: {
    query: 'PYTHON',
    expectedIds: ['course-2'],
    description: 'Should be case-insensitive',
  },
};

/**
 * Helper function to filter courses by query (simulates backend search)
 * Used for testing search logic locally
 */
export function filterCoursesByQuery(courses: CourseSearchResult[], query: string): CourseSearchResult[] {
  if (!query || query.trim().length === 0) {
    return courses;
  }

  const lowerQuery = query.toLowerCase().trim();
  return courses.filter(
    (course) =>
      course.title.toLowerCase().includes(lowerQuery) ||
      (course.description?.toLowerCase().includes(lowerQuery) ?? false)
  );
}

/**
 * Helper to get a specific test course by ID
 */
export function getCourseById(id: string): CourseSearchResult | undefined {
  return TEST_COURSES.find((course) => course.id === id);
}

/**
 * Helper to get multiple courses by IDs
 */
export function getCoursesById(ids: string[]): CourseSearchResult[] {
  return ids.map((id) => getCourseById(id)).filter((course): course is CourseSearchResult => course !== undefined);
}

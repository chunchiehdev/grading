# API Contract: GET /api/courses/discover

## Overview

Fetches all discoverable courses with teacher information and current student's enrollment status.

## Request

### Method
`GET`

### Endpoint
`/api/courses/discover`

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 50 | Number of results per page (max 100) |
| `offset` | number | No | 0 | Number of results to skip (for pagination) |
| `sort` | string | No | "newest" | Sort order: `newest`, `teacher`, `name` |
| `search` | string | No | - | Search courses by name or teacher name (case-insensitive) |

### Authentication

- **Required**: Yes (Student authentication via session/JWT)
- **Method**: Cookie-based session or Authorization header
- **Student ID**: Extracted from authenticated context

## Response

### Success (200 OK)

```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": "uuid",
        "name": "Introduction to Computer Science",
        "description": "Learn fundamental CS concepts",
        "code": "CS101",
        "teacher": {
          "id": "uuid",
          "name": "Dr. Jane Smith",
          "email": "jane@university.edu",
          "picture": "https://..."
        },
        "classes": [
          {
            "id": "uuid",
            "name": "Section A",
            "schedule": {
              "weekday": "Monday",
              "periodCode": "09:00-10:30",
              "room": "Building A, Room 201"
            },
            "capacity": 40,
            "enrollmentCount": 38,
            "isFull": false
          },
          {
            "id": "uuid",
            "name": "Section B",
            "schedule": {
              "weekday": "Wednesday",
              "periodCode": "14:00-15:30",
              "room": "Building B, Room 105"
            },
            "capacity": 40,
            "enrollmentCount": 40,
            "isFull": true
          }
        ],
        "enrollmentStatus": "not_enrolled",
        "createdAt": "2025-10-01T10:30:00Z"
      }
    ],
    "total": 127,
    "offset": 0,
    "limit": 50,
    "hasMore": true
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid limit value. Must be between 1 and 100."
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required. Please log in."
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to fetch courses. Please try again later."
}
```

## Response Fields

### Course Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Course identifier |
| `name` | string | Course display name |
| `description` | string | Course description (nullable) |
| `code` | string | Course code like "CS101" (nullable) |
| `teacher` | Teacher object | Course creator information |
| `classes` | Class[] | Array of class sections for this course |
| `enrollmentStatus` | enum | Student's enrollment status: `not_enrolled`, `enrolled` |
| `createdAt` | string (ISO 8601) | Course creation timestamp |

### Teacher Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | User identifier |
| `name` | string | Full name of teacher |
| `email` | string | Email address |
| `picture` | string \| null | Profile picture URL (nullable) |

### Class Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Class section identifier |
| `name` | string | Section name (e.g., "Section A", "101班") |
| `schedule` | Schedule object | When/where the class meets |
| `capacity` | number \| null | Max students (null = unlimited) |
| `enrollmentCount` | number | Current number of enrolled students |
| `isFull` | boolean | Whether enrollment capacity is reached |

### Schedule Object

| Field | Type | Description |
|-------|------|-------------|
| `weekday` | string | Day of week (e.g., "Monday", "週一") |
| `periodCode` | string | Time slot (e.g., "09:00-10:30") |
| `room` | string | Location (e.g., "Building A, Room 201") |

### Pagination

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total number of discoverable courses |
| `offset` | number | Results skipped (from request) |
| `limit` | number | Results per page (from request) |
| `hasMore` | boolean | Whether more results available beyond current page |

## Business Logic

### Filtering Rules

1. **Discoverability**: Only courses with `isActive = true` AND at least one `isActive = true` class are included
2. **Duplicates**: If a student is already enrolled in one class of a course, the entire course shows `enrollmentStatus: "enrolled"`
3. **Sorting**:
   - `newest`: Order by `createdAt DESC`
   - `teacher`: Order by `teacher.name ASC`, then `createdAt DESC`
   - `name`: Order by `course.name ASC`, then `createdAt DESC`
4. **Search**: Performs full-text search on course name and teacher name (case-insensitive)

### Enrollment Status Logic

- `not_enrolled`: Student is not enrolled in any class of this course
- `enrolled`: Student is enrolled in at least one class of this course

## Performance Requirements

- **Response Time**: < 2 seconds for standard queries
- **Pagination**: Supports 50+ results per page without timeout
- **Search**: Responds in < 1 second even with large datasets (1000+ courses)
- **Caching**: Optional backend caching for frequently accessed courses

## Data Validation

- `limit`: Must be integer between 1 and 100
- `offset`: Must be non-negative integer
- `sort`: Must be one of: `newest`, `teacher`, `name`
- `search`: No maximum length limit (unlimited string search)

## Examples

### Example 1: Get newest courses with pagination

**Request**:
```
GET /api/courses/discover?limit=10&offset=0&sort=newest
```

**Response**: Array of 10 newest courses

### Example 2: Search for courses by name

**Request**:
```
GET /api/courses/discover?search=JavaScript&limit=25
```

**Response**: Array of courses matching "JavaScript" in name or teacher name

### Example 3: Filter by teacher, sorted alphabetically

**Request**:
```
GET /api/courses/discover?sort=teacher&limit=50
```

**Response**: Courses sorted by teacher name

## Error Handling

- **Invalid parameters**: Return 400 with descriptive error message
- **Authentication failure**: Return 401 with login prompt
- **Database error**: Return 500 with generic message (log actual error server-side)
- **No courses available**: Return 200 with empty `courses` array

## Notes

- This endpoint is read-only; no state changes occur
- Results reflect real-time enrollment counts
- Pagination is required for performance; clients must implement pagination UI
- Search is optional feature; can be implemented in future iterations

# API Contract: POST /api/enrollments

## Overview

Creates a new enrollment record linking a student to a specific class, with validation for duplicates and capacity constraints.

## Request

### Method
`POST`

### Endpoint
`/api/enrollments`

### Headers

```
Content-Type: application/json
Authorization: [Cookie session or JWT header]
```

### Body

```json
{
  "classId": "uuid",
  "courseId": "uuid"
}
```

### Body Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `classId` | string (UUID) | Yes | ID of the class section to enroll in |
| `courseId` | string (UUID) | Yes | ID of the parent course (for reference/validation) |

### Authentication

- **Required**: Yes (Student authentication via session/JWT)
- **Student ID**: Extracted from authenticated context (not in request body)

## Response

### Success (201 Created)

```json
{
  "success": true,
  "data": {
    "enrollment": {
      "id": "uuid",
      "studentId": "uuid",
      "classId": "uuid",
      "courseId": "uuid",
      "enrollmentDate": "2025-10-20T14:32:18Z",
      "status": "active"
    }
  }
}
```

### Error Responses

#### 400 Bad Request - Invalid Input

```json
{
  "success": false,
  "error": "Invalid request body. Both classId and courseId are required."
}
```

#### 400 Bad Request - Invalid UUID Format

```json
{
  "success": false,
  "error": "Invalid classId format. Must be a valid UUID."
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "error": "Authentication required. Please log in."
}
```

#### 404 Not Found - Class Missing

```json
{
  "success": false,
  "error": "Class not found."
}
```

#### 404 Not Found - Course Missing

```json
{
  "success": false,
  "error": "Course not found."
}
```

#### 409 Conflict - Already Enrolled

```json
{
  "success": false,
  "error": "You are already enrolled in this class."
}
```

#### 409 Conflict - Class Full

```json
{
  "success": false,
  "error": "This class has reached maximum capacity. Please contact the instructor or try another section."
}
```

#### 409 Conflict - Course Not Active

```json
{
  "success": false,
  "error": "This course is no longer available for enrollment."
}
```

#### 409 Conflict - Class Not Active

```json
{
  "success": false,
  "error": "This class section is no longer active. Please select another section."
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Failed to process enrollment. Please try again later."
}
```

## Response Fields

### Enrollment Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Enrollment record identifier |
| `studentId` | string (UUID) | ID of enrolled student |
| `classId` | string (UUID) | ID of the class |
| `courseId` | string (UUID) | ID of the course (for reference) |
| `enrollmentDate` | string (ISO 8601) | Timestamp when enrollment was created |
| `status` | enum | Enrollment status: `active` |

## Business Logic

### Validation Rules (in order of execution)

1. **Input Validation**:
   - Both `classId` and `courseId` must be present
   - Both must be valid UUIDs
   - Request body must not contain extra fields

2. **Resource Existence**:
   - Class with given `classId` must exist
   - Course with given `courseId` must exist
   - Course must contain the specified class (foreign key relationship)

3. **Enrollment Eligibility**:
   - Student must not already be enrolled in this class (unique constraint on studentId+classId)
   - Course must have `isActive = true`
   - Class must have `isActive = true`
   - Class must not be at capacity (if capacity is set)
     - If `capacity = null`, no limit
     - If `capacity = N`, current enrollments must be `< N`

4. **Database Transaction**:
   - Create enrollment record atomically
   - If capacity check fails between validation and insert, return 409 Conflict
   - Rollback entire transaction on any constraint violation

### Duplicate Prevention

- Database-level: Unique constraint on `(studentId, classId)`
- Application-level: Client should disable form submission after first attempt
- Idempotency: Repeated requests will fail with "already enrolled" error (not created twice)

### Capacity Enforcement

- Capacity limit is per-class, not per-course
- Different sections of same course may have different capacities
- When capacity is `NULL`, class has unlimited enrollment
- Race condition handling: If two students enroll simultaneously:
  - First request: 201 Created (space available)
  - Second request: 409 Conflict (now full)

## Performance Requirements

- **Response Time**: < 500ms for successful enrollment
- **Capacity Check**: Atomic operation preventing race conditions
- **Database Indexes**: Required on `(studentId, classId)` unique index

## Request/Response Examples

### Example 1: Successful Enrollment

**Request**:
```http
POST /api/enrollments HTTP/1.1
Content-Type: application/json

{
  "classId": "550e8400-e29b-41d4-a716-446655440000",
  "courseId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "enrollment": {
      "id": "7c5a4d2b-e1f9-4c3a-8b9d-2e6f1a4c8b3d",
      "studentId": "9f8e7d6c-5b4a-3c2b-1a0f-9e8d7c6b5a4d",
      "classId": "550e8400-e29b-41d4-a716-446655440000",
      "courseId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "enrollmentDate": "2025-10-20T14:32:18Z",
      "status": "active"
    }
  }
}
```

### Example 2: Class Full Error

**Request**:
```http
POST /api/enrollments HTTP/1.1
Content-Type: application/json

{
  "classId": "550e8400-e29b-41d4-a716-446655440001",
  "courseId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}
```

**Response** (409 Conflict):
```json
{
  "success": false,
  "error": "This class has reached maximum capacity. Please contact the instructor or try another section."
}
```

### Example 3: Already Enrolled Error

**Request**:
```http
POST /api/enrollments HTTP/1.1
Content-Type: application/json

{
  "classId": "550e8400-e29b-41d4-a716-446655440000",
  "courseId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}
```

**Response** (409 Conflict):
```json
{
  "success": false,
  "error": "You are already enrolled in this class."
}
```

## Error Handling Strategy

| Error Type | HTTP Status | User Message | Action |
|------------|-------------|--------------|--------|
| Missing fields | 400 | "Please provide all required information" | Highlight form errors |
| Invalid UUID | 400 | "Invalid course/class ID" | Refresh page |
| Not authenticated | 401 | "Please log in" | Redirect to login |
| Class not found | 404 | "Course or class no longer available" | Refresh discovery page |
| Already enrolled | 409 | "You are already enrolled" | Show "Enrolled" button state |
| Class full | 409 | "Class full. Try another section" | Disable button, show alternatives |
| Course inactive | 409 | "Course no longer available" | Refresh page |
| Database error | 500 | "Something went wrong. Please try again" | Retry after delay |

## Security Considerations

1. **Authentication**: Endpoint requires valid student session
2. **Authorization**: Students can only enroll themselves (studentId from auth context)
3. **Input Validation**: All inputs validated before database operations
4. **CSRF Protection**: Should be protected by CSRF middleware
5. **Rate Limiting**: Recommended to rate-limit rapid enrollment attempts

## Notes

- This endpoint is idempotent in failure modes (repeated requests with same data fail identically)
- Successful enrollments are **not idempotent** (second request will fail with "already enrolled")
- Recommend client-side form submission debouncing to prevent double-clicks
- Student should be redirected to course detail page or shown success toast after enrollment

# Data Model: Course Enrollment System

**Version**: 1.0 | **Last Updated**: 2025-10-20 | **Status**: Design Phase

## Overview

This document describes the database entities used for course discovery and student enrollment. No new database tables are created; the system leverages existing Prisma relationships.

---

## Entity Relationships Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      User (Teacher)                      │
│  id | email | name | picture | role: "TEACHER"          │
└────────────────┬────────────────────────────────────────┘
                 │ creates (1:N)
                 ▼
┌─────────────────────────────────────────────────────────┐
│                      Course                              │
│  id | name | description | code | teacherId | isActive  │
└────────────────┬────────────────────────────────────────┘
                 │ contains (1:N)
                 ▼
┌─────────────────────────────────────────────────────────┐
│                      Class                               │
│  id | courseId | name | schedule (JSON)                 │
│  capacity | isActive                                    │
└────────────────┬────────────────────────────────────────┘
                 │ enrolls (1:N)
                 ▼
┌─────────────────────────────────────────────────────────┐
│                   Enrollment                             │
│  id | studentId | classId | enrollmentDate | status     │
└──────────────────────────────────────────────────────────┘
                 │ links (N:1)
                 ▼
┌─────────────────────────────────────────────────────────┐
│                   User (Student)                         │
│  id | email | name | picture | role: "STUDENT"          │
└─────────────────────────────────────────────────────────┘
```

---

## Entity Definitions

### 1. User (Existing)

**Purpose**: Represents both teachers and students in the system.

**Fields**:

| Field       | Type         | Constraints                 | Description                       |
| ----------- | ------------ | --------------------------- | --------------------------------- |
| `id`        | UUID         | PK, NOT NULL                | Unique identifier                 |
| `email`     | String       | UNIQUE, NOT NULL            | Email address (from Google OAuth) |
| `name`      | String (255) | NOT NULL                    | Full name                         |
| `picture`   | String (500) | NULLABLE                    | Profile picture URL               |
| `role`      | Enum         | NOT NULL, DEFAULT "STUDENT" | `TEACHER` or `STUDENT`            |
| `createdAt` | DateTime     | NOT NULL, DEFAULT now()     | Account creation timestamp        |
| `updatedAt` | DateTime     | NOT NULL, DEFAULT now()     | Last modification timestamp       |

**Relationships**:

- `courses[]`: Courses created by this teacher (if role = TEACHER)
- `enrollments[]`: Classes enrolled in by this student (if role = STUDENT)

**Indexes**:

- `email` (UNIQUE)
- `role` (for role-based filtering)

**Usage for Feature**:

- Teachers: Display name and picture on course discovery cards
- Students: Identify enrolled courses and prevent duplicate enrollments

---

### 2. Course (Existing)

**Purpose**: Represents a course offered by a teacher.

**Fields**:

| Field         | Type         | Constraints             | Description                    |
| ------------- | ------------ | ----------------------- | ------------------------------ |
| `id`          | UUID         | PK, NOT NULL            | Unique identifier              |
| `name`        | String (255) | NOT NULL                | Course title                   |
| `description` | Text         | NULLABLE                | Detailed course description    |
| `code`        | String (50)  | NULLABLE, INDEX         | Course code (e.g., "CS101")    |
| `teacherId`   | UUID         | FK→User, NOT NULL       | Creator of course              |
| `isActive`    | Boolean      | NOT NULL, DEFAULT true  | Whether course is discoverable |
| `createdAt`   | DateTime     | NOT NULL, DEFAULT now() | Creation timestamp             |
| `updatedAt`   | DateTime     | NOT NULL, DEFAULT now() | Modification timestamp         |

**Relationships**:

- `teacher`: The User who created this course
- `classes[]`: All Class sections within this course
- `assignmentAreas[]`: Assignments for this course
- `invitationCodes[]`: Invitation codes for this course

**Indexes**:

- `teacherId` (FK)
- `code` (for course code lookup)
- `isActive` (for discovery filtering)

**Constraints**:

- A course requires `isActive=true` AND at least one active class to be discoverable

**Usage for Feature**:

- Fetch all active courses for discovery page
- Display course info (name, description, teacher)
- Check if student is already enrolled in any class of the course

---

### 3. Class (Existing)

**Purpose**: Represents a specific section/time slot of a course.

**Fields**:

| Field         | Type         | Constraints                | Description                               |
| ------------- | ------------ | -------------------------- | ----------------------------------------- |
| `id`          | UUID         | PK, NOT NULL               | Unique identifier                         |
| `courseId`    | UUID         | FK→Course, NOT NULL, INDEX | Parent course                             |
| `name`        | String (100) | NOT NULL                   | Section name (e.g., "Section A", "101班") |
| `schedule`    | JSON         | NULLABLE                   | `{weekday, periodCode, room}`             |
| `capacity`    | Integer      | NULLABLE                   | Max students (NULL = unlimited)           |
| `assistantId` | UUID         | FK→User, NULLABLE          | Teaching assistant                        |
| `isActive`    | Boolean      | NOT NULL, DEFAULT true     | Whether section is active                 |
| `createdAt`   | DateTime     | NOT NULL, DEFAULT now()    | Creation timestamp                        |
| `updatedAt`   | DateTime     | NOT NULL, DEFAULT now()    | Modification timestamp                    |

**Relationships**:

- `course`: The parent Course
- `enrollments[]`: All student enrollments in this class
- `invitationCodes[]`: Invitation codes for this section

**Indexes**:

- `courseId` (FK, for filtering by course)
- `isActive` (for discovery filtering)
- `(courseId, isActive)` (composite, for finding active classes of a course)

**Constraints**:

- Capacity validation: `capacity IS NULL OR capacity > 0`
- Only classes with `isActive=true` are discoverable

**Schedule Format**:

```json
{
  "weekday": "Monday", // or "週一", "Mon", etc.
  "periodCode": "09:00-10:30", // time range
  "room": "Building A, Room 201" // location
}
```

**Usage for Feature**:

- Display schedule and room information on course cards
- Track current enrollment count for capacity management
- Check if class is at capacity before allowing enrollment
- Filter courses by active classes

---

### 4. Enrollment (Existing)

**Purpose**: Links a student to a class they're enrolled in.

**Fields**:

| Field            | Type     | Constraints                | Description                      |
| ---------------- | -------- | -------------------------- | -------------------------------- |
| `id`             | UUID     | PK, NOT NULL               | Unique identifier                |
| `studentId`      | UUID     | FK→User, NOT NULL, INDEX   | Enrolled student                 |
| `classId`        | UUID     | FK→Class, NOT NULL, INDEX  | Enrolled class                   |
| `enrollmentDate` | DateTime | NOT NULL, DEFAULT now()    | Enrollment timestamp             |
| `status`         | Enum     | NOT NULL, DEFAULT "active" | `active`, `dropped`, `completed` |
| `createdAt`      | DateTime | NOT NULL, DEFAULT now()    | Record creation                  |
| `updatedAt`      | DateTime | NOT NULL, DEFAULT now()    | Record modification              |

**Relationships**:

- `student`: The User who is enrolled
- `class`: The Class they're enrolled in

**Indexes**:

- `studentId` (for finding student's enrollments)
- `classId` (for finding class enrollments)
- `(studentId, classId)` UNIQUE (preventing duplicates)

**Constraints**:

- **Unique Constraint**: `(studentId, classId)` must be unique (no duplicate enrollments)
- **Foreign Keys**: Both `studentId` and `classId` must reference valid records
- **Status Validation**: Status must be one of enum values

**Usage for Feature**:

- Check if student is already enrolled in a class (prevent duplicates)
- Count current enrollments per class for capacity checking
- Mark student as "Enrolled" on discovery page if already enrolled
- Create new enrollment when student joins a class

---

## Database Queries Required

### Query 1: Get All Discoverable Courses

**Purpose**: Fetch courses available for student discovery

**SQL Concept**:

```sql
SELECT DISTINCT c.*
FROM courses c
JOIN classes cl ON c.id = cl."courseId"
WHERE c."isActive" = true
  AND cl."isActive" = true
ORDER BY c."createdAt" DESC
LIMIT :limit OFFSET :offset
```

**Result Fields**:

- Course: id, name, description, code, teacherId, createdAt
- Teacher: name, email, picture
- Classes for each course: id, name, schedule, capacity, active enrollment count

**Prisma Equivalent**:

```typescript
await prisma.course.findMany({
  where: {
    isActive: true,
    classes: {
      some: { isActive: true },
    },
  },
  include: {
    teacher: { select: { id: true, name: true, email: true, picture: true } },
    classes: {
      where: { isActive: true },
      include: { _count: { select: { enrollments: true } } },
    },
  },
  orderBy: { createdAt: 'desc' },
  take: limit,
  skip: offset,
});
```

**Performance Notes**:

- Index needed: `(courses.isActive, courses.createdAt)`
- Index needed: `(classes.courseId, classes.isActive)`
- Results: ~50-100 courses per page typical

### Query 2: Check Student Enrollment Status

**Purpose**: Determine if student is enrolled in a course/class

**SQL Concept**:

```sql
SELECT e.* FROM enrollments e
WHERE e."studentId" = :studentId
  AND e."classId" = :classId
  AND e.status = 'active'
LIMIT 1
```

**Prisma Equivalent**:

```typescript
const enrollment = await prisma.enrollment.findUnique({
  where: {
    studentId_classId: {
      studentId,
      classId,
    },
  },
});
```

**Usage**: Prevent duplicate enrollments, show "Enrolled" badge

---

### Query 3: Get Current Class Enrollment Count

**Purpose**: Determine if class is at capacity

**SQL Concept**:

```sql
SELECT COUNT(*) as count FROM enrollments e
WHERE e."classId" = :classId
  AND e.status = 'active'
```

**Prisma Equivalent**:

```typescript
const count = await prisma.enrollment.count({
  where: {
    classId,
    status: 'active',
  },
});
```

**Logic**:

- If `class.capacity = null`: unlimited (never full)
- If `count >= class.capacity`: class is full
- Otherwise: available spots

---

### Query 4: Get Student's Enrolled Courses

**Purpose**: Determine which courses to mark as "Enrolled" on discovery page

**SQL Concept**:

```sql
SELECT DISTINCT c.id FROM enrollments e
JOIN classes cl ON e."classId" = cl.id
JOIN courses c ON cl."courseId" = c.id
WHERE e."studentId" = :studentId
  AND e.status = 'active'
```

**Prisma Equivalent**:

```typescript
const enrolledCourseIds = await prisma.enrollment
  .findMany({
    where: {
      studentId,
      status: 'active',
    },
    select: {
      class: {
        select: { courseId: true },
      },
    },
  })
  .then((enrollments) => new Set(enrollments.map((e) => e.class.courseId)));
```

**Usage**: Mark courses as "Enrolled" on discovery page UI

---

## Data Validation Rules

### 1. Course Validity

- `name`: Required, non-empty string, max 255 chars
- `description`: Optional, max 5000 chars
- `code`: Optional, alphanumeric, max 50 chars
- `teacherId`: Required, must reference valid User with role=TEACHER
- `isActive`: Boolean, default true

### 2. Class Validity

- `name`: Required, non-empty string, max 100 chars
- `courseId`: Required, must reference valid Course
- `schedule`: Optional, if present must have weekday, periodCode
- `capacity`: Optional, if present must be positive integer OR null (unlimited)
- `isActive`: Boolean, default true

### 3. Enrollment Validity

- `studentId`: Required, must reference valid User with role=STUDENT
- `classId`: Required, must reference valid Class
- Combination `(studentId, classId)` must be unique
- `status`: Must be 'active', 'dropped', or 'completed'

### 4. Enrollment Prerequisites

- Student must not already have active enrollment in this class
- Class must have `isActive=true`
- Parent course must have `isActive=true`
- Class must not be at capacity (if capacity is set)

---

## State Transitions

### Enrollment Lifecycle

```
          ┌─── active ────┐
          │               │
       CREATE          DROP
          │               │
    (initial state)  ┌─────▼─────┐
                     │  dropped   │
                     └────────────┘

Alternative path:

    active ──COMPLETE──▶ completed
```

**Valid Transitions**:

- `create`: No state → `active` ✓
- `drop`: `active` → `dropped` ✓
- `complete`: `active` → `completed` ✓
- Any other transition: ✗

---

## Performance Optimization Recommendations

### Indexes to Verify/Add

```sql
-- Already exist (verify):
CREATE UNIQUE INDEX users_email_key ON users(email);
CREATE INDEX enrollments_student_id_key ON enrollments("studentId");
CREATE INDEX enrollments_class_id_key ON enrollments("classId");
CREATE UNIQUE INDEX enrollments_student_id_class_id_key ON enrollments("studentId", "classId");

-- Recommended (for discovery):
CREATE INDEX courses_is_active_created_at ON courses("isActive", "createdAt" DESC);
CREATE INDEX classes_course_id_is_active ON classes("courseId", "isActive");

-- Optional (for search):
CREATE INDEX courses_name_trgm ON courses USING gin(name gin_trgm_ops);  -- full-text search
```

### Query Optimization Strategy

1. **Discovery Page Load**:

   - Use pagination (50 results per page)
   - Pre-filter by `isActive` and class existence
   - Use indexes on `(isActive, createdAt)`
   - Cache results for 5-10 minutes if data is stable

2. **Enrollment Checks**:

   - Use unique index on `(studentId, classId)` for O(1) lookup
   - Check capacity via COUNT query with same index
   - Combine both checks in single transaction

3. **Avoiding N+1 Queries**:
   - Use Prisma `include` to fetch teacher and classes in single query
   - Load enrollment counts via `_count` aggregation
   - Select only needed fields to reduce payload

---

## Migration Path

**Database Migrations Needed**: ✅ **NONE**

- All required entities already exist in Prisma schema
- All required relationships already defined
- Indexes exist or are performance enhancements (non-blocking)
- No schema changes required to launch MVP

---

## Future Enhancements

- **Waiting List**: Add `WaitlistEntry` table if feature is approved
- **Enrollment History**: Archive completed/dropped enrollments separately
- **Schedule Conflicts**: Check for time conflicts before enrollment
- **Capacity Overrides**: Allow teachers to override capacity limits
- **Enrollment Filters**: Search/filter capabilities on discovery page

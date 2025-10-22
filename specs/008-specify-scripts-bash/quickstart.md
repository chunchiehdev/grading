# Quick Start Guide: Course Enrollment UI Implementation

**Objective**: Implement sleek InvitationDisplay redesign + Student course discovery page with enrollment

**Estimated Effort**: 20-30 development hours
**Team Size**: 2-3 developers
**Priority**: P1 (Launch-ready after completion)

---

## Development Phases

### Phase A: Setup & Preparation (2-4 hours)

#### A1. Verify Existing Code Structure

```bash
# Check existing invitation display component
ls -la app/components/ui/invitation-display.tsx
cat app/components/ui/copyable-field.tsx
cat app/components/ui/qr-display.tsx

# Check existing student routes
ls -la app/routes/student/
ls -la app/routes/student/courses/

# Verify service patterns
ls -la app/services/course-detail.server.ts
ls -la app/api/

# Check i18n setup
ls -la app/locales/en/course.json
ls -la app/locales/zh/course.json
```

#### A2. Review Design System

```bash
# Check Tailwind colors and spacing
cat tailwind.config.ts  # Verify primary, secondary, accent colors

# Review existing card and button styles
grep -r "className=" app/components/ui/ | grep -E "(Card|Button)" | head -10

# Dark mode setup
grep -r "dark:" app/components/ | head -5
```

#### A3. Create Feature Branch Structure

```bash
# Already on branch: 008-specify-scripts-bash
git status

# Create feature directories if not existing
mkdir -p app/components/student/
mkdir -p app/services/
mkdir -p app/api/courses/
```

---

### Phase B: InvitationDisplay Redesign (4-6 hours)

#### B1. Analyze Current Implementation

**File**: `app/components/ui/invitation-display.tsx`

Current structure:

```tsx
<div className="grid md:grid-cols-2 gap-6">
  {/* Invitation Details - LEFT COLUMN */}
  <div className="flex flex-col justify-center space-y-6 text-center">
    <CopyableField ... />  // code
    <CopyableField ... />  // url
  </div>

  {/* QR Code - RIGHT COLUMN */}
  <QRDisplay ... />
</div>
```

**Required Changes**:

- Change `grid md:grid-cols-2` → `flex flex-col`
- Move QR code to top (reorder children)
- Center content with `items-center justify-center`
- Add generous spacing between sections
- Responsive: test at 320px, 640px, 1024px

#### B2. Redesign Component

**New Structure**:

```tsx
<div className="flex flex-col items-center justify-center gap-8 py-8 px-4">
  {/* QR Code - PROMINENT */}
  <div className="flex flex-col items-center gap-4">
    <QRDisplay {...props} />
    <p className="text-sm text-muted-foreground text-center">{qrDescription || 'Scan to join this course'}</p>
  </div>

  {/* Divider or spacing */}
  <div className="w-full max-w-sm h-px bg-border" />

  {/* Code and URL - SECONDARY */}
  <div className="w-full max-w-sm space-y-4">
    <CopyableField label={codeLabel} value={code} />
    <CopyableField label={urlLabel} value={invitationUrl} />
  </div>
</div>
```

#### B3. Implementation Checklist

- [ ] Update component layout (flex column, centered)
- [ ] Reorder: QR code first, then code/URL below
- [ ] QR code size: minimum 200x200px (check QRDisplay component)
- [ ] Add descriptive text below QR code
- [ ] Test responsive: 320px, 480px, 768px, 1024px
- [ ] Verify dark mode support (check `dark:` classes)
- [ ] Test CopyableField interactions (copy to clipboard)
- [ ] Verify color consistency with existing design system

#### B4. Testing

```bash
# Component tests
npm test app/components/ui/invitation-display.tsx

# Visual regression (manual)
npm run dev  # Start dev server
# Navigate to teacher course detail page
# Generate invitation
# Test on mobile/tablet/desktop viewports
```

---

### Phase C: Course Discovery Backend (6-8 hours)

#### C1. Create Service Layer

**File**: `app/services/course-discovery.server.ts`

```typescript
import { prisma } from '@/app/generated/prisma/client';

interface CourseDiscoveryOptions {
  limit?: number;
  offset?: number;
  sort?: 'newest' | 'teacher' | 'name';
  search?: string;
}

/**
 * Fetch all discoverable courses for student
 * - Only includes courses with active classes
 * - Includes enrollment status for current student
 * - Includes teacher info and class details
 */
export async function getDiscoverableCourses(studentId: string, options: CourseDiscoveryOptions = {}) {
  const { limit = 50, offset = 0, sort = 'newest', search } = options;

  // Get courses with active classes
  const courses = await prisma.course.findMany({
    where: {
      isActive: true,
      classes: {
        some: { isActive: true },
      },
      // Optional search filter
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { teacher: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    },
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
          email: true,
          picture: true,
        },
      },
      classes: {
        where: { isActive: true },
        include: {
          _count: { select: { enrollments: { where: { status: 'active' } } } },
        },
      },
    },
    orderBy: getOrderBy(sort),
    take: Math.min(limit, 100),
    skip: offset,
  });

  // Get student's enrolled courses for status comparison
  const enrolledCourseIds = await getStudentEnrolledCourses(studentId);

  // Format response
  return courses.map((course) => ({
    ...course,
    enrollmentStatus: enrolledCourseIds.has(course.id) ? 'enrolled' : 'not_enrolled',
    classes: course.classes.map((cls) => ({
      ...cls,
      enrollmentCount: cls._count.enrollments,
      isFull: cls.capacity ? cls._count.enrollments >= cls.capacity : false,
    })),
  }));
}

/**
 * Create new enrollment for student
 */
export async function createEnrollment(studentId: string, classId: string) {
  // 1. Verify class exists and get details
  const enrollClass = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      course: true,
      _count: { select: { enrollments: { where: { status: 'active' } } } },
    },
  });

  if (!enrollClass) {
    throw new Error('Class not found');
  }

  // 2. Check if course/class is active
  if (!enrollClass.course.isActive || !enrollClass.isActive) {
    throw new Error('Course or class is no longer available');
  }

  // 3. Check capacity
  if (enrollClass.capacity && enrollClass._count.enrollments >= enrollClass.capacity) {
    throw new Error('Class has reached capacity');
  }

  // 4. Check for duplicate enrollment
  const existing = await prisma.enrollment.findUnique({
    where: {
      studentId_classId: { studentId, classId },
    },
  });

  if (existing) {
    throw new Error('Already enrolled');
  }

  // 5. Create enrollment in transaction
  return prisma.enrollment.create({
    data: {
      studentId,
      classId,
      status: 'active',
    },
  });
}

// Helper functions
function getOrderBy(sort: string) {
  switch (sort) {
    case 'teacher':
      return [{ teacher: { name: 'asc' } }, { createdAt: 'desc' as const }];
    case 'name':
      return [{ name: 'asc' }, { createdAt: 'desc' as const }];
    case 'newest':
    default:
      return { createdAt: 'desc' as const };
  }
}

async function getStudentEnrolledCourses(studentId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId, status: 'active' },
    select: { class: { select: { courseId: true } } },
  });
  return new Set(enrollments.map((e) => e.class.courseId));
}
```

#### C2. Create API Endpoints

**File**: `app/api/courses/discover.ts`

```typescript
import { Router, Request, Response } from 'express';
import { getDiscoverableCourses } from '@/app/services/course-discovery.server';
import { requireAuth } from '@/services/auth.server';
import { withErrorHandler } from '@/api/middleware/error-handler';

const router = Router();

router.get(
  '/discover',
  withErrorHandler(async (req: Request, res: Response) => {
    const student = await requireAuth(req);

    const { limit, offset, sort, search } = req.query;

    const courses = await getDiscoverableCourses(student.id, {
      limit: limit ? parseInt(String(limit)) : 50,
      offset: offset ? parseInt(String(offset)) : 0,
      sort: (sort as string) || 'newest',
      search: search ? String(search) : undefined,
    });

    res.json({
      success: true,
      data: {
        courses,
        total: courses.length, // TODO: Get total count separately
        offset: offset ? parseInt(String(offset)) : 0,
        limit: limit ? parseInt(String(limit)) : 50,
        hasMore: courses.length === (limit || 50),
      },
    });
  })
);

export default router;
```

**File**: `app/api/enrollments.ts`

```typescript
import { Router, Request, Response } from 'express';
import { createEnrollment } from '@/app/services/course-discovery.server';
import { requireAuth } from '@/services/auth.server';
import { withErrorHandler } from '@/api/middleware/error-handler';
import { z } from 'zod';

const router = Router();

const enrollmentSchema = z.object({
  classId: z.string().uuid(),
  courseId: z.string().uuid(),
});

router.post(
  '/',
  withErrorHandler(async (req: Request, res: Response) => {
    const student = await requireAuth(req);

    const { classId, courseId } = enrollmentSchema.parse(req.body);

    const enrollment = await createEnrollment(student.id, classId);

    res.status(201).json({
      success: true,
      data: { enrollment },
    });
  })
);

export default router;
```

#### C3. Testing Backend

```bash
# Unit tests for services
npm test app/services/course-discovery.server.test.ts

# API endpoint tests
npm test app/api/courses/discover.test.ts
npm test app/api/enrollments.test.ts

# Integration tests
npm test app/tests/integration/enrollment.test.ts
```

---

### Phase D: Frontend - Course Discovery Page (6-8 hours)

#### D1. Create Discovery Component

**File**: `app/components/student/CourseDiscoveryContent.tsx`

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

interface Course {
  id: string;
  name: string;
  description: string;
  code?: string;
  teacher: {
    id: string;
    name: string;
    email: string;
    picture?: string;
  };
  classes: any[];
  enrollmentStatus: 'enrolled' | 'not_enrolled';
}

interface Props {
  courses: Course[];
  enrolledCourseIds: Set<string>;
  onEnroll: (classId: string, courseId: string) => Promise<void>;
  isLoading: boolean;
}

export function CourseDiscoveryContent({ courses, enrolledCourseIds, onEnroll, isLoading }: Props) {
  const { t } = useTranslation('course');
  const [enrolling, setEnrolling] = useState<string | null>(null);

  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('discovery.empty')}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">{course.name}</CardTitle>
                <CardDescription className="text-sm">{course.teacher.name}</CardDescription>
              </div>
              {enrolledCourseIds.has(course.id) && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                  {t('discovery.enrolled')}
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {course.description && <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>}

            {course.classes.map((cls) => (
              <div key={cls.id} className="text-sm border rounded p-2 space-y-1">
                <p className="font-medium">{cls.name}</p>
                {cls.schedule && (
                  <p className="text-xs text-muted-foreground">
                    {cls.schedule.weekday} {cls.schedule.periodCode}
                  </p>
                )}
                <p className="text-xs">
                  {cls.enrollmentCount}/{cls.capacity || '∞'} {t('discovery.students')}
                </p>

                <Button
                  size="sm"
                  className="w-full mt-2"
                  disabled={enrolledCourseIds.has(course.id) || cls.isFull || enrolling === cls.id}
                  onClick={async () => {
                    setEnrolling(cls.id);
                    try {
                      await onEnroll(cls.id, course.id);
                    } finally {
                      setEnrolling(null);
                    }
                  }}
                >
                  {enrolledCourseIds.has(course.id)
                    ? t('discovery.enrolled')
                    : cls.isFull
                      ? t('discovery.classFull')
                      : t('discovery.enroll')}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

#### D2. Create Discovery Route

**File**: `app/routes/student/courses/discover.tsx`

```tsx
import { type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { useLoaderData, Form } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { getDiscoverableCourses, createEnrollment } from '@/services/course-discovery.server';
import { CourseDiscoveryContent } from '@/components/student/CourseDiscoveryContent';
import { PageHeader } from '@/components/ui/page-header';
import { useTranslation } from 'react-i18next';

interface LoaderData {
  student: { id: string; email: string };
  courses: any[];
}

export async function loader({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const student = await requireStudent(request);

  const courses = await getDiscoverableCourses(student.id, {
    limit: 100,
    sort: 'newest',
  });

  return {
    student,
    courses,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return { success: false, error: 'Invalid method' };
  }

  const student = await requireStudent(request);
  const formData = await request.formData();
  const classId = formData.get('classId') as string;

  try {
    await createEnrollment(student.id, classId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Enrollment failed',
    };
  }
}

export default function CourseDiscoveryPage() {
  const { t } = useTranslation('course');
  const { student, courses } = useLoaderData<LoaderData>();

  const enrolledCourseIds = new Set(
    courses.filter((c: any) => c.enrollmentStatus === 'enrolled').map((c: any) => c.id)
  );

  return (
    <div>
      <PageHeader title={t('discovery.title')} />

      <div className="max-w-7xl mx-auto p-6">
        <CourseDiscoveryContent
          courses={courses}
          enrolledCourseIds={enrolledCourseIds}
          onEnroll={async (classId) => {
            // Use Form submission for enrollment
            const form = new FormData();
            form.append('classId', classId);
            await fetch(request.url, { method: 'POST', body: form });
          }}
          isLoading={false}
        />
      </div>
    </div>
  );
}
```

#### D3. Update Translations

**File**: `app/locales/en/course.json` (add keys):

```json
{
  "discovery": {
    "title": "Discover Courses",
    "empty": "No courses available yet. Check back later!",
    "enroll": "Enroll",
    "enrolled": "Enrolled",
    "classFull": "Class Full",
    "students": "students"
  }
}
```

**File**: `app/locales/zh/course.json` (add keys):

```json
{
  "discovery": {
    "title": "發現課程",
    "empty": "目前沒有可用課程。請稍後再檢查！",
    "enroll": "加入課程",
    "enrolled": "已加入",
    "classFull": "已額滿",
    "students": "位學生"
  }
}
```

---

### Phase E: Integration & Testing (3-4 hours)

#### E1. End-to-End Testing

```bash
# Start dev server
npm run dev

# Test flows:
# 1. Navigate to /student/courses/discover
# 2. View all available courses
# 3. Click Enroll on a course
# 4. Verify enrollment success
# 5. Verify course now shows "Enrolled" badge
# 6. Test on mobile viewport (320px)
# 7. Test dark mode toggle
# 8. Test teacher invitation display redesign
```

#### E2. Accessibility Testing

```bash
# Check contrast ratios
npm run accessibility:check

# Manual testing:
# - Tab navigation through course cards
# - Screen reader testing
# - Color contrast verification
```

#### E3. Performance Testing

```bash
# Test discovery page load time
npm run lighthouse -- /student/courses/discover

# Database query performance
npm run db:analyze -- "SELECT ... FROM courses"
```

---

## Deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] Type check passing (`npm run typecheck`)
- [ ] Lint passing (`npm run lint`)
- [ ] InvitationDisplay redesign responsive at 320px+
- [ ] Course discovery page loads in <2 seconds
- [ ] No duplicate enrollments possible (unique constraint)
- [ ] Capacity limits enforced
- [ ] WCAG AA contrast ratios verified
- [ ] Dark mode works correctly
- [ ] i18n keys added for all user text
- [ ] Error messages are user-friendly
- [ ] Database queries optimized with appropriate indexes

---

## Risk Mitigation

| Risk                       | Mitigation                                    |
| -------------------------- | --------------------------------------------- |
| Duplicate enrollments      | Unique constraint + debounced form submission |
| Race condition on capacity | Atomic database transaction                   |
| Performance issues         | Pagination + query optimization               |
| Accessibility issues       | Automated testing + manual audit              |
| Mobile responsiveness      | Tested at 320px/480px/768px/1024px            |

---

## Success Metrics

After implementation:

- **SC-001**: Invitation display uses 30-40% less space ✓
- **SC-002**: 3 clicks to enroll ✓
- **SC-003**: <2 second page load ✓
- **SC-004**: 100% WCAG AA compliance ✓
- **SC-005**: Responsive 320px-4K ✓
- **SC-006**: 100% design system consistency ✓
- **SC-007**: <1 second enrollment status update ✓
- **SC-008**: QR code scannable ✓
- **SC-009**: Zero duplicate enrollments ✓

---

## Additional Resources

- Prisma documentation: https://www.prisma.io/docs
- React Router v7: https://reactrouter.com/
- Tailwind CSS: https://tailwindcss.com/
- Zod validation: https://zod.dev/
- WCAG 2.1 guidelines: https://www.w3.org/WAI/WCAG21/quickref/

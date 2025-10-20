# Feature Specification: Sleek Course Enrollment UI

**Feature Branch**: `008-specify-scripts-bash`
**Created**: 2025-10-20
**Status**: Draft
**Input**: User description: "我要重新設計 invitationDisplay 的 layout 設計 必須要 sleek 然後位置應該要正確。另外我們需要重新讓每一位學生都可以看到一個頁面是選課的頁面，也就是這個頁面要有所有老師所開立的課程，讓學生可以去上面選課。然後直接有按鈕可以加入課程，在做的過程中請你考量資料庫設計以及其他頁面主題上面的設計，顏色也必須搭配。"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Redesigned Sleek Invitation Display (Priority: P1)

Teachers need an elegant way to share course invitations with students. The current 2-column grid layout lacks visual hierarchy and feels cluttered. This story redesigns the InvitationDisplay component with a modern, polished appearance that prioritizes the QR code as the primary sharing method while keeping the invitation URL and code accessible.

**Why this priority**: This directly improves the teacher experience when inviting students to courses. A professional, well-organized invitation display encourages teachers to use the feature and creates a better first impression. It's foundational for all invitation workflows.

**Independent Test**: A teacher can generate an invitation for a course, and the invitation display shows a sleek, centered layout with QR code prominently featured, text code in a copyable field, and enrollment link available. The display is responsive and visually polished.

**Acceptance Scenarios**:

1. **Given** a teacher has generated an invitation code for a course, **When** the teacher views the course detail page, **Then** the invitation is displayed in a sleek, single-column centered card with proper visual hierarchy and generous whitespace
2. **Given** the invitation display is rendered, **When** the user clicks a copy button next to the code or link, **Then** the text is copied to clipboard and visual feedback appears (toast or inline confirmation)
3. **Given** viewing on mobile devices (320px-480px width), **When** the invitation display is shown, **Then** QR code and text fields stack vertically without loss of functionality or readability
4. **Given** the invitation display is active, **When** the user examines the layout, **Then** the QR code size is optimized for scanning (minimum 200x200px) and positioned prominently

---

### User Story 2 - Student Course Discovery & Enrollment Page (Priority: P1)

Students need a dedicated page to discover and enroll in all available courses offered by teachers across the platform. Currently, students can only access courses via invitation codes, limiting discoverability. This story creates a beautiful course catalog page where students can browse courses by teacher, see course details (schedule, capacity, description), and join with a single button.

**Why this priority**: This enables students to independently discover courses without needing manual invitations. It transforms the platform from invitation-only to a self-service marketplace, significantly improving student autonomy and platform engagement. This is critical for platform usability and growth.

**Independent Test**: A student can navigate to a dedicated course discovery page, view all available courses with complete information, and successfully enroll in a course by clicking an action button. The page displays correctly across all device sizes.

**Acceptance Scenarios**:

1. **Given** a student is logged in, **When** they navigate to the course discovery page, **Then** they see a list of all available courses from all teachers with course name, teacher name, description, schedule info, and capacity indicator
2. **Given** multiple courses are available, **When** the student views the course cards, **Then** courses are clearly attributed to their teacher with teacher name and profile picture visible
3. **Given** a student clicks the "Enroll" button on a course card, **When** the enrollment is successful, **Then** the page shows a success message and the button changes to "Enrolled" or navigates to the course detail page
4. **Given** a student is already enrolled in a course, **When** they view the discovery page, **Then** the course card shows an "Enrolled" badge preventing duplicate enrollment
5. **Given** a student views a course with limited capacity, **When** the class is at maximum capacity, **Then** they see a "Class Full" indicator and the enroll button is disabled with helpful text
6. **Given** no courses are available, **When** the student views the discovery page, **Then** they see a friendly empty state illustration with message inviting them to check back later

---

### User Story 3 - Consistent Visual Design Across Platform (Priority: P1)

Both the redesigned invitation display and the new course discovery page must seamlessly integrate with the existing application design. This includes matching the primary color scheme, button styles, typography hierarchy, spacing, border radius, and dark mode support.

**Why this priority**: Visual consistency creates professional polish and reduces user cognitive load. Inconsistent design breaks the user experience flow and suggests incomplete work. This must be addressed alongside feature development, not as an afterthought.

**Independent Test**: When viewing the new invitation display and course discovery page alongside existing pages (teacher course management, student dashboard), they appear as part of the same design system using identical color palette, typography, button styles, and spacing patterns.

**Acceptance Scenarios**:

1. **Given** the new components are rendered, **When** comparing primary buttons with existing buttons, **Then** they use the same background color, hover state, and active state styling
2. **Given** course cards on the discovery page, **When** comparing with existing assignment cards and course cards, **Then** they share the same border radius, shadow depth, and padding
3. **Given** text displayed on new components, **When** checking typography, **Then** headings, descriptions, and labels use the same font size, weight, and color from the design system
4. **Given** dark mode is enabled, **When** viewing new components, **Then** all background and text colors automatically adapt with proper contrast maintained (WCAG AA minimum)

---

### User Story 4 - Database Infrastructure for Course Discoverability (Priority: P2)

The backend system must efficiently support querying all publishable courses and managing student enrollments. This includes ensuring database relationships properly track which courses are active, which students are enrolled where, and enforcing capacity constraints at the data layer.

**Why this priority**: This is essential database infrastructure for the course discovery feature. While it's not visible to users, it's critical for making the discovery page performant and reliable. It can be built alongside P1 features.

**Independent Test**: An API query returns all active courses with associated teachers, classes, and current enrollment counts within acceptable time. Student enrollment can be created via API with proper database constraints preventing duplicates and capacity violations.

**Acceptance Scenarios**:

1. **Given** a database query for discoverable courses, **When** filtering for courses with active classes, **Then** only courses having at least one active class are returned
2. **Given** a student enrollment request, **When** checking database constraints, **Then** duplicate enrollments are prevented and capacity limits are enforced
3. **Given** a course with multiple class sections, **When** querying enrollment data, **Then** the system correctly reports per-class enrollment counts and capacity status

---

### Edge Cases

- What happens when a teacher creates a course but hasn't created any active classes? (Course should not appear in discovery list; show warning in teacher dashboard)
- What happens when enrollment capacity is reached just as a student clicks Enroll? (Request should fail gracefully with "Class Full" message, no error page)
- What happens when a course is deleted or archived while a student is viewing the discovery page? (Page should remain functional; enrollment attempt shows "Course no longer available")
- What happens to enrolled students when a course is marked inactive? (Enrolled students retain access to existing course; new students cannot enroll)
- How should the system display course schedules for students in different timezones? (Display in student's local timezone with indication of timezone offset or absolute UTC time as fallback)
- What happens if a student has unreliable internet and tries to enroll twice rapidly? (Second request is debounced/prevented; user sees loading state then confirmation)

---

## Requirements *(mandatory)*

### Functional Requirements

#### Invitation Display Component (UI/UX)

- **FR-001**: System MUST redesign InvitationDisplay component to use single-column centered layout instead of 2-column grid
- **FR-002**: System MUST position QR code as the primary visual element with the invitation code and URL as secondary supporting information
- **FR-003**: System MUST display invitation code in a monospace font within a clearly-defined field (e.g., using border, background color, or card style)
- **FR-004**: System MUST provide a copy-to-clipboard button for the invitation code with visual feedback on successful copy
- **FR-005**: System MUST provide a copy-to-clipboard button for the enrollment URL with visual feedback on successful copy
- **FR-006**: System MUST display QR code image at minimum 200x200px size, optimized for mobile scanning, with optional download functionality
- **FR-007**: System MUST display descriptive text below the QR code explaining its purpose (e.g., "Scan to join this course")
- **FR-008**: System MUST implement responsive design where components stack vertically on mobile without layout breaking at any screen size down to 320px width
- **FR-009**: System MUST apply consistent spacing (padding/margin) that aligns with surrounding Card container and page margins
- **FR-010**: System MUST use the application's primary accent color for interactive elements (copy buttons, highlights) and secondary color for supporting text
- **FR-011**: System MUST support dark mode with appropriate color inversion and maintained contrast ratios

#### Course Discovery Page (Feature)

- **FR-012**: System MUST create a new student-accessible route for course discovery (e.g., `/student/browse` or `/student/courses/discover`)
- **FR-013**: System MUST fetch and display all courses from all teachers that have at least one active class
- **FR-014**: System MUST display course information in card format including: course name (prominent), teacher name and profile picture, course description, schedule information (weekday/period/room if available), capacity status (current/max), and enrollment status badge
- **FR-015**: System MUST include an "Enroll" button on each course card that enables one-click enrollment
- **FR-016**: System MUST prevent duplicate enrollment by showing "Enrolled" badge or disabled button for courses student is already enrolled in
- **FR-017**: System MUST validate enrollment capacity constraints and show "Class Full" message when at maximum capacity, with enroll button disabled
- **FR-018**: System MUST display empty state with helpful message when no courses are available for enrollment
- **FR-019**: System MUST group courses by teacher on the page or clearly display teacher attribution on each card
- **FR-020**: System MUST sort courses by creation date (newest first) by default, with optional ability to sort by teacher name or course name
- **FR-021**: System MUST include optional search/filter input to help students find courses by name, teacher name, or keywords
- **FR-022**: System MUST show enrollment confirmation (toast notification or redirect to course detail) after successful enrollment

#### Database & API Support

- **FR-023**: Database schema MUST support efficient querying of active courses with related active classes and enrollment data
- **FR-024**: Database MUST properly track which students are enrolled in which classes with unique constraints preventing duplicate enrollments
- **FR-025**: Database MUST enforce capacity constraints at the schema level (check constraints) or application layer validation
- **FR-026**: API MUST provide endpoint GET `/api/courses/discover` returning all discoverable courses with teacher info and current student's enrollment status
- **FR-027**: API MUST provide endpoint POST `/api/enrollments` to create new student enrollment with proper validation and error handling
- **FR-028**: API MUST validate that a course has at least one active class before allowing enrollment
- **FR-029**: API MUST return descriptive error messages for enrollment failures (duplicate, capacity full, course inactive, etc.)

#### Visual & Design Consistency

- **FR-030**: System MUST apply primary color from design system (primary HSL value) to main action buttons and accent elements
- **FR-031**: System MUST apply secondary color to supporting buttons and secondary elements
- **FR-032**: System MUST use accent color for highlights, badges, and important information callouts
- **FR-033**: System MUST maintain consistent button styles across new components (height, padding, font size, hover/active states)
- **FR-034**: System MUST maintain consistent card styling (border radius, shadow, padding, background) matching existing Card components
- **FR-035**: System MUST maintain consistent typography hierarchy (heading sizes, weights, letter spacing) with existing design
- **FR-036**: System MUST ensure all text meets WCAG AA contrast ratio standards (4.5:1 for normal text, 3:1 for large text) in both light and dark modes
- **FR-037**: System MUST support responsive typography that scales appropriately across mobile, tablet, and desktop viewports

### Key Entities

- **Course**: Represents a course offered by a teacher. Key attributes: id, name, description, code (optional), teacher relationship, isActive flag, createdAt, updatedAt. A course contains multiple classes (sections) and assignment areas.

- **Class**: Represents a specific section/time slot of a course. Key attributes: id, courseId, name, schedule (JSON object with weekday, periodCode, room), capacity (nullable = unlimited), isActive flag. Tracks how many students are enrolled.

- **User**: Distinguishes teachers and students. Teachers create courses; students enroll in them. Key relationships: Teacher has many Courses; User has many Enrollments (students only).

- **Enrollment**: Links a student to a specific class they're enrolled in. Key attributes: id, studentId, classId, enrollmentDate, status. Prevents duplicates via unique constraint on (studentId, classId).

- **InvitationCode**: Enables teachers to invite students via shareable code. Key attributes: id, code (unique), courseId, classId, expiresAt, usedCount, isActive. Many invitation codes can point to the same class.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The redesigned invitation display uses 30-40% less vertical space than the previous 2-column grid layout while improving visual clarity
- **SC-002**: Students can discover and enroll in a course from the discovery page in 3 clicks or fewer
- **SC-003**: The course discovery page loads and displays course listings within 2 seconds on standard internet connections (3G/4G)
- **SC-004**: 100% of new UI elements maintain WCAG AA contrast ratios (4.5:1 minimum) in both light and dark modes, verified by automated and manual testing
- **SC-005**: The discovery page displays correctly without horizontal scrolling on all viewport sizes from 320px (mobile) to 4K (3840px)
- **SC-006**: 100% of visual elements (colors, typography, spacing) are consistent with existing design system components as verified by design system audit
- **SC-007**: Students see their updated enrollment status on the discovery page within 1 page refresh or automatic UI update after enrolling
- **SC-008**: The QR code in the invitation display is scannable by standard QR reader apps and correctly links to the enrollment URL
- **SC-009**: Zero duplicate enrollments occur even when students submit enrollment form multiple times rapidly (form submission is debounced/disabled after first click)

---

## Assumptions

1. **Existing Authentication**: Students are already authenticated via Google OAuth and have proper route guards; no new authentication implementation needed.

2. **Course Publishing Model**: All courses are considered published by default; no draft/publish workflow exists in the current system. Only courses with active classes are discoverable.

3. **Enrollment Architecture**: Enrollments link students to classes (not just courses), allowing enrollment tracking per class/section. This enables accurate capacity management and per-section tracking.

4. **No Mandatory Invitations**: The new discovery page enables direct enrollment without invitation codes. Invitation codes remain available as an alternative for teachers who prefer manual control.

5. **Capacity Per Class**: Capacity limits apply at the class level (each section has its own capacity), not course level. Different class sections can have different limits.

6. **Database Relationships**: The existing Prisma schema supports the required relationships (Course → Class → Enrollment → User) without major modifications.

7. **Color System**: The application uses CSS variables for color system (primary, secondary, accent, etc.) that can be inherited by new components.

8. **No Waiting List in MVP**: Initial implementation shows "Class Full" message when capacity is reached. Waiting list functionality can be added in future iterations.

9. **Teacher Profile Data**: Teacher profile pictures and names are available in the User model and can be displayed on course discovery cards without additional queries.

10. **Schedule Data Format**: Course schedule information is stored as JSON (weekday, periodCode, room) and can be parsed and displayed consistently across pages.

---

## Open Questions for Clarification

[NEEDS CLARIFICATION: Waiting List Feature - Should students be able to join a waiting list when a class is full, with automatic notification when a spot becomes available? Or should the MVP simply prevent enrollment with a "Class Full" message and suggest contacting the teacher?]


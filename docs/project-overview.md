1. Project Overview
The Grading System is a web-based application designed to streamline the academic workflow for teachers and students. It facilitates course management, assignment distribution (assignment areas), submission handling, and provides AI-assisted analysis to support the grading process. The goal is to create an efficient, transparent, and collaborative educational platform.

2. User Roles
- Teacher: Responsible for the administrative side of the educational process. This includes creating courses, defining assignments and their grading criteria (rubrics), managing student enrollment, reviewing submissions, and providing final grades and feedback.
- Student: The primary consumer of the educational content. Students enroll in courses, view assignment requirements, submit their work through the platform, and track their progress by viewing statuses, grades, and teacher feedback.

3. Core User Journeys (Detailed Step-by-Step)
3.1. Teacher User Journeys
Onboarding & Course Creation:
- Teacher logs in via Google OAuth for the first time.
- System creates a user record.
- Teacher selects the "Teacher" role.
- Teacher is redirected to their dashboard (`/teacher/dashboard`).
- Teacher creates a new course (`/teacher/courses/new`), giving it a name and optional description.
- System supports generating a course invitation code and QR code from the course detail page to invite students.

Assignment & Rubric Creation:
- Teacher navigates to a specific course (`/teacher/courses/:courseId`).
- Teacher creates a new assignment area (`/teacher/courses/:courseId/assignments/new`), providing a title, description, rubric, and optional due date.
- Teacher either creates a new grading rubric (`/teacher/rubrics/new`) or attaches an existing one to the assignment area.

Student Management & Grading:
- Teacher views the list of students enrolled in a course (`/teacher/courses/:courseId/students`).
- Teacher views a list of submissions for a specific assignment area (`/teacher/courses/:courseId/assignments/:assignmentId/submissions`).
- Teacher can download the submitted file, and see high-level submission details (status, score if present, AI analysis presence).
- Teacher review UI to view AI analysis details and input final feedback/score is a recommended next step (see Next Steps).
- Once grading is finalized, the system should update the submission status to "GRADED" with final score and feedback.

3.2. Student User Journeys
Onboarding & Course Enrollment:
- Student logs in via Google OAuth for the first time.
- System creates a user record.
- Student selects the "Student" role.
- Student is redirected to their dashboard (`/student/dashboard`).
- Student joins a course using an invitation code or QR code (via `/join?code=...`).

Assignment Submission:
- Student navigates to the Assignments page (`/student/assignments`).
- Student sees a list of all assignments available from enrolled courses, categorized by status (Pending, Overdue, Submitted, Graded).
- Student selects a pending assignment and uploads their assignment file (`/student/assignments/:assignmentId/submit`).
- System confirms the upload, enables AI preview workflow, and when submitted creates a submission record and links AI analysis results.

Viewing Grades & Feedback:
- Student visits Submissions (`/student/submissions`) or receives a notification.
- Student opens a submission detail (`/student/submissions/:submissionId`).
- Student sees status, final score (if graded), the AI analysis, and teacher comments/feedback.

4. Feature Implementation Status
This status is based on analysis of the codebase (notably `app/services/auth.server.ts`, `app/routes/student/assignments.tsx`, student submission flows, and teacher course/assignment routes).

[x] - Implemented
[ ] - To-Do (Not yet implemented or partially implemented)

4.1. Core & Authentication
- [x] User login via Google OAuth (Auth routes + `auth.server.ts`).
- [x] First-time user role selection (Teacher/Student).
- [x] Role-based access control and redirects (`requireTeacher`, `requireStudent`).

4.2. Teacher Features
- [x] Teacher Dashboard (`/teacher/dashboard`).
- [x] Create/View courses (`/teacher/courses/new`, list, detail pages).
- [x] Generate course invitation codes and QR codes (course detail page + `invitation.server.ts`).
- [x] Create/View assignments within a course (assignment areas) and edit settings (`/teacher/courses/:courseId/assignments/new`, `.../manage`).
- [x] Create/Attach grading rubrics (rubric list/view/new; AI-assisted rubric generation endpoint in codebase).
- [x] View list of student submissions for an assignment area (`.../:assignmentId/submissions`).
- [ ] Teacher review page to view a single submission with inline preview and AI analysis details (currently basic download link + status; dedicated review UI recommended).
- [ ] AI-powered grading review interface for teachers (display AI result, accept/adjust per-criterion, overall feedback).
- [ ] Interface for teachers to add final comments and score and update status to GRADED (service support exists via `updateSubmission`, but UI/action flow not present).
- [x] View enrolled students (`/teacher/courses/:courseId/students`).

4.3. Student Features
- [x] Student Dashboard.
- [x] Join a course with an invitation code/QR (`/join`, `invitation.server.ts`).
- [x] View list of enrolled courses (`/student/courses`).
- [x] View assignments, grouped by course and categorized by status (`/student/assignments`).
- [x] Submit a file for an assignment with AI analysis preview (`/student/assignments/:assignmentId/submit`).
- [x] View submission details, including status and final score (`/student/submissions/:submissionId`).
- [x] View teacher's feedback/comments (displayed on submission detail).
- [x] View AI analysis results (displayed via `GradingResultDisplay`).

5. Next Steps & Recommendations
- Teacher Review UI: Implement a dedicated teacher submission review page to view the uploaded file inline (PDF/text preview), inspect AI analysis details, and provide final feedback and a score. Wire this to `updateSubmission` to set `teacherFeedback`, `finalScore`, and status `GRADED`.
- AI-Assisted Grading for Teachers: Expose the AI-generated rubric breakdown to teachers with controls to adjust per-criterion scores and confirm the final grade.
- Submission Moderation and Audit: Add activity logs on teacher actions (grade changes), and optional re-run AI analysis from teacher view.
- Notifications: Add lightweight notifications to inform students when a submission transitions to GRADED.
- Access Hardening: Ensure teachers can only access submissions of their courses; students only their own submissions (services mostly enforce this; verify on new routes).


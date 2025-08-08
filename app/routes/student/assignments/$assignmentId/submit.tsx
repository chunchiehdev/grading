import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { useLoaderData, useActionData, Form } from 'react-router';
import { requireStudent } from '@/services/auth.server';
import { getAssignmentAreaForSubmission, createSubmission } from '@/services/submission.server';

interface LoaderData {
  student: { id: string; email: string; role: string };
  assignment: any; // Assignment area with course and rubric info
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const student = await requireStudent(request);
  const assignmentId = params.assignmentId;

  if (!assignmentId) {
    throw new Response('Assignment not found', { status: 404 });
  }

  const assignment = await getAssignmentAreaForSubmission(assignmentId, student.id);
  
  if (!assignment) {
    throw new Response('Assignment not found', { status: 404 });
  }

  return { student, assignment };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const student = await requireStudent(request);
  const assignmentId = params.assignmentId;
  const formData = await request.formData();

  if (!assignmentId) {
    throw new Response('Assignment not found', { status: 404 });
  }

  const filePath = formData.get('filePath') as string;

  if (!filePath || filePath.trim().length === 0) {
    throw new Response(JSON.stringify({ error: 'Please upload a file for your submission' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check if assignment is past due date
  const assignment = await getAssignmentAreaForSubmission(assignmentId, student.id);
  if (assignment?.dueDate && new Date(assignment.dueDate) < new Date()) {
    throw new Response(JSON.stringify({ error: 'This assignment is past the due date and can no longer accept submissions' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const submission = await createSubmission(student.id, {
      assignmentAreaId: assignmentId,
      filePath: filePath.trim(),
    });

    // Redirect to student submissions page
    throw redirect('/student/submissions');
  } catch (error) {
    console.error('Error creating submission:', error);
    throw new Response(JSON.stringify({ error: 'Failed to submit assignment. Please try again.' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

interface ActionData {
  error?: string;
}

export default function SubmitAssignment() {
  const { student, assignment } = useLoaderData<typeof loader>();
  const actionData = useActionData() as ActionData | undefined;

  const rubricCriteria = (assignment.rubric as any)?.criteria || [];

  return (
    <div>
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{assignment.name}</h1>
              <p className="text-gray-600">{assignment.course.name}</p>
              <p className="text-sm text-gray-500">Teacher: {assignment.course.teacher.email}</p>
            </div>
            <div className="flex items-center space-x-4 border">
              <a
                href="/student/dashboard"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assignment Details */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Assignment Details</h2>
              </div>
              <div className="px-6 py-4 space-y-4">
                {assignment.description && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-600">{assignment.description}</p>
                  </div>
                )}
                
                {assignment.dueDate && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Due Date</h3>
                    <p className="text-gray-600">
                      {new Date(assignment.dueDate).toLocaleDateString()} at{' '}
                      {new Date(assignment.dueDate).toLocaleTimeString()}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Course</h3>
                  <p className="text-gray-600">{assignment.course.name}</p>
                </div>
              </div>
            </div>

            {/* Submission Form */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Submit Your Work</h2>
              </div>
              <Form method="post" className="px-6 py-6">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="filePath" className="block text-sm font-medium text-gray-700 mb-2">
                      File Upload <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="filePath"
                      name="filePath"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter file path or URL of your submission"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Note: In a real implementation, this would be a file upload component.
                    </p>
                  </div>

                                     {actionData && 'error' in actionData && (
                     <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                       <div className="flex">
                         <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                         <div className="ml-3">
                           <p className="text-sm text-red-600">{actionData.error}</p>
                         </div>
                       </div>
                     </div>
                   )}

                  <div className="flex justify-end space-x-4">
                    <a
                      href="/student/dashboard"
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </a>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Submit Assignment
                    </button>
                  </div>
                </div>
              </Form>
            </div>
          </div>

          {/* Rubric Display */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Grading Rubric</h2>
              <p className="text-sm text-gray-600 mt-1">{assignment.rubric.name}</p>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-600 mb-4">{assignment.rubric.description}</p>
              
              {Array.isArray(rubricCriteria) && rubricCriteria.length > 0 ? (
                <div className="space-y-4">
                  {rubricCriteria.map((criterion: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-2">{criterion.name}</h3>
                      <p className="text-sm text-gray-600 mb-3">{criterion.description}</p>
                      
                      {criterion.levels && Array.isArray(criterion.levels) && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">Scoring Levels:</h4>
                          {criterion.levels.map((level: any, levelIndex: number) => (
                            <div key={levelIndex} className="flex justify-between items-start bg-gray-50 rounded p-2">
                              <div className="flex-1">
                                <p className="text-sm text-gray-700">{level.description}</p>
                              </div>
                              <span className="text-sm font-medium text-blue-600 ml-2">
                                {level.score} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-sm text-gray-600">
                          Maximum Score: <span className="font-medium">{criterion.maxScore || 0} points</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No criteria defined</h3>
                  <p className="mt-1 text-sm text-gray-500">This rubric doesn't have detailed criteria yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 
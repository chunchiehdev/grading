import { json, type LoaderFunctionArgs } from 'react-router';
import { validateInvitationCode } from '@/services/invitation.server';
import { getUserId } from '@/services/auth.server';

/**
 * API endpoint to validate an invitation code
 * GET /api/invitations/validate?code=<code>
 *
 * Returns:
 * {
 *   isValid: boolean,
 *   course?: { id, name, description, teacher: { id, email, name } },
 *   invitationCode?: { id, code, courseId, classId, expiresAt },
 *   isAlreadyEnrolled?: boolean,
 *   error?: string
 * }
 */
export async function loader({ request }: LoaderFunctionArgs) {
  // Only allow GET requests
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // Get the code from query parameters
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return json(
        { isValid: false, error: 'Invitation code is required' },
        { status: 400 }
      );
    }

    // Get student ID for enrollment check
    const studentId = await getUserId(request);

    // Validate the invitation code
    const validation = await validateInvitationCode(code, studentId || undefined);

    return json(validation);
  } catch (error) {
    console.error('Error validating invitation code:', error);
    return json(
      { isValid: false, error: 'Failed to validate invitation code' },
      { status: 500 }
    );
  }
}

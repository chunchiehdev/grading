import { db } from '@/lib/db.server';
import QRCode from 'qrcode';

export interface InvitationCodeInfo {
  id: string;
  code: string;
  courseId: string;
  createdAt: Date;
  expiresAt: Date;
  isUsed: boolean;
  usedAt: Date | null;
  usedById: string | null;
  course: {
    id: string;
    name: string;
    description: string | null;
    teacher: {
      id: string;
      email: string;
      name: string;
    };
  };
  usedBy?: {
    id: string;
    email: string;
    name: string;
  } | null;
}

export interface InvitationValidation {
  isValid: boolean;
  error?: string;
  course?: {
    id: string;
    name: string;
    description: string | null;
    teacher: {
      id: string;
      email: string;
      name: string;
    };
  };
  isAlreadyEnrolled?: boolean;
}

/**
 * Configuration for invitation codes
 */
const INVITATION_CONFIG = {
  // Default expiration time (7 days)
  DEFAULT_EXPIRY_DAYS: 7,
  // Code length
  CODE_LENGTH: 8,
  // Characters to use in codes (excluding confusing ones like 0, O, 1, l)
  CODE_CHARSET: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
  // QR Code options
  QR_OPTIONS: {
    errorCorrectionLevel: 'M' as const,
    type: 'image/png' as const,
    quality: 0.92,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    width: 256,
  },
} as const;

/**
 * Generates a random invitation code
 */
function generateInvitationCode(): string {
  const { CODE_LENGTH, CODE_CHARSET } = INVITATION_CONFIG;
  let result = '';
  
  for (let i = 0; i < CODE_LENGTH; i++) {
    result += CODE_CHARSET.charAt(Math.floor(Math.random() * CODE_CHARSET.length));
  }
  
  return result;
}

/**
 * Creates an invitation code for a course
 * @param courseId - Course ID
 * @param teacherId - Teacher's user ID for authorization
 * @param expiryDays - Days until expiration (default: 7)
 * @returns Created invitation code information
 */
export async function createInvitationCode(
  courseId: string, 
  teacherId: string, 
  expiryDays: number = INVITATION_CONFIG.DEFAULT_EXPIRY_DAYS
): Promise<InvitationCodeInfo> {
  try {
    // Verify teacher owns the course
    const course = await db.course.findFirst({
      where: {
        id: courseId,
        teacherId,
      },
      include: {
        teacher: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!course) {
      throw new Error('Course not found or unauthorized');
    }

    // Check for existing active invitation code
    const existingCode = await db.invitationCode.findFirst({
      where: {
        courseId,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingCode) {
      // Return existing active code
      return {
        ...existingCode,
        course,
        usedBy: null,
      };
    }

    // Generate unique code
    let code: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      code = generateInvitationCode();
      const existing = await db.invitationCode.findUnique({
        where: { code },
      });
      isUnique = !existing;
      attempts++;
    } while (!isUnique && attempts < maxAttempts);

    if (!isUnique) {
      throw new Error('Failed to generate unique invitation code');
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Create invitation code
    const invitationCode = await db.invitationCode.create({
      data: {
        code,
        courseId,
        expiresAt,
      },
    });

    console.log('✅ Created invitation code:', code, 'for course:', courseId);
    
    return {
      ...invitationCode,
      course,
      usedBy: null,
    };
  } catch (error) {
    console.error('❌ Error creating invitation code:', error);
    throw error;
  }
}

/**
 * Validates an invitation code
 * @param code - Invitation code to validate
 * @param studentId - Student's user ID (optional, for enrollment check)
 * @returns Validation result with course info
 */
export async function validateInvitationCode(
  code: string, 
  studentId?: string
): Promise<InvitationValidation> {
  try {
    const invitationCode = await db.invitationCode.findUnique({
      where: { code },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!invitationCode) {
      return {
        isValid: false,
        error: 'Invitation code not found',
      };
    }

    // For course-wide invite links, allow multiple uses.
    // We no longer treat a single prior use as invalidation.

    if (invitationCode.expiresAt <= new Date()) {
      return {
        isValid: false,
        error: 'Invitation code has expired',
        course: invitationCode.course,
      };
    }

    let isAlreadyEnrolled = false;
    if (studentId) {
      const enrollment = await db.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId: invitationCode.courseId,
          },
        },
      });
      isAlreadyEnrolled = !!enrollment;
    }

    return {
      isValid: true,
      course: invitationCode.course,
      isAlreadyEnrolled,
    };
  } catch (error) {
    console.error('❌ Error validating invitation code:', error);
    return {
      isValid: false,
      error: 'Failed to validate invitation code',
    };
  }
}

/**
 * Uses an invitation code to enroll a student
 * @param code - Invitation code
 * @param studentId - Student's user ID
 * @returns Success status and enrollment info
 */
export async function useInvitationCode(
  code: string, 
  studentId: string
): Promise<{ success: boolean; error?: string; enrollmentId?: string }> {
  try {
    // Validate the code first
    const validation = await validateInvitationCode(code, studentId);
    
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    if (validation.isAlreadyEnrolled) {
      return {
        success: false,
        error: 'You are already enrolled in this course',
      };
    }

    if (!validation.course) {
      return {
        success: false,
        error: 'Course information not found',
      };
    }

    // Use transaction to ensure atomicity
    const result = await db.$transaction(async (tx: any) => {
      // Create enrollment
      const enrollment = await tx.enrollment.create({
        data: {
          studentId,
          courseId: validation.course!.id,
        },
      });

      // Do NOT mark the invitation code as used to allow multi-use
      return enrollment;
    });

    console.log('✅ Invitation code used:', code, 'student enrolled:', studentId);
    
    return {
      success: true,
      enrollmentId: result.id,
    };
  } catch (error) {
    console.error('❌ Error using invitation code:', error);
    return {
      success: false,
      error: 'Failed to use invitation code',
    };
  }
}

/**
 * Gets invitation codes for a course
 * @param courseId - Course ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns List of invitation codes
 */
export async function getCourseInvitationCodes(
  courseId: string, 
  teacherId: string
): Promise<InvitationCodeInfo[]> {
  try {
    // Verify teacher owns the course
    const course = await db.course.findFirst({
      where: {
        id: courseId,
        teacherId,
      },
      include: {
        teacher: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!course) {
      throw new Error('Course not found or unauthorized');
    }

    const invitationCodes = await db.invitationCode.findMany({
      where: { courseId },
      include: {
        usedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitationCodes.map((code: any) => ({
      ...code,
      course,
    }));
  } catch (error) {
    console.error('❌ Error fetching invitation codes:', error);
    return [];
  }
}

/**
 * Generates QR code for invitation URL
 * @param code - Invitation code
 * @param baseUrl - Base URL of the application
 * @returns Base64 encoded QR code image
 */
export async function generateInvitationQRCode(
  code: string, 
  baseUrl: string = process.env.APP_BASE_URL || 'http://localhost:5173'
): Promise<string> {
  try {
    const invitationUrl = `${baseUrl}/join?code=${code}`;
    const qrCodeDataUrl = await QRCode.toDataURL(invitationUrl, INVITATION_CONFIG.QR_OPTIONS);
    
    console.log('✅ Generated QR code for invitation:', code);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('❌ Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Gets active invitation code for a course (if any)
 * @param courseId - Course ID
 * @param teacherId - Teacher's user ID for authorization
 * @returns Active invitation code or null
 */
export async function getActiveCourseInvitation(
  courseId: string, 
  teacherId: string
): Promise<InvitationCodeInfo | null> {
  try {
    // Verify teacher owns the course
    const course = await db.course.findFirst({
      where: {
        id: courseId,
        teacherId,
      },
      include: {
        teacher: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!course) {
      throw new Error('Course not found or unauthorized');
    }

    const activeCode = await db.invitationCode.findFirst({
      where: {
        courseId,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeCode) {
      return null;
    }

    return {
      ...activeCode,
      course,
      usedBy: null,
    };
  } catch (error) {
    console.error('❌ Error fetching active invitation:', error);
    return null;
  }
}

/**
 * Revokes (expires) an invitation code
 * @param code - Invitation code to revoke
 * @param teacherId - Teacher's user ID for authorization
 * @returns Success status
 */
export async function revokeInvitationCode(
  code: string, 
  teacherId: string
): Promise<boolean> {
  try {
    const invitationCode = await db.invitationCode.findUnique({
      where: { code },
      include: {
        course: true,
      },
    });

    if (!invitationCode) {
      return false;
    }

    // Verify teacher owns the course
    if (invitationCode.course.teacherId !== teacherId) {
      throw new Error('Unauthorized to revoke this invitation code');
    }

    await db.invitationCode.update({
      where: { code },
      data: {
        expiresAt: new Date(), // Set expiry to now
      },
    });

    console.log('✅ Revoked invitation code:', code);
    return true;
  } catch (error) {
    console.error('❌ Error revoking invitation code:', error);
    return false;
  }
}

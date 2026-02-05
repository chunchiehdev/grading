import type { ActionFunctionArgs } from 'react-router';
import { requireTeacher } from '@/services/auth.server';
import { db } from '@/lib/db.server';
import { v4 as uuidv4 } from 'uuid';
import { uploadToStorage, deleteFromStorage } from '@/services/storage.server';
import logger from '@/utils/logger';

export async function action({ request, params }: ActionFunctionArgs) {
  const { courseId } = params;

  if (!courseId) {
    return Response.json({ success: false, error: 'Course ID is required' }, { status: 400 });
  }

  if (request.method !== 'POST') {
    return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const teacher = await requireTeacher(request);

    // Verify teacher owns this course
    const course = await db.course.findUnique({
      where: { id: courseId, teacherId: teacher.id },
    });

    if (!course) {
      return Response.json({ success: false, error: 'Course not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return Response.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return Response.json({ success: false, error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    // Generate unique storage key
    const ext = file.name.split('.').pop() || 'jpg';
    const storageKey = `covers/${courseId}/${uuidv4()}.${ext}`;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to MinIO/S3
    logger.info(`Uploading cover image for course ${courseId}`, {
      courseId,
      teacherId: teacher.id,
      fileSize: file.size,
      mimeType: file.type,
      storageKey,
    });

    const uploadResult = await uploadToStorage(buffer, storageKey, file.type);

    if (!uploadResult.success) {
      throw new Error('Failed to upload to storage');
    }

    // Delete old cover image from storage if exists
    if (course.coverImage) {
      try {
        await deleteFromStorage(course.coverImage);
        logger.info(`Deleted old cover image: ${course.coverImage}`);
      } catch (error) {
        // Log but don't fail the request if old image deletion fails
        logger.warn(`Failed to delete old cover image: ${course.coverImage}`, { error });
      }
    }

    // Update course with new cover image storage key
    await db.course.update({
      where: { id: courseId },
      data: { coverImage: storageKey },
    });

    logger.info(`Cover image updated for course ${courseId}`, { storageKey });

    return Response.json({ success: true, coverImage: storageKey });
  } catch (error) {
    logger.error('Failed to upload cover image:', error);
    return Response.json({ success: false, error: 'Failed to upload cover image' }, { status: 500 });
  }
}

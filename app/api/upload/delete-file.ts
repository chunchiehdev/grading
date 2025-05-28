import type { Route } from './+types/delete-file';
import { deleteFromStorage } from '@/services/storage.server';

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== 'DELETE') {
    return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { key } = await request.json();
    
    if (!key) {
      return Response.json({ success: false, error: 'File key is required' }, { status: 400 });
    }

    await deleteFromStorage(key);
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete file:', error);
    return Response.json(
      { success: false, error: 'Failed to delete file' },
      { status: 500 }
    );
  }
} 
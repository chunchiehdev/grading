import { type LoaderFunctionArgs, data } from 'react-router';
import { requireAuthForApi } from '@/services/auth.server';
import { getUserNotifications } from '@/services/notification.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuthForApi(request);
  if (!user) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const notifications = await getUserNotifications(user.id);
    
    // Transform to match store expectations
    const formattedNotifications = notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt,
      data: n.data,
      assignmentId: n.assignmentId,
    }));

    return data({ success: true, data: formattedNotifications });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return data({ error: 'Internal server error' }, { status: 500 });
  }
}

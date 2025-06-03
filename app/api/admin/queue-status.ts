import { getSimpleQueueStatus } from '@/services/simple-grading.server';

/**
 * GET: Get queue status
 */
export async function loader() {
    try {
        const status = getSimpleQueueStatus();
        
        return Response.json({
            success: true,
            status: {
                waiting: status.waiting,
                active: status.active,
                completed: status.completed,
                failed: status.failed,
            },
            mode: 'simple_processing',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return Response.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get queue status',
        }, { status: 500 });
    }
} 
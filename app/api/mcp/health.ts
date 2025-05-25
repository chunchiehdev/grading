import { getMCPHealthStatus } from '@/middleware/mcp.server';
import { mcpConfig } from '@/config/mcp';

/**
 * MCP Health Check API endpoint
 * GET /api/mcp/health
 * Returns current MCP server health status
 */
export async function loader() {
  try {
    const healthStatus = getMCPHealthStatus();
    
    return Response.json({
      success: true,
      data: {
        ...healthStatus,
        configuration: {
          enabled: mcpConfig.features.enabled,
          fallbackToApi: mcpConfig.features.fallbackToApi,
          gradingServerUrl: mcpConfig.gradingServer.url,
          documentServerUrl: mcpConfig.documentServer.url,
        },
      },
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 
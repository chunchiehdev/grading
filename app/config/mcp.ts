/**
 * MCP (Model Context Protocol) Configuration
 * Manages MCP server connections and settings for the grading system
 */

/**
 * MCP Server endpoints configuration
 */
export const mcpConfig = {
  // Primary MCP server for document analysis and grading
  gradingServer: {
    url: process.env.MCP_GRADING_SERVER_URL || 'http://localhost:3001/mcp',
    timeout: parseInt(process.env.MCP_TIMEOUT || '120000', 10),
    retries: parseInt(process.env.MCP_RETRIES || '3', 10),
    healthCheckInterval: parseInt(process.env.MCP_HEALTH_CHECK_INTERVAL || '30000', 10),
  },

  // Document analysis MCP server (optional separate server)
  documentServer: {
    url: process.env.MCP_DOCUMENT_SERVER_URL || process.env.MCP_GRADING_SERVER_URL || 'http://localhost:3001/mcp',
    timeout: parseInt(process.env.MCP_DOCUMENT_TIMEOUT || '60000', 10),
    retries: parseInt(process.env.MCP_DOCUMENT_RETRIES || '2', 10),
  },

  // Authentication configuration
  auth: {
    token: process.env.MCP_AUTH_TOKEN,
    apiKey: process.env.MCP_API_KEY,
  },

  // Feature flags
  features: {
    enabled: process.env.USE_MCP === 'true',
    fallbackToApi: process.env.MCP_FALLBACK_TO_API !== 'false',
    healthChecks: process.env.MCP_HEALTH_CHECKS !== 'false',
    logging: process.env.MCP_LOGGING !== 'false',
  },

  // MCP Protocol settings
  protocol: {
    version: '1.0',
    clientName: 'grading-system',
    capabilities: {
      tools: true,
      resources: true,
      prompts: false,
      sampling: false,
    },
  },
} as const;

/**
 * Validates MCP configuration
 * @returns Object with validation results
 */
export function validateMCPConfig() {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required URLs
  if (mcpConfig.features.enabled) {
    if (!mcpConfig.gradingServer.url) {
      errors.push('MCP_GRADING_SERVER_URL is required when USE_MCP is true');
    }

    if (mcpConfig.features.enabled && !mcpConfig.auth.token && !mcpConfig.auth.apiKey) {
      warnings.push('No MCP authentication token provided (MCP_AUTH_TOKEN or MCP_API_KEY)');
    }

    // Validate timeout values
    if (mcpConfig.gradingServer.timeout < 5000) {
      warnings.push('MCP timeout is very low (< 5 seconds), consider increasing it');
    }

    if (mcpConfig.gradingServer.timeout > 300000) {
      warnings.push('MCP timeout is very high (> 5 minutes), consider reducing it');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Gets MCP server URL with fallback
 * @param serverType Type of MCP server
 * @returns Server URL
 */
export function getMCPServerUrl(serverType: 'grading' | 'document' = 'grading'): string {
  const config = serverType === 'grading' ? mcpConfig.gradingServer : mcpConfig.documentServer;
  return config.url;
}

/**
 * Gets MCP authentication headers
 * @returns Headers object for MCP requests
 */
export function getMCPAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (mcpConfig.auth.token) {
    headers['Authorization'] = `Bearer ${mcpConfig.auth.token}`;
  } else if (mcpConfig.auth.apiKey) {
    headers['X-API-Key'] = mcpConfig.auth.apiKey;
  }

  return headers;
}

/**
 * Environment variables documentation for MCP setup
 */
export const mcpEnvDocs = {
  // Required for MCP
  USE_MCP: 'Enable MCP integration (true/false)',
  MCP_GRADING_SERVER_URL: 'URL of the MCP grading server',
  
  // Authentication
  MCP_AUTH_TOKEN: 'Bearer token for MCP authentication',
  MCP_API_KEY: 'API key for MCP authentication (alternative to token)',
  
  // Optional configuration
  MCP_DOCUMENT_SERVER_URL: 'URL of MCP document analysis server (defaults to grading server)',
  MCP_TIMEOUT: 'Request timeout in milliseconds (default: 120000)',
  MCP_DOCUMENT_TIMEOUT: 'Document analysis timeout in milliseconds (default: 60000)',
  MCP_RETRIES: 'Number of retry attempts (default: 3)',
  MCP_DOCUMENT_RETRIES: 'Document analysis retry attempts (default: 2)',
  MCP_FALLBACK_TO_API: 'Fallback to traditional API if MCP fails (default: true)',
  MCP_HEALTH_CHECKS: 'Enable health checks for MCP servers (default: true)',
  MCP_HEALTH_CHECK_INTERVAL: 'Health check interval in milliseconds (default: 30000)',
  MCP_LOGGING: 'Enable detailed MCP logging (default: true)',
} as const;

/**
 * Prints MCP configuration summary for debugging
 */
export function printMCPConfigSummary() {
  if (!mcpConfig.features.logging) return;

  console.log('\n🔧 MCP Configuration Summary:');
  console.log(`   Enabled: ${mcpConfig.features.enabled}`);
  console.log(`   Grading Server: ${mcpConfig.gradingServer.url}`);
  console.log(`   Document Server: ${mcpConfig.documentServer.url}`);
  console.log(`   Fallback to API: ${mcpConfig.features.fallbackToApi}`);
  console.log(`   Health Checks: ${mcpConfig.features.healthChecks}`);
  
  const validation = validateMCPConfig();
  if (validation.errors.length > 0) {
    console.log('\n❌ MCP Configuration Errors:');
    validation.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  if (validation.warnings.length > 0) {
    console.log('\n⚠️  MCP Configuration Warnings:');
    validation.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  console.log('');
} 
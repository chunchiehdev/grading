export interface VersionInfo {
  version: string;
  branch: string;
  commitHash: string;
  buildTime: string;
  environment: string;
}

export function getVersionInfo(): VersionInfo {
  let version: string;
  
  if (process.env.BUILD_VERSION) {
    // Use version from build environment (Docker build args)
    version = process.env.BUILD_VERSION;
  } else {
    // Fallback to package.json for local development
    try {
      const packageJson = require('../../package.json') as { version: string };
      version = packageJson.version;
    } catch (error) {
      version = '1.0.0';
    }
  }
  
  return {
    version,
    branch: process.env.BUILD_BRANCH || 'unknown',
    commitHash: process.env.BUILD_COMMIT || 'unknown',
    buildTime: process.env.BUILD_TIME || new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };
} 
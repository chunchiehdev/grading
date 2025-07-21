import { LoaderFunction } from 'react-router';

export const loader: LoaderFunction = async ({ request }) => {
  // Try to get version from environment first, fallback to package.json
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
  
  const versionInfo = {
    version,
    branch: process.env.BUILD_BRANCH || 'unknown',
    commitHash: process.env.BUILD_COMMIT || 'unknown',
    buildTime: process.env.BUILD_TIME || new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };

  return Response.json(versionInfo);
}; 
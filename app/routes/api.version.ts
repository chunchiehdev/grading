import { LoaderFunction } from 'react-router';

export const loader: LoaderFunction = async ({ request }) => {
  const packageJson = require('../../package.json') as { version: string };
  
  const versionInfo = {
    version: packageJson.version,
    branch: process.env.BUILD_BRANCH || 'unknown',
    commitHash: process.env.BUILD_COMMIT || 'unknown',
    buildTime: process.env.BUILD_TIME || new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };

  return Response.json(versionInfo);
}; 
import { readFileSync } from 'fs';
import { join } from 'path';

export interface VersionInfo {
  version: string;
  branch: string;
  commitHash: string;
  buildTime: string;
  environment: string;
}

export function getVersionInfo(): VersionInfo {
  const environment = process.env.NODE_ENV || 'development';

  try {
    const versionFile = join(process.cwd(), 'version.json');
    const versionData = JSON.parse(readFileSync(versionFile, 'utf-8'));

    return {
      version: versionData.version,
      branch: versionData.branch,
      commitHash: versionData.commitHash,
      buildTime: versionData.buildTime,
      environment,
    };
  } catch (error) {
    try {
      const packageJson = require('../../package.json') as { version: string };
      return {
        version: packageJson.version,
        branch: 'local',
        commitHash: 'dev',
        buildTime: new Date().toISOString(),
        environment,
      };
    } catch {
      return {
        version: '1.0.0',
        branch: 'unknown',
        commitHash: 'unknown',
        buildTime: new Date().toISOString(),
        environment,
      };
    }
  }
}

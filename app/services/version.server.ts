import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export interface VersionInfo {
  version: string;
  branch: string;
  commitHash: string;
  buildTime: string;
  environment: string;
}

function getGitInfo(): { branch: string; commitHash: string } {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    return { branch, commitHash };
  } catch {
    return { branch: 'local', commitHash: 'dev' };
  }
}

function createVersionFile(versionInfo: Omit<VersionInfo, 'environment'>): void {
  try {
    const versionFile = join(process.cwd(), 'version.json');
    writeFileSync(versionFile, JSON.stringify(versionInfo, null, 2));
  } catch (error) {
    console.warn('Failed to write version.json:', error);
  }
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
      const gitInfo = getGitInfo();
      const versionInfo = {
        version: packageJson.version,
        branch: gitInfo.branch,
        commitHash: gitInfo.commitHash,
        buildTime: new Date().toISOString(),
      };

      if (environment === 'development') {
        createVersionFile(versionInfo);
      }

      return {
        ...versionInfo,
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

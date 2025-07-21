import { useState, useEffect } from 'react';

interface VersionInfo {
  version: string;
  branch: string;
  commitHash: string;
  buildTime: string;
  environment: string;
}

const Badge = ({ children, variant = 'default', className = '' }: { 
  children: React.ReactNode; 
  variant?: 'default' | 'outline' | 'secondary'; 
  className?: string; 
}) => {
  const baseClasses = 'inline-flex items-center px-2 py-1 rounded text-xs font-medium';
  const variantClasses = {
    default: 'bg-blue-100 text-blue-800 border border-blue-200',
    outline: 'bg-white text-gray-700 border border-gray-300',
    secondary: 'bg-gray-100 text-gray-700 border border-gray-200'
  };
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

export function VersionInfo() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    // 從 package.json 或環境變數獲取版本信息
    const getVersionInfo = async () => {
      try {
        const response = await fetch('/api/version');
        const data = await response.json();
        setVersionInfo(data);
      } catch (error) {
        console.error('Failed to fetch version info:', error);
        // Fallback to static version
        setVersionInfo({
          version: '1.0.0',
          branch: 'unknown',
          commitHash: 'unknown',
          buildTime: new Date().toISOString(),
          environment: 'development'
        });
      }
    };

    getVersionInfo();
  }, []);

  if (!versionInfo) return null;

  const isProduction = versionInfo.branch === 'master';
  const isDevelopment = versionInfo.branch === 'development';
  const isPrerelease = versionInfo.version.includes('-dev.');
  
  // Extract version parts for prerelease
  const versionDisplay = isPrerelease 
    ? versionInfo.version.split('-dev.')[0] + '-DEV'
    : versionInfo.version;
    
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Badge variant="outline" className={isPrerelease ? 'border-orange-300' : ''}>
        v{versionDisplay}
      </Badge>
      <Badge 
        variant={isProduction ? 'default' : 'secondary'}
        className={
          isProduction 
            ? 'bg-green-100 text-green-800 border-green-200' 
            : isDevelopment
            ? isPrerelease 
              ? 'bg-orange-100 text-orange-800 border-orange-200 animate-pulse'
              : 'bg-orange-100 text-orange-800 border-orange-200'
            : 'bg-gray-100 text-gray-700 border-gray-200'
        }
      >
        {isProduction ? 'PROD' : isDevelopment ? 'DEV' : versionInfo.branch}
      </Badge>
      <span className="text-xs opacity-70" title={`Commit: ${versionInfo.commitHash}`}>
        {versionInfo.commitHash.substring(0, 7)}
      </span>
      {isPrerelease && (
        <span className="text-xs text-orange-600 font-medium">
          PRERELEASE
        </span>
      )}
      {versionInfo.environment && (
        <span className="text-xs opacity-50">
          {versionInfo.environment}
        </span>
      )}
    </div>
  );
}

export function FooterVersion() {
  return (
    <footer className="border-t bg-white">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            © 2025 GradSystem. All rights reserved.
          </p>
          <VersionInfo />
        </div>
      </div>
    </footer>
  );
} 
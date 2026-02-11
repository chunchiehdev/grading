import { S3ClientConfig } from '@aws-sdk/client-s3';

export const storageConfig = {
  s3Config: {
    endpoint: `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    },
    forcePathStyle: true,
  } as S3ClientConfig,

  bucket: process.env.MINIO_BUCKET || 'grading-files',

  // Generate API proxy URL for browser access (works in all environments)
  getFileUrl: (key: string) => `/api/files/${encodeURIComponent(key)}`,

  signedUrlExpireTime: 900,
};

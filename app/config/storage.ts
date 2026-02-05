import { S3ClientConfig } from '@aws-sdk/client-s3';

// Internal endpoint for server-to-MinIO communication
const internalEndpoint = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`;

// Auto-detect public endpoint: if internal is Docker hostname, use localhost for browser access
// In k8s/k3s, MINIO_ENDPOINT would typically be a publicly accessible service name or IP
const isDockerInternal = process.env.MINIO_ENDPOINT === 'minio';
const publicHost = isDockerInternal ? 'localhost' : process.env.MINIO_ENDPOINT;
const publicEndpoint = `http://${publicHost}:${process.env.MINIO_PORT}`;

export const storageConfig = {
  s3Config: {
    endpoint: internalEndpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    },
    forcePathStyle: true,
  } as S3ClientConfig,

  // Public-facing S3 config for generating browser-accessible presigned URLs
  publicS3Config: {
    endpoint: publicEndpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    },
    forcePathStyle: true,
  } as S3ClientConfig,

  bucket: process.env.MINIO_BUCKET || 'grading-files',

  getFileUrl: (key: string) => {
    return `${publicEndpoint}/${process.env.MINIO_BUCKET || 'grading-files'}/${key}`;
  },

  signedUrlExpireTime: 900,
};

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { storageConfig } from '@/config/storage';

/**
 * AWS S3 client instance configured with storage settings
 */
export const s3Client = new S3Client(storageConfig.s3Config);

/**
 * Uploads file data to S3-compatible storage
 * @param {Buffer|Readable} fileData - File content as Buffer or Readable stream
 * @param {string} key - Storage key/path for the file
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<Object>} Upload result with success status, key, URL, and ETag
 */
export async function uploadToStorage(fileData: Buffer | Readable, key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: storageConfig.bucket,
    Key: key,
    Body: fileData,
    ContentType: contentType,
  });

  const response = await s3Client.send(command);

  return {
    success: true,
    key,
    url: storageConfig.getFileUrl(key),
    etag: response.ETag,
  };
}

/**
 * Generates a pre-signed URL for secure file access
 * @param {string} key - Storage key/path of the file
 * @returns {Promise<string>} Pre-signed URL valid for configured duration
 */
export async function getSignedFileUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: storageConfig.bucket,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: storageConfig.signedUrlExpireTime,
  });

  return signedUrl;
}

/**
 * Ensures the configured storage bucket exists, creates it if missing
 * @returns {Promise<void>}
 */
export async function ensureBucketExists() {
  try {
    const { ListBucketsCommand, CreateBucketCommand } = await import('@aws-sdk/client-s3');

    const listCommand = new ListBucketsCommand({});
    const { Buckets } = await s3Client.send(listCommand);

    const bucketExists = Buckets?.some((bucket) => bucket.Name === storageConfig.bucket);

    if (!bucketExists) {
      const createCommand = new CreateBucketCommand({
        Bucket: storageConfig.bucket,
      });
      await s3Client.send(createCommand);
      console.log(`儲存桶 ${storageConfig.bucket} 已創建`);
    }
  } catch (error) {
    console.error('檢查/創建儲存桶失敗:', error);
  }
}

/**
 * Deletes a file from storage using its key
 * @param {string} key - Storage key/path of the file to delete
 * @returns {Promise<Object>} Deletion result with success status
 */
export async function deleteFromStorage(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: storageConfig.bucket,
    Key: key,
  });

  await s3Client.send(command);

  return { success: true };
}

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

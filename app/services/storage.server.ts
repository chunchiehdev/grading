import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import { storageConfig } from "@/config/storage";

const s3Client = new S3Client(storageConfig.s3Config);

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

export async function ensureBucketExists() {
  try {
    const { ListBucketsCommand, CreateBucketCommand } = await import("@aws-sdk/client-s3");
    
    const listCommand = new ListBucketsCommand({});
    const { Buckets } = await s3Client.send(listCommand);
    
    const bucketExists = Buckets?.some(bucket => bucket.Name === storageConfig.bucket);
    
    if (!bucketExists) {
      const createCommand = new CreateBucketCommand({
        Bucket: storageConfig.bucket,
      });
      await s3Client.send(createCommand);
      console.log(`儲存桶 ${storageConfig.bucket} 已創建`);
    }
  } catch (error) {
    console.error("檢查/創建儲存桶失敗:", error);
  }
}
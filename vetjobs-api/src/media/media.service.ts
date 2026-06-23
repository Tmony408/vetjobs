import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

// Issues short-lived presigned URLs so the browser uploads files DIRECTLY to S3
// (the file never passes through this server). The frontend then stores the
// returned `publicUrl`/`key` (e.g. on a role's CV).
@Injectable()
export class MediaService {
  // Works with AWS S3 or any S3-compatible store (Cloudflare R2, Supabase, etc.)
  // by setting S3_ENDPOINT.
  private s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    ...(process.env.S3_ENDPOINT
      ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' }
      : {}),
  });

  async uploadUrl(fileName: string, contentType: string, userId: string) {
    const bucket = process.env.S3_BUCKET;
    const safe = (fileName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `cv/${userId}/${randomUUID()}-${safe}`;
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    });
    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: 300 }); // 5 min
    const base =
      process.env.S3_PUBLIC_BASE_URL ||
      `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;
    const publicUrl = `${base.replace(/\/$/, '')}/${key}`;
    return { uploadUrl, key, publicUrl };
  }
}

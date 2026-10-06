import { verifyPublicImage } from '../../../packages/server-media/delivery.cjs';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { AppError } from '../lib/errors.js';
import { MediaError, r2Config } from '../../../packages/server-media/policy.cjs';
import { uploadPublicImage } from '../../../packages/server-media/upload.cjs';
import { supabase } from '../db/supabase.js';

let client: S3Client | undefined;
// Public-bucket reads only. The recovery route never accepts a bucket or URL.
export async function readPublicImage(key: string, signal: AbortSignal) {
  const storage = transportForUpload();
  return storage.client.send(new GetObjectCommand({ Bucket: storage.config.bucket, Key: key }), { abortSignal: signal });
}
function transportForUpload() {
  const config = r2Config(process.env);
  client ??= new S3Client({ region: 'auto', endpoint: config.endpoint, forcePathStyle: true,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }, maxAttempts: 2,
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
    requestHandler: { connectionTimeout: 3000, requestTimeout: 15000 } });
  return { config, client };
}
export async function removePublicImage(bucket: string, key: string) {
  const storage = transportForUpload();
  if (bucket !== storage.config.bucket) throw new Error('Unexpected media bucket');
  await storage.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
export async function storePublicImage(input: Parameters<typeof uploadPublicImage>[1]) {
  try {
    const { config, client: transport } = transportForUpload();
    return await uploadPublicImage({ config, db: supabase, verifyDelivery: verifyPublicImage,
      put: async (Key, Body) => { await transport.send(new PutObjectCommand({ Bucket: config.bucket, Key, Body, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' })); },
      remove: async Key => { await transport.send(new DeleteObjectCommand({ Bucket: config.bucket, Key })); },
    }, input);
  } catch (error) {
    if (error instanceof MediaError) throw new AppError(error.status, error.code, error.message);
    throw new AppError(503, 'MEDIA_UPLOAD_FAILED', 'Image could not be stored. Please retry.');
  }
}

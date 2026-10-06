import { verifyPublicImage } from '../../../../../packages/server-media/delivery.cjs';
import 'server-only';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Config } from '../../../../../packages/server-media/policy.cjs';
import { uploadPublicImage } from '../../../../../packages/server-media/upload.cjs';
import { supabaseAdmin } from '@/lib/supabase/admin';

let client: S3Client | undefined;
export function storePublicImage(input: Parameters<typeof uploadPublicImage>[1]) {
  const config = r2Config(process.env);
  client ??= new S3Client({ region: 'auto', endpoint: config.endpoint, forcePathStyle: true,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }, maxAttempts: 2,
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
    requestHandler: { connectionTimeout: 3000, requestTimeout: 15000 } });
  const transport = client;
  return uploadPublicImage({ config, db: supabaseAdmin, verifyDelivery: verifyPublicImage,
    put: async (Key, Body) => { await transport.send(new PutObjectCommand({ Bucket: config.bucket, Key, Body, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' })); },
    remove: async Key => { await transport.send(new DeleteObjectCommand({ Bucket: config.bucket, Key })); },
  }, input);
}

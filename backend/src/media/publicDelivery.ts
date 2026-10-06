import { Router } from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { PUBLIC_FOLDERS } from '../../../packages/server-media/policy.cjs';
import { concurrentAdmission } from '../security/admission.js';
import { AppError } from '../lib/errors.js';
import { readPublicImage } from './publicImages.js';

export function publicObjectKey(folder: string, file: string): string {
  if (!PUBLIC_FOLDERS.some(allowed => allowed === folder) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i.test(file))
    throw new AppError(404, 'IMAGE_NOT_FOUND', 'Image unavailable.');
  return `${folder}/${file}`;
}

// Recovery only: normal image traffic continues directly through Cloudflare.
// Stream bytes without a DB read, upload, transformation or whole-file buffer.
export const publicDeliveryRouter = Router();
publicDeliveryRouter.get('/:folder/:file', concurrentAdmission(24), async (req, res, next) => {
  const controller = new AbortController();
  const abort = () => { if (!res.writableFinished) controller.abort(); };
  const timeout = setTimeout(() => controller.abort(), 15_000);
  timeout.unref();
  res.once('close', abort);
  try {
    const key = publicObjectKey(req.params.folder!, req.params.file!);
    const image = await readPublicImage(key, controller.signal);
    if (!image.Body || image.ContentType !== 'image/webp' || !image.ContentLength || image.ContentLength < 0 || image.ContentLength > 10 * 1024 * 1024) {
      (image.Body as Readable | undefined)?.destroy?.();
      throw new AppError(404, 'IMAGE_NOT_FOUND', 'Image unavailable.');
    }
    res.set({ 'Content-Type': 'image/webp', 'Content-Length': String(image.ContentLength),
      'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
    await pipeline(image.Body as Readable, res, { signal: controller.signal });
  } catch (error) {
    if (res.headersSent) res.destroy();
    else if (!res.destroyed) {
      const missing = error && typeof error === 'object' && 'name' in error && error.name === 'NoSuchKey';
      next(error instanceof AppError ? error : new AppError(missing ? 404 : 503,
        missing ? 'IMAGE_NOT_FOUND' : 'IMAGE_UNAVAILABLE', 'Image unavailable. Please retry.'));
    }
  } finally {
    clearTimeout(timeout);
    res.off('close', abort);
  }
});

import sharp from 'sharp';
import { AppError } from '../lib/errors.js';
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;
let processing = 0;

export function decodeImage(base64: unknown): Buffer {
  if (typeof base64 !== 'string' || !base64.length || base64.length > Math.ceil(MAX_BYTES / 3) * 4)
    throw new AppError(413, 'IMAGE_TOO_LARGE', 'Choose an image smaller than 4 MB.');
  if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64))
    throw new AppError(400, 'INVALID_IMAGE', 'Choose a valid image.');
  const decoded = Buffer.from(base64, 'base64');
  if (!decoded.length || decoded.length > MAX_BYTES || decoded.toString('base64') !== base64)
    throw new AppError(400, 'INVALID_IMAGE', 'Choose a valid image.');
  return decoded;
}
export async function normalizeImage(input: Buffer, format: 'webp' | 'jpeg'): Promise<Buffer> {
  if (!input.length || input.length > MAX_BYTES) throw new AppError(413, 'IMAGE_TOO_LARGE', 'Choose an image smaller than 4 MB.');
  if (processing >= 2) throw new AppError(503, 'IMAGE_PROCESSING_BUSY', 'Please retry the image upload shortly.');
  processing++;
  try {
    const image = sharp(input, { limitInputPixels: MAX_PIXELS, animated: false, failOn: 'warning' }).timeout({ seconds: 8 });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp', 'heif'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1)
      throw new AppError(400, 'INVALID_IMAGE', 'Choose a JPG, PNG or WebP photo.');
    image.rotate().resize(format === 'jpeg' ? 1600 : 800, format === 'jpeg' ? 1600 : 800, { fit: 'inside', withoutEnlargement: true });
    // Re-encoding strips metadata; documents stay private and retain legibility.
    return await (format === 'webp' ? image.webp({ quality: 80 }) : image.jpeg({ quality: 85 })).toBuffer();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, 'INVALID_IMAGE', 'The image could not be processed. Choose another photo.');
  } finally { processing--; }
}
export const toWebp = (input: Buffer) => normalizeImage(input, 'webp');

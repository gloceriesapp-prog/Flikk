export const PRODUCT_PHOTO_WIDTH = 1440;
export const PRODUCT_PHOTO_HEIGHT = 1620;
const RATIO = PRODUCT_PHOTO_WIDTH / PRODUCT_PHOTO_HEIGHT;

export type PhotoCrop = { mode: 'fill' | 'original'; x: number; y: number; zoom: number };
export const DEFAULT_PHOTO_CROP: PhotoCrop = { mode: 'fill', x: 50, y: 50, zoom: 1 };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

/** Source rectangle, shared by the preview and exported file. Never stretches. */
export function productPhotoCropRect(width: number, height: number, crop: PhotoCrop) {
  if (!(width > 0 && height > 0)) throw new Error('This image has no readable dimensions.');
  const zoom = clamp(crop.zoom, 1, 3);
  const cropWidth = Math.min(width, height * RATIO) / zoom;
  const cropHeight = cropWidth / RATIO;
  return {
    x: (width - cropWidth) * clamp(crop.x, 0, 100) / 100,
    y: (height - cropHeight) * clamp(crop.y, 0, 100) / 100,
    width: cropWidth,
    height: cropHeight,
  };
}

export async function cropProductPhoto(file: File, crop: PhotoCrop, signal?: AbortSignal): Promise<File> {
  signal?.throwIfAborted();
  if (crop.mode === 'original') return file;
  const url = URL.createObjectURL(file);
  const image = new Image();
  const canvas = document.createElement('canvas');
  try {
    image.src = url;
    await image.decode();
    signal?.throwIfAborted();
    const rect = productPhotoCropRect(image.naturalWidth, image.naturalHeight, crop);
    canvas.width = PRODUCT_PHOTO_WIDTH;
    canvas.height = PRODUCT_PHOTO_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image editing is unavailable in this browser.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
    // PNG retains transparency; opaque photography uses high-quality WebP.
    const type = file.type === 'image/png' ? 'image/png' : 'image/webp';
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, 0.95));
    signal?.throwIfAborted();
    if (!blob) throw new Error('Could not crop this photo. Try keeping the original.');
    const extension = blob.type === 'image/png' ? 'png' : 'webp';
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-card.${extension}`, { type: blob.type });
  } finally {
    URL.revokeObjectURL(url);
    canvas.width = canvas.height = 0;
  }
}

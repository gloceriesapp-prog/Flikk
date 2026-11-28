import { MAX_EXTRA_IMAGES } from './productValidation';
import { prepareAdminImage } from './prepareAdminImage';

export type UploadedPhoto = { url: string; bgColor: string | null; warning?: string; originalUrl?: string };

export async function uploadPhoto(file: File, bucket: string, signal?: AbortSignal): Promise<UploadedPhoto> {
  signal?.throwIfAborted();
  const prepared = await prepareAdminImage(file);
  signal?.throwIfAborted();
  const formData = new FormData();
  formData.append('file', prepared);
  formData.append('bucket', bucket);
  const response = await fetch('/api/upload', { method: 'POST', body: formData, signal });
  const body = await response.json().catch(() => null);
  if (!response.ok || typeof body?.url !== 'string') {
    throw new Error(body?.error ?? 'Upload failed. Try again.');
  }
  return { url: body.url, bgColor: body.bgColor ?? null, ...(typeof body.originalUrl === 'string' ? { originalUrl: body.originalUrl } : {}), ...(typeof body.warning === 'string' ? { warning: body.warning } : {}) };
}

export function originalProductPhoto(photo: UploadedPhoto): UploadedPhoto {
  if (!photo.originalUrl) throw new Error('The original photo could not be retained. Upload it again before choosing None.');
  return { ...photo, url: photo.originalUrl, bgColor: null };
}

export function appendProductPhotos(
  current: { imageUrl?: string; extraImageUrls?: string[] },
  photos: UploadedPhoto[],
  replaceCover = false,
) {
  const cover = replaceCover || !current.imageUrl ? photos[0] : undefined;
  const imageUrl = cover?.url ?? current.imageUrl;
  const uploadedUrls = photos.map((photo) => photo.url);
  const existingUrls = current.extraImageUrls ?? [];
  const orderedUrls = replaceCover ? [...uploadedUrls, ...existingUrls] : [...existingUrls, ...uploadedUrls];
  return {
    imageUrl,
    extraImageUrls: [...new Set(orderedUrls)]
      .filter((url) => url !== imageUrl)
      .slice(0, MAX_EXTRA_IMAGES),
    ...(cover ? { bgColor: cover.bgColor ?? undefined } : {}),
  };
}

export function swapFirstGalleryPhoto(current: { imageUrl?: string; extraImageUrls?: string[] }) {
  const [first, ...rest] = current.extraImageUrls ?? [];
  if (!first || !current.imageUrl) return null;
  return { imageUrl: first, extraImageUrls: [current.imageUrl, ...rest] };
}

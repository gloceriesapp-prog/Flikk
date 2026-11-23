const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Leave room for the multipart form beneath the Vercel request limit.
const UPLOAD_BYTES = 4 * 1024 * 1024;
const UPLOAD_PIXELS = 20_000_000;
const MAX_CANVAS_EDGE = 4096;

function encode(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

function uploadFile(blob: Blob, original: File) {
  const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp';
  return new File([blob], `${original.name.replace(/\.[^.]+$/, '')}.${extension}`, { type: blob.type });
}

export async function prepareAdminImage(file: File): Promise<File> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('Choose a JPG, PNG or WebP image.');

  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (file.size <= UPLOAD_BYTES && width * height <= UPLOAD_PIXELS) return file;

    const canvas = document.createElement('canvas');
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');

      let scale = Math.min(1, MAX_CANVAS_EDGE / Math.max(width, height));
      for (let attempt = 0; attempt < 5; attempt++) {
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        if (attempt === 0 && file.type === 'image/png') {
          const lossless = await encode(canvas, 'image/png');
          if (lossless && lossless.size <= UPLOAD_BYTES) return uploadFile(lossless, file);
        }

        let smallestBytes = Infinity;
        for (const quality of attempt === 0 ? [0.96, 0.92] : [0.92]) {
          const webp = await encode(canvas, 'image/webp', quality);
          // Browsers without WebP encoding fall back to PNG. Keep that
          // transparency for graphics, and offer JPEG for opaque photos.
          const output = webp?.type !== 'image/webp' && file.type === 'image/jpeg'
            ? await encode(canvas, 'image/jpeg', quality)
            : webp;
          if (output && output.size <= UPLOAD_BYTES) return uploadFile(output, file);
          if (output) smallestBytes = Math.min(smallestBytes, output.size);
        }
        // Encoded size roughly follows pixel area. A file just above the
        // limit should need only a small reduction in width and height.
        scale *= Math.max(0.7, Math.min(0.95, Math.sqrt(UPLOAD_BYTES / smallestBytes) * 0.97));
      }
    } finally {
      canvas.width = canvas.height = 0;
    }
  } catch {
    throw new Error('Could not prepare this image. Try another JPG, PNG or WebP file.');
  } finally {
    URL.revokeObjectURL(url);
  }
  throw new Error('This image is still too large after compression. Choose a smaller image.');
}

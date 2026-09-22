// Adaptive compress-to-target for a picked photo — copied as-is from
// apps/partner/src/media/compressImage.ts (same needs, no shared package
// yet per CLAUDE.md's "no premature abstraction" rule). Only compresses
// when the image is actually over the size limit; shrinks dimensions
// before touching JPEG quality, since a modern phone camera photo is far
// larger than anything this app uploads/displays, so downscaling is a
// "free" size win and quality reduction is the last resort.
//
// No expo-file-system needed — base64.length * 0.75 is an accurate-enough
// byte-size estimate (base64 encodes 3 bytes as 4 characters).

import * as ImageManipulator from 'expo-image-manipulator';

// Comfortably under the backend's 10mb JSON body limit (base64 inflates
// raw bytes by ~33%) — an ID-document photo needs to stay legible for
// admin review, so this ceiling is generous. See backend/src/index.ts.
const TARGET_BYTES = 1_500_000;

// Plenty for a legible Aadhaar/DL scan on any review screen.
const MAX_DIMENSION = 1600;

function estimateBytes(base64: string): number {
  return base64.length * 0.75;
}

export interface CompressedImage {
  uri: string;
  base64: string;
}

// `originalBase64` is what ImagePicker already returned (quality: 1, no
// resize) — reused directly when already under target, so a small photo
// never gets needlessly re-encoded.
export async function compressImageToTarget(uri: string, originalBase64: string): Promise<CompressedImage> {
  if (estimateBytes(originalBase64) <= TARGET_BYTES) {
    return { uri, base64: originalBase64 };
  }

  let result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: MAX_DIMENSION } }], {
    compress: 0.85,
    base64: true,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  if (estimateBytes(result.base64!) <= TARGET_BYTES) {
    return { uri: result.uri, base64: result.base64! };
  }

  result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: MAX_DIMENSION } }], {
    compress: 0.65,
    base64: true,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  if (estimateBytes(result.base64!) <= TARGET_BYTES) {
    return { uri: result.uri, base64: result.base64! };
  }

  // Rare last resort — a busy/high-detail scan. Whatever comes out is used
  // regardless: three passes is enough restraint, not an unbounded loop.
  result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], {
    compress: 0.6,
    base64: true,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: result.uri, base64: result.base64! };
}

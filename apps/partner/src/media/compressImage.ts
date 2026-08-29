// Adaptive compress-to-target for a picked photo — per an explicit ask:
// only compress when the image is actually over the size limit, and when
// it is, shrink dimensions before touching JPEG quality. A modern phone
// camera photo (often 3000-4000px wide) is far larger than anything this
// app ever displays it at, so downscaling the resolution is a "free" size
// win with no visible clarity loss — cutting JPEG quality is the thing
// that actually looks worse, so it's the last resort, not the first.
//
// No expo-file-system dependency needed — base64.length * 0.75 is an
// accurate-enough byte-size estimate (base64 encodes 3 bytes as 4
// characters), so every size check here just reads the string already in
// memory from ImagePicker/ImageManipulator's own base64 output.

import * as ImageManipulator from 'expo-image-manipulator';

// Comfortably under the backend's 10mb JSON body limit (base64 inflates
// the raw bytes by ~33%) while still generous for a storefront photo — see
// backend/src/index.ts's own note on that limit.
const TARGET_BYTES = 1_500_000;

// Nothing displays a storefront photo anywhere near full camera
// resolution — this is plenty for every card/detail view in the app.
const MAX_DIMENSION = 1600;

function estimateBytes(base64: string): number {
  return base64.length * 0.75;
}

export interface CompressedImage {
  uri: string;
  base64: string;
}

// `originalBase64` is what ImagePicker already returned (quality: 1, no
// resize) — reused directly when it's already under target, so a small
// photo never gets needlessly re-encoded and loses nothing.
export async function compressImageToTarget(uri: string, originalBase64: string): Promise<CompressedImage> {
  if (estimateBytes(originalBase64) <= TARGET_BYTES) {
    return { uri, base64: originalBase64 };
  }

  // Pass 1: cap the resolution, keep quality high — this alone closes
  // most of the gap for a typical oversized camera photo.
  let result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: MAX_DIMENSION } }], {
    compress: 0.85,
    base64: true,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  if (estimateBytes(result.base64!) <= TARGET_BYTES) {
    return { uri: result.uri, base64: result.base64! };
  }

  // Pass 2: same resolution, quality stepped down — still well above the
  // point where compression artifacts become visible on a phone screen.
  result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: MAX_DIMENSION } }], {
    compress: 0.65,
    base64: true,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  if (estimateBytes(result.base64!) <= TARGET_BYTES) {
    return { uri: result.uri, base64: result.base64! };
  }

  // Pass 3 (rare — an unusually busy/high-detail photo): smaller
  // resolution too. Whatever comes out of this is used regardless of
  // whether it hits target — three passes is enough restraint, not an
  // unbounded loop chasing a number.
  result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], {
    compress: 0.6,
    base64: true,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: result.uri, base64: result.base64! };
}

// Resize-first compression for a picked photo. #23: the picker now hands us a
// file URI WITHOUT base64 — a 12MP camera shot is multiple MB, and
// materializing its base64 in JS *before* shrinking was the hot-path cost that
// froze the UI. So we resize/re-encode first and produce base64 only from the
// already-small JPEG.
//
// A modern phone photo (3000-4000px wide) is far larger than anything this app
// ever displays, so capping the resolution is a "free" size win with no visible
// clarity loss. We only resize when the source is actually wider than
// MAX_DIMENSION (resizing a smaller image would upscale it — bigger file, no
// benefit); either way the output is re-encoded JPEG at a high quality.
//
// NOTE (deviation from the #23 brief): the brief asked for a multipart file
// upload. The backend's /partner/product-photo endpoint only accepts
// application/json with a `base64` field (backend/src/security/parsers.ts
// returns 415 for anything else) and is out of scope to change, so we keep the
// JSON+base64 contract — but the base64 is now of the SMALL resized image, not
// the raw 12MP capture, which is the actual performance win here.

import * as ImageManipulator from 'expo-image-manipulator';

// Nothing displays a storefront photo anywhere near full camera resolution —
// this is plenty for every card/detail view in the app, and keeps the encoded
// base64 comfortably under the backend's 6mb JSON body limit.
const MAX_DIMENSION = 1600;

export interface CompressedImage {
  uri: string;
  base64: string;
}

// `sourceWidth` is ImagePicker's reported asset width (so we never upscale a
// photo that's already small). When unknown, we resize anyway — a gallery photo
// is almost always oversized.
export async function compressImageToTarget(uri: string, sourceWidth?: number): Promise<CompressedImage> {
  const operations =
    sourceWidth == null || sourceWidth > MAX_DIMENSION ? [{ resize: { width: MAX_DIMENSION } }] : [];

  const result = await ImageManipulator.manipulateAsync(uri, operations, {
    compress: 0.8,
    base64: true,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return { uri: result.uri, base64: result.base64! };
}

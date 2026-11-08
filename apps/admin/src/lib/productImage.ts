// Product photos use a 720x810 frame without generated coloured borders.
// Prepared 8:9 artwork keeps its composition. Other photos lose plain outer
// borders first; then a photo close to the card's shape fills the card edge to
// edge (centre-cropping at most a sliver), and anything else fits whole with
// transparent gaps, so no colour band is ever baked in.
import sharp from 'sharp';

export const PRODUCT_IMAGE_WIDTH = 720;
export const PRODUCT_IMAGE_HEIGHT = 810;
const CARD_RATIO = PRODUCT_IMAGE_WIDTH / PRODUCT_IMAGE_HEIGHT;
// Fill the card when the photo's shape is within 20% of 8:9: a square photo
// loses ~6% on each side; a much wider or taller one is shown whole instead.
export const FILL_MAX_RATIO_GAP = 0.2;

const open = (input: Buffer) =>
  sharp(input, { limitInputPixels: 20_000_000, animated: false, failOn: 'warning' }).timeout({ seconds: 8 }).rotate();

// A whole scene photo (fill it), not a product cut out on a plain background
// (never crop that): what is left after trimming still spans most of the
// original, and its corners are photo, not the background that was trimmed.
// ponytail: corner/coverage heuristic; a box shot edge-to-edge on white may
// still count as a scene. Swap for a saliency check if that shows up.
async function isScenePhoto(original: Buffer, trimmed: Buffer, info: { width: number; height: number }): Promise<boolean> {
  const full = await open(original).metadata();
  const fullWidth = (full.orientation ?? 1) >= 5 ? full.height! : full.width!;
  const fullHeight = (full.orientation ?? 1) >= 5 ? full.width! : full.height!;
  if (info.width < fullWidth * 0.7 || info.height < fullHeight * 0.7) return false;
  const [bg, trimmedPx] = await Promise.all([
    open(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  const background = [...bg.data.subarray(0, 4)];
  const at = (x: number, y: number) => [...trimmedPx.data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)];
  // A little inside the corners: a trim can leave a 1–2px line of the band.
  const dx = Math.max(2, Math.round(info.width * 0.04));
  const dy = Math.max(2, Math.round(info.height * 0.04));
  const corners = [at(dx, dy), at(info.width - 1 - dx, dy), at(dx, info.height - 1 - dy), at(info.width - 1 - dx, info.height - 1 - dy)];
  const isBackground = (p: number[]) => p[3] < 200 || Math.abs(p[0] - background[0]) + Math.abs(p[1] - background[1]) + Math.abs(p[2] - background[2]) < 45;
  return corners.filter(isBackground).length <= 1;
}

async function hasPlainLightEdge(input: Buffer): Promise<boolean> {
  const { data } = await open(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data[3] < 200 || (data[0] > 235 && data[1] > 235 && data[2] > 235);
}

// removeBand: also clean an image that is already 720x810 but has a solid
// band baked in (photos saved by an older upload step).
export async function fitProductImage(input: Buffer, options: { removeBand?: boolean } = {}): Promise<Buffer> {
  const metadata = await open(input).metadata();
  // Metadata dimensions precede EXIF rotation. Check the displayed dimensions.
  const swapAxes = metadata.orientation != null && metadata.orientation >= 5;
  const width = swapAxes ? metadata.height : metadata.width;
  const height = swapAxes ? metadata.width : metadata.height;
  if (!options.removeBand && width && height && width * PRODUCT_IMAGE_HEIGHT === height * PRODUCT_IMAGE_WIDTH) {
    // Canva exports already define their margins. Preserve those pixels.
    return open(input).resize(PRODUCT_IMAGE_WIDTH, PRODUCT_IMAGE_HEIGHT).webp({ quality: 82 }).toBuffer();
  }
  // Plain outer border (a solid band or empty margin) off first. A single
  // colour image has nothing to trim, so it is used as it is.
  const trimmed = await open(input).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true })
    .catch(() => open(input).toBuffer({ resolveWithObject: true }));
  const fill = await isScenePhoto(input, trimmed.data, trimmed.info)
    && Math.abs(trimmed.info.width / trimmed.info.height - CARD_RATIO) / CARD_RATIO <= FILL_MAX_RATIO_GAP;
  // Shown whole: a white or clear margin is trimmed so the product shows
  // larger; a coloured studio background is part of the photo, so it is kept
  // (trimming it cut it unevenly into a thin strip).
  const source = fill || await hasPlainLightEdge(input) ? trimmed.data : await open(input).toBuffer();
  return sharp(source)
    .resize(PRODUCT_IMAGE_WIDTH, PRODUCT_IMAGE_HEIGHT, fill
      ? { fit: 'cover', position: 'centre' }
      : { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 82 })
    .toBuffer();
}

// For photos saved before this logic: a solid band of one colour at least
// 12px thick on two opposite edges.
async function hasSolidBand(input: Buffer): Promise<boolean> {
  const { data, info } = await open(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const base = data.subarray(0, 4);
  const same = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return data[i + 3] > 240 && Math.abs(data[i] - base[0]) + Math.abs(data[i + 1] - base[1]) + Math.abs(data[i + 2] - base[2]) < 30;
  };
  const columnsSolid = (xs: number[]) => xs.every((x) => { for (let y = 0; y < height; y += 6) if (!same(x, y)) return false; return true; });
  const rowsSolid = (ys: number[]) => ys.every((y) => { for (let x = 0; x < width; x += 6) if (!same(x, y)) return false; return true; });
  const edge = (n: number) => Array.from({ length: 12 }, (_, i) => i).map((i) => [i, n - 1 - i]).flat();
  return columnsSolid(edge(width)) || rowsSolid(edge(height));
}

// The cleaned photo when an existing one has a baked-in band that the logic
// above actually removes (scene photo filled, or a white margin trimmed);
// null when there is nothing to fix, so good photos are never re-saved.
export async function cleanBandedPhoto(input: Buffer): Promise<Buffer | null> {
  if (!(await hasSolidBand(input))) return null;
  const trimmed = await open(input).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true }).catch(() => null);
  if (!trimmed) return null;
  const fill = await isScenePhoto(input, trimmed.data, trimmed.info)
    && Math.abs(trimmed.info.width / trimmed.info.height - CARD_RATIO) / CARD_RATIO <= FILL_MAX_RATIO_GAP;
  if (!fill && !(await hasPlainLightEdge(input))) return null;
  return fitProductImage(input, { removeBand: true });
}

// Product-photo -> pastel card background. Real photos are shot against
// whatever surface a store owner had handy (a kitchen counter, a phone
// screen) — extracting a color and forcing it into a narrow pastel band
// gives every card a consistent, branded backdrop instead of either a flat
// white box or the photo's own often-messy real background bleeding into
// the UI. Runs once, at upload time, in app/api/upload/route.ts — never at
// render time (see ProductImageUpload.tsx and Product.bgColor's own notes).
//
// Fallback chain (this function only covers the first three steps; the
// category-tint and neutral-mist steps are the caller's job — see
// lib/productValidation.ts toProductRow, the one place that always runs
// for every product write regardless of which route called it):
//   1. LightVibrant swatch from the image
//   2. Vibrant swatch if LightVibrant is missing
//   3. Muted swatch if both are missing
//   4. Category-tint table (CATEGORY_TINT_MAP) if extraction fails entirely
//   5. Neutral mist as the absolute last resort

import { Vibrant } from 'node-vibrant/node';

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  return [h / 6, s, l];
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToHex(h: number, s: number, l: number): string {
  if (s === 0) {
    const v = Math.round(l * 255);
    return `#${[v, v, v].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hueToRgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hueToRgb(p, q, h) * 255);
  const b = Math.round(hueToRgb(p, q, h - 1 / 3) * 255);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export async function generateProductBgColor(imageUrl: string): Promise<string | null> {
  try {
    const palette = await Vibrant.from(imageUrl).getPalette();

    // Prefer LightVibrant or Muted swatch — these are closer to pastel
    // already; Vibrant/DarkVibrant can be too saturated/dark.
    const swatch = palette.LightVibrant ?? palette.Vibrant ?? palette.Muted;
    if (!swatch) return null;

    const [h, s, l] = rgbToHsl(...swatch.rgb);

    // Force into the same safe pastel range CATEGORY_TINT_MAP's own hand-
    // picked colors sit in, regardless of source photo.
    const tintedS = Math.min(s, 0.2);
    const tintedL = Math.max(l, 0.92);

    return hslToHex(h, tintedS, tintedL);
  } catch {
    return null;
  }
}

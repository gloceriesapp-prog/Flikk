// Optional "Premium background" product photos via Photoroom's Image Editing
// API v2 (POST https://image-api.photoroom.com/v2/edit, docs.photoroom.com/
// image-editing-api-plus-plan). Server only: the key (PHOTOROOM_API_KEY) never
// reaches the browser, and no error or log carries it. Admin runs it for one
// product at a time; batch and the cut-out worker never call it. The rembg
// cut-out (workers/image-cutout) stays the default photo.
import sharp from 'sharp';
import { presetPrompt, type PresetId } from './photoroomPresets';

export * from './photoroomPresets';

export const PHOTOROOM_URL = 'https://image-api.photoroom.com/v2/edit';
// Same card frame and safe box as the rembg cut-out (workers/image-cutout
// FRAME 720x810, SAFE 648x668): 36px left/right, 71px top/bottom.
export const FRAME = { width: 720, height: 810 } as const;
export const SAFE_PADDING = { left: 36, right: 36, top: 71, bottom: 71 } as const;
// The edit request: background removed, product fitted (never stretched or
// cropped) inside the safe box of a 720x810 frame.
// - AI presets: background drawn from the preset prompt. AI backgrounds draw
//   their own matching shadow, so no separate shadow option (Photoroom docs
//   advise against combining them).
// - text: the headline background (720x810, drawn in the admin) as a static
//   background with a soft AI shadow; the product sits lower, over the
//   bottom of the headline (TEXT_PADDING, a part of the same safe box).
export const TEXT_PADDING = { left: 60, right: 60, top: 280, bottom: 71 } as const;

export interface EditOptions { preset: PresetId; color?: string | null; background?: Blob }

export function editForm(image: Blob, { preset, color, background }: EditOptions): FormData {
  const form = new FormData();
  const pad = preset === 'text' ? TEXT_PADDING : SAFE_PADDING;
  form.set('imageFile', image, 'product');
  form.set('removeBackground', 'true');
  form.set('outputSize', `${FRAME.width}x${FRAME.height}`);
  form.set('scaling', 'fit');
  form.set('horizontalAlignment', 'center');
  form.set('verticalAlignment', 'center');
  form.set('ignorePaddingAndSnapOnCroppedSides', 'false');
  form.set('paddingLeft', `${pad.left}px`);
  form.set('paddingRight', `${pad.right}px`);
  form.set('paddingTop', `${pad.top}px`);
  form.set('paddingBottom', `${pad.bottom}px`);
  if (preset === 'text') {
    if (!background) throw new PhotoroomError('The headline background is missing.');
    form.set('background.imageFile', background, 'headline.png');
    form.set('background.scaling', 'fill');
    form.set('shadow.mode', 'ai.soft');
  } else {
    form.set('background.prompt', presetPrompt(preset, color));
    // Keep our prompt as written, so the "no other food" rules stay in it.
    form.set('background.expandPrompt.mode', 'ai.never');
  }
  form.set('export.format', 'webp');
  return form;
}

export function photoroomKey(): string | null {
  return process.env.PHOTOROOM_API_KEY?.trim() || null;
}

export class PhotoroomError extends Error {}

// Remove the key from any text before it is shown or stored.
export function scrub(text: string, key: string): string {
  return key ? text.split(key).join('[key]') : text;
}

export async function callPhotoroom(
  image: Blob,
  options: EditOptions,
  { key, fetchImpl = fetch, timeoutMs = 90_000 }: { key: string; fetchImpl?: typeof fetch; timeoutMs?: number },
): Promise<Buffer> {
  const body = editForm(image, options);
  let res: Response;
  try {
    res = await fetchImpl(PHOTOROOM_URL, {
      method: 'POST',
      headers: options.preset === 'text' ? { 'x-api-key': key } : { 'x-api-key': key, 'pr-ai-background-model-version': 'background-studio-beta-2025-03-17' },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const name = (error as Error)?.name;
    throw new PhotoroomError(name === 'TimeoutError' || name === 'AbortError' ? 'Photoroom took too long. Try again.' : 'Could not reach Photoroom.');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string }; message?: string; detail?: string } | null;
    const detail = scrub(String(body?.error?.message ?? body?.message ?? body?.detail ?? ''), key).slice(0, 200);
    if (res.status === 402) throw new PhotoroomError('Photoroom credits are used up. Top up at app.photoroom.com.');
    if (res.status === 401 || res.status === 403) throw new PhotoroomError('Photoroom refused the API key.');
    throw new PhotoroomError(`Photoroom error ${res.status}${detail ? `: ${detail}` : ''}.`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// The admin-drawn headline background: must be a 720x810 image; re-encoded
// to a clean PNG before it goes anywhere.
export async function headlineBackground(dataUrl: unknown): Promise<Blob> {
  const match = typeof dataUrl === 'string' ? /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl) : null;
  if (!match || match[1].length > 4_000_000) throw new PhotoroomError('The headline picture is missing or too large.');
  const input = Buffer.from(match[1], 'base64');
  const { width, height } = await sharp(input, { limitInputPixels: 1_000_000 }).metadata();
  if (width !== FRAME.width || height !== FRAME.height) throw new PhotoroomError('The headline picture must be 720x810.');
  return new Blob([new Uint8Array(await sharp(input).png().toBuffer())], { type: 'image/png' });
}

// The result must be exactly the card frame, else it is not used.
export async function checkFrame(bytes: Buffer): Promise<void> {
  const { width, height } = await sharp(bytes).metadata();
  if (width !== FRAME.width || height !== FRAME.height) {
    throw new PhotoroomError(`Photoroom returned ${width}x${height}, not ${FRAME.width}x${FRAME.height}.`);
  }
}

// Calendar month in India time (the cap resets on the 1st, IST).
export function monthStart(now = new Date()): Date {
  const ist = new Date(now.getTime() + 330 * 60_000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 330 * 60_000);
}

export function nextMonthLabel(now = new Date()): string {
  const ist = new Date(now.getTime() + 330 * 60_000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() + 1, 1)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function capReached(used: number, cap: number): boolean {
  return used >= cap;
}

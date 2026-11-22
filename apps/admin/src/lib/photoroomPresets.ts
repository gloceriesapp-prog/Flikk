// Photoroom "Premium background" presets and prompts (lib/photoroom.ts
// sends them). Safe for the browser: no key, no server code.
export const COST_NOTE = 'Costs about $0.10 per image';
export const DEFAULT_PASTEL = '#FDE2E4';

// Every preset prompt ends with this, so the background never brings in other
// food, products, text or people.
export const REQUIRED_PROMPT = 'empty surface, no other food, no other products, no text, no logos, no people, soft and minimal, light tones';

export const PRESETS = {
  studio: { label: 'Soft studio gradient', prompt: 'product photo on a soft light neutral studio gradient backdrop' },
  marble: { label: 'Marble surface', prompt: 'product photo standing on a light white marble surface with a soft plain backdrop' },
  wood: { label: 'Light wooden table', prompt: 'product photo standing on a light natural wooden table with a soft plain backdrop' },
  pastel: { label: 'Pastel colour backdrop', prompt: 'product photo on a smooth pastel colour backdrop' },
  kitchen: { label: 'Kitchen counter, softly blurred', prompt: 'product photo standing on a light kitchen counter, the kitchen behind softly blurred' },
  coastal: { label: 'Coastal: banana leaf / coconut wood', prompt: 'product photo standing on a soft fresh banana leaf over light coconut wood texture' },
  // Not AI: the admin's headline drawn in the browser (renderHeadline) and
  // sent as a static background; the product sits over its lower part.
  text: { label: 'Text headline (your words)', prompt: '' },
} as const;
export type PresetId = keyof typeof PRESETS;
export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];
export const AI_PRESET_IDS = PRESET_IDS.filter((id) => id !== 'text');

export function isPreset(value: unknown): value is PresetId {
  return typeof value === 'string' && value in PRESETS;
}

export function presetPrompt(preset: PresetId, color?: string | null): string {
  const base = preset === 'pastel' ? `${PRESETS.pastel.prompt} in colour ${color || DEFAULT_PASTEL}` : PRESETS[preset].prompt;
  return `${base}, soft natural shadow under the product matching the background, ${REQUIRED_PROMPT}`;
}


// Text headline: up to 2 lines, 40 characters, drawn in capitals.
export const HEADLINE_MAX = 40;
export const DEFAULT_TEXT_BG = '#EEF1F6';
export const DEFAULT_TEXT_COLOR = '#0B1026';
const HEADLINE_CHARS = /^[\p{L}\p{N} &%!?.,'+₹:/-]+$/u;

// The headline's lines (capitals, spaces tidied), or null when not allowed.
export function headlineLines(input: unknown): string[] | null {
  if (typeof input !== 'string') return null;
  const lines = input.toUpperCase().split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const joined = lines.join(' ');
  if (!lines.length || lines.length > 2 || joined.length > HEADLINE_MAX || !lines.every((line) => HEADLINE_CHARS.test(line))) return null;
  // One line typed: split long ones into two balanced lines, like a poster.
  if (lines.length === 1 && lines[0].includes(' ') && lines[0].length > 8) {
    const words = lines[0].split(' ');
    let best = 1;
    for (let i = 1; i < words.length; i++) {
      const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
      if (diff < Math.abs(words.slice(0, best).join(' ').length - words.slice(best).join(' ').length)) best = i;
    }
    return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }
  return lines;
}

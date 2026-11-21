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
} as const;
export type PresetId = keyof typeof PRESETS;
export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];

export function isPreset(value: unknown): value is PresetId {
  return typeof value === 'string' && value in PRESETS;
}

export function presetPrompt(preset: PresetId, color?: string | null): string {
  const base = preset === 'pastel' ? `${PRESETS.pastel.prompt} in colour ${color || DEFAULT_PASTEL}` : PRESETS[preset].prompt;
  return `${base}, soft natural shadow under the product matching the background, ${REQUIRED_PROMPT}`;
}


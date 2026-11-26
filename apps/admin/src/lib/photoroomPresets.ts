// Photoroom "Premium background" presets and prompts (lib/photoroom.ts
// sends them). Safe for the browser: no key, no server code.
export const COST_NOTE = 'Costs about $0.10 per image';
export const DEFAULT_PASTEL = '#FDE2E4';

// Every background prompt ends with this, added here in code (never part of
// what the admin edits), so the background never brings in other food,
// products, text or people.
export const REQUIRED_PROMPT = 'empty surface, no other food, no other products, no text, no logos, no people, soft natural light, light tones, minimal';

// Category presets first (one is pre-selected from the product's category,
// categoryPreset below), then general styles. prompt is the editable first
// part; the safety text is always appended.
export const PRESETS = {
  fruits_veg: { label: 'Fruits & Vegetables', prompt: 'light wooden table in a bright kitchen, morning sunlight' },
  dairy: { label: 'Dairy, Bread & Eggs', prompt: 'white marble kitchen counter, soft morning light' },
  meat_fish: { label: 'Meat & Fish', prompt: 'clean white ceramic tray on light grey stone, cool fresh tones' },
  coastal: { label: 'Coastal / Udupi local 🌴', prompt: 'fresh banana leaf on light coconut-wood surface' },
  staples: { label: 'Atta, Rice & Dal', prompt: 'rustic light jute cloth on a wooden surface, warm tones' },
  masala: { label: 'Oil, Ghee & Masala', prompt: 'warm terracotta-tone kitchen shelf, soft shadow' },
  snacks: { label: 'Snacks & Munchies', prompt: 'bright pastel yellow backdrop, playful and clean' },
  beverages: { label: 'Beverages', prompt: 'cool light blue backdrop with soft water-droplet texture' },
  bakery: { label: 'Bakery & Biscuits', prompt: 'light wooden bakery board, warm cosy light' },
  frozen: { label: 'Ice Cream & Frozen', prompt: 'pastel blue-white backdrop with soft frosty texture' },
  personal_care: { label: 'Personal Care', prompt: 'soft white bathroom shelf, spa-like calm tones' },
  household: { label: 'Household & Cleaning', prompt: 'clean white laundry-room surface, bright and fresh' },
  baby: { label: 'Baby Care', prompt: 'soft pastel pink or blue fabric backdrop' },
  festival: { label: 'Festival (seasonal)', prompt: 'soft warm gold backdrop with gentle bokeh lights' },
  studio: { label: 'Soft studio gradient (any category)', prompt: 'soft studio gradient, light neutral tones' },
  marble: { label: 'Marble surface', prompt: 'product photo standing on a light white marble surface with a soft plain backdrop' },
  wood: { label: 'Light wooden table', prompt: 'product photo standing on a light natural wooden table with a soft plain backdrop' },
  pastel: { label: 'Pastel colour backdrop', prompt: 'product photo on a smooth pastel colour backdrop' },
  kitchen: { label: 'Kitchen counter, softly blurred', prompt: 'product photo standing on a light kitchen counter, the kitchen behind softly blurred' },
  // Not AI: the admin's headline drawn in the browser (renderHeadline) and
  // sent as a static background; the product sits over its lower part.
  text: { label: 'Text headline (your words)', prompt: '' },
} as const;
export type PresetId = keyof typeof PRESETS;
export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];
export const AI_PRESET_IDS = PRESET_IDS.filter((id) => id !== 'text');
export const CATEGORY_PRESET_IDS = PRESET_IDS.slice(0, PRESET_IDS.indexOf('studio'));

export function isPreset(value: unknown): value is PresetId {
  return typeof value === 'string' && value in PRESETS;
}

// Product category (free text, e.g. "Spices & Masala", "Non Veg") -> preset.
// First match wins, so "Frozen Snacks" is frozen, not snacks. Unknown ->
// the soft studio gradient.
const CATEGORY_RULES: [RegExp, PresetId][] = [
  [/festiv|pooja|puja|diwali|deepavali/i, 'festival'],
  [/coastal|udupi|local/i, 'coastal'],
  [/baby|diaper|infant/i, 'baby'],
  [/ice ?cream|frozen/i, 'frozen'],
  [/fruit|vegetable|veggie|greens/i, 'fruits_veg'],
  [/meat|fish|chicken|mutton|seafood|non ?veg/i, 'meat_fish'],
  [/dairy|milk|bread|egg|butter|cheese|paneer|curd/i, 'dairy'],
  [/atta|rice|dal|pulse|flour|sugar|jaggery|grain/i, 'staples'],
  [/oil|ghee|masala|spice|pickle|paste|sauce|condiment/i, 'masala'],
  [/beverage|drink|juice|water|tea|coffee|soda/i, 'beverages'],
  [/bakery|biscuit|cookie|cake|rusk|breakfast|cereal/i, 'bakery'],
  [/snack|munch|chip|namkeen|noodle|instant|sweet|chocolate/i, 'snacks'],
  [/household|clean|laundry|detergent|pest|incense|dhoop/i, 'household'],
  [/personal|bath|body|hair|skin|oral|deo|perfume|makeup|shav|groom|health|pain/i, 'personal_care'],
];

export function categoryPreset(category: string | null | undefined): PresetId {
  if (!category) return 'studio';
  return CATEGORY_RULES.find(([rule]) => rule.test(category))?.[1] ?? 'studio';
}

// The editable first part of a preset's prompt (pastel adds its colour).
export function presetBase(preset: PresetId, color?: string | null): string {
  return preset === 'pastel' ? `${PRESETS.pastel.prompt} in colour ${color || DEFAULT_PASTEL}` : PRESETS[preset].prompt;
}

export const PROMPT_BASE_MAX = 200;
// The admin's edited first part, tidied; null when empty, too long or it
// tries to start a new line.
export function cleanPromptBase(input: unknown): string | null {
  if (typeof input !== 'string' || /[\r\n]/.test(input)) return null;
  const base = input.replace(/\s+/g, ' ').trim().replace(/[\s,.;]+$/, '');
  return base.length >= 3 && base.length <= PROMPT_BASE_MAX ? base : null;
}

// What Photoroom receives: the first part, then the fixed safety text.
export function backgroundPrompt(base: string): string {
  return `${base}, ${REQUIRED_PROMPT}`;
}

export function presetPrompt(preset: PresetId, color?: string | null): string {
  return backgroundPrompt(presetBase(preset, color));
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

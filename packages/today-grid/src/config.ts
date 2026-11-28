// Grid config: defaults, a lenient reader (endpoint: never blank Home over a
// bad row) and a strict validator (admin saves: reject with exact reasons).
import { ACCENT_PRESETS, CARD_IDS, DEFAULT_ITEMS, HERO_IDS, ITEM_FACTS, ITEM_IDS, TAG_TEXT_COLORS } from './catalog.js';
import { contrastRatio, isHex, MIN_TAG_CONTRAST, passingShade } from './contrast.js';
import { placeholdersIn } from './placeholders.js';
import type { CardId, CardTarget, HeroId, ItemConfig, ItemId, Modifiers, SlotKey, SlotRule, TodayGridConfig } from './types.js';

const h = (hour: number) => hour * 60;
export const DEFAULT_SLOTS: SlotRule[] = [
  { key: 'morning', from: h(6), to: h(9), hero: 'todays-catch', cards: ['milk-breakfast', 'your-usuals', 'breakfast-ready', 'tea-coffee'] },
  { key: 'late-morning', from: h(9), to: h(12), hero: 'todays-catch', cards: ['your-usuals', 'lunch-essentials', 'offers-for-you', 'taste-of-tulunadu'] },
  { key: 'afternoon', from: h(12), to: h(16), hero: 'village-fresh', cards: ['glo-bulk', 'offers-for-you', 'namma-brands', 'home-cleaning'] },
  { key: 'evening', from: h(16), to: h(19), hero: 'veg-for-tomorrow', cards: ['snack-time', 'cold-drinks', 'your-usuals', 'fish-meat'] },
  { key: 'night', from: h(19), to: h(22), hero: 'veg-for-tomorrow', cards: ['tomorrow-by-7', 'fish-meat', 'ice-cream', 'your-usuals'] },
  { key: 'late-night', from: h(22), to: h(6), hero: 'fresh-by-7', cards: ['tomorrow-by-7', 'late-night-snacks', 'daily-needs', 'your-usuals'] },
];
export const DEFAULT_BACKUPS: CardId[] = ['daily-essentials', 'offers-for-you', 'namma-brands', 'snack-time'];
export const DEFAULT_MODIFIERS: Modifiers = {
  monthStart: { on: true, fromDay: 1, toDay: 5, card: 'glo-bulk', position: 4 },
  weekendParty: { on: true, days: [4, 5, 6], fromMinute: h(17), card: 'party-orders', position: 4 },
  festival: { on: true, position: 3, titleTemplate: '{festival} Needs', categories: ['Sweets & Chocolates', 'Dry Fruits & Nuts', 'Incense & Dhoop'] },
  rain: { on: false, until: null, fromMinute: h(16), card: 'rainy-day', position: 3 },
  newUsers: { threshold: 2 },
};
export const SLOT_KEYS: SlotKey[] = DEFAULT_SLOTS.map(slot => slot.key);
export const DEFAULT_CONFIG: TodayGridConfig = { items: DEFAULT_ITEMS, slots: DEFAULT_SLOTS, backups: DEFAULT_BACKUPS, modifiers: DEFAULT_MODIFIERS };

export const LIMITS = { title: 24, line: 40, tag: 24, categories: 12, pickedImages: 2, pinnedProducts: 30 } as const;

export interface ConfigError { path: string; message: string; suggestion?: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isCard = (v: unknown): v is CardId => typeof v === 'string' && (CARD_IDS as string[]).includes(v);
const isHero = (v: unknown): v is HeroId => typeof v === 'string' && (HERO_IDS as string[]).includes(v);
const isMinute = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 1440;
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined);
const strings = (v: unknown, max: number) => (Array.isArray(v) ? [...new Set(v.map(str).filter((s): s is string => !!s && s.length <= 60))].slice(0, max) : undefined);

function readTarget(v: unknown): CardTarget | undefined {
  const t = obj(v);
  switch (t.type) {
    case 'categories': { const c = strings(t.categories, LIMITS.categories); return c ? { type: 'categories', categories: c } : undefined; }
    case 'subcategory': return typeof t.id === 'string' && UUID.test(t.id) ? { type: 'subcategory', id: t.id } : undefined;
    case 'products': { const ids = Array.isArray(t.productIds) ? t.productIds.filter((id): id is string => typeof id === 'string' && UUID.test(id)) : []; return ids.length ? { type: 'products', productIds: [...new Set(ids)].slice(0, LIMITS.pinnedProducts) } : undefined; }
    case 'tab': return t.id === 'fresh' || t.id === 'preorder' || t.id === 'udupi' ? { type: 'tab', id: t.id } : undefined;
    case 'brands': return { type: 'brands' };
    case 'action': return ['add-usuals', 'party-form', 'preorder-list', 'popular', 'offers', 'bulk'].includes(String(t.id)) ? { type: 'action', id: t.id as 'add-usuals' } : undefined;
    default: return undefined;
  }
}

// Merge a stored item over its default, keeping only well-typed fields.
function readItem(id: ItemId, raw: unknown): ItemConfig {
  const base = DEFAULT_ITEMS[id];
  const r = obj(raw);
  const images = obj(r.images);
  const picked = Array.isArray(images.productIds) ? images.productIds.filter((p): p is string => typeof p === 'string' && UUID.test(p)).slice(0, LIMITS.pickedImages) : [];
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : base.enabled,
    title: str(r.title) || base.title,
    line: str(r.line) ?? base.line,
    tag: str(r.tag) || base.tag,
    fallbackTag: str(r.fallbackTag) || base.fallbackTag,
    accent: isHex(r.accent) ? r.accent.toUpperCase() : base.accent,
    tagText: r.tagText === '#FFD84D' ? '#FFD84D' : r.tagText === '#FFFFFF' ? '#FFFFFF' : base.tagText,
    categories: strings(r.categories, LIMITS.categories) ?? base.categories,
    target: readTarget(r.target) ?? base.target,
    images: images.mode === 'picked' && picked.length ? { mode: 'picked', productIds: picked } : { mode: 'auto' },
    updatedBy: str(r.updatedBy) ?? null,
    updatedAt: str(r.updatedAt) ?? null,
  };
}

function readSlot(raw: unknown): SlotRule | null {
  const s = obj(raw);
  if (!(SLOT_KEYS as unknown[]).includes(s.key) || !isMinute(s.from) || !isMinute(s.to) || !isHero(s.hero) || !Array.isArray(s.cards)) return null;
  return { key: s.key as SlotKey, from: s.from % 1440, to: s.to % 1440, hero: s.hero, cards: s.cards.filter(isCard).slice(0, 4) };
}

function readModifiers(raw: unknown): Modifiers {
  const m = obj(raw), d = DEFAULT_MODIFIERS;
  const pos = (v: unknown, fallback: number) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 4 ? v as number : fallback);
  const on = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  const ms = obj(m.monthStart), wp = obj(m.weekendParty), fe = obj(m.festival), ra = obj(m.rain), nu = obj(m.newUsers);
  const day = (v: unknown, fallback: number) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 31 ? v as number : fallback);
  const days = Array.isArray(wp.days) ? [...new Set(wp.days.filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 6))].sort() : null;
  return {
    monthStart: { on: on(ms.on, d.monthStart.on), fromDay: day(ms.fromDay, d.monthStart.fromDay), toDay: day(ms.toDay, d.monthStart.toDay), card: isCard(ms.card) ? ms.card : d.monthStart.card, position: pos(ms.position, d.monthStart.position) },
    weekendParty: { on: on(wp.on, d.weekendParty.on), days: days && days.length ? days : d.weekendParty.days, fromMinute: isMinute(wp.fromMinute) ? wp.fromMinute : d.weekendParty.fromMinute, card: isCard(wp.card) ? wp.card : d.weekendParty.card, position: pos(wp.position, d.weekendParty.position) },
    festival: { on: on(fe.on, d.festival.on), position: pos(fe.position, d.festival.position), titleTemplate: str(fe.titleTemplate) || d.festival.titleTemplate, categories: strings(fe.categories, LIMITS.categories) ?? d.festival.categories },
    rain: { on: on(ra.on, d.rain.on), until: typeof ra.until === 'string' && !Number.isNaN(Date.parse(ra.until)) ? ra.until : null, fromMinute: isMinute(ra.fromMinute) ? ra.fromMinute : d.rain.fromMinute, card: isCard(ra.card) ? ra.card : d.rain.card, position: pos(ra.position, d.rain.position) },
    newUsers: { threshold: Number.isInteger(nu.threshold) && (nu.threshold as number) >= 0 && (nu.threshold as number) <= 20 ? nu.threshold as number : d.newUsers.threshold },
  };
}

// Lenient: whatever is valid is kept, the rest comes from defaults. Used by
// the endpoint; a published version already passed validateConfig.
export function readConfig(raw: unknown): TodayGridConfig {
  const r = obj(raw);
  const items = Object.fromEntries(ITEM_IDS.map(id => [id, readItem(id, obj(r.items)[id])])) as Record<ItemId, ItemConfig>;
  const slots = Array.isArray(r.slots) ? r.slots.map(readSlot).filter((s): s is SlotRule => !!s) : [];
  const backups = Array.isArray(r.backups) ? [...new Set(r.backups.filter(isCard))] : [];
  return {
    items,
    slots: slots.length && !slotCoverageErrors(slots).length ? slots : DEFAULT_SLOTS,
    backups: backups.length ? backups : DEFAULT_BACKUPS,
    modifiers: readModifiers(r.modifiers),
  };
}

// Slots must cover all 24 hours exactly once (wrap past midnight allowed).
export function slotCoverageErrors(slots: { key: string; from: number; to: number }[]): ConfigError[] {
  const covered = new Array<number>(1440).fill(0);
  for (const s of slots) for (let m = s.from; m !== s.to; m = (m + 1) % 1440) covered[m]! += 1;
  const gap = covered.indexOf(0), overlap = covered.findIndex(c => c > 1);
  const t = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return [
    ...(gap >= 0 ? [{ path: 'slots', message: `Slots leave a gap at ${t(gap)} IST. Together they must cover all 24 hours.` }] : []),
    ...(overlap >= 0 ? [{ path: 'slots', message: `Slots overlap at ${t(overlap)} IST.` }] : []),
  ];
}

function itemErrors(id: ItemId, raw: unknown): ConfigError[] {
  const r = obj(raw), facts = ITEM_FACTS[id], errors: ConfigError[] = [];
  const at = (field: string, message: string, suggestion?: string) => errors.push({ path: `items.${id}.${field}`, message, ...(suggestion ? { suggestion } : {}) });
  const item = readItem(id, raw);
  if (str(r.title) !== undefined && (!str(r.title) || str(r.title)!.length > LIMITS.title)) at('title', `Title must be 1–${LIMITS.title} characters.`);
  const titleHoles = placeholdersIn(item.title);
  if (titleHoles.some(p => !(id === 'festival-needs' && p === 'festival'))) at('title', 'Titles cannot hold {placeholders} (only Festival Needs may use {festival}).');
  if (str(r.line) !== undefined && str(r.line)!.length > LIMITS.line) at('line', `Line must be ${LIMITS.line} characters or fewer.`);
  if (r.tag !== undefined && (!str(r.tag) || str(r.tag)!.length > LIMITS.tag)) at('tag', `Tag must be 1–${LIMITS.tag} characters.`);
  const holes = placeholdersIn(item.tag);
  const unknown = holes.filter(p => !(facts.placeholders as string[]).includes(p) || p === 'festival');
  if (unknown.length) at('tag', `Unknown placeholder ${unknown.map(p => `{${p}}`).join(', ')}. This card supports ${facts.placeholders.filter(p => p !== 'festival').map(p => `{${p}}`).join(' ') || 'no placeholders'}.`);
  if (holes.length && !str(r.fallbackTag ?? item.fallbackTag)) at('fallbackTag', 'A fallback tag is required when the tag has a placeholder.');
  if (placeholdersIn(item.fallbackTag).length) at('fallbackTag', 'The fallback tag cannot hold placeholders.');
  if (item.fallbackTag.length > LIMITS.tag) at('fallbackTag', `Fallback tag must be ${LIMITS.tag} characters or fewer.`);
  if (r.accent !== undefined && !isHex(r.accent)) at('accent', 'Accent must be a #RRGGBB colour.');
  if (r.tagText !== undefined && !(TAG_TEXT_COLORS as readonly unknown[]).includes(r.tagText)) at('tagText', 'Tag text must be white (#FFFFFF) or #FFD84D.');
  const ratio = contrastRatio(item.accent, item.tagText);
  if (ratio < MIN_TAG_CONTRAST) {
    const other = item.tagText === '#FFFFFF' ? '#FFD84D' : '#FFFFFF';
    const options = [contrastRatio(item.accent, other) >= MIN_TAG_CONTRAST ? `use ${other} text` : null, passingShade(item.accent, item.tagText) ? `use accent ${passingShade(item.accent, item.tagText)}` : null].filter(Boolean);
    at('accent', `Tag text on this accent is ${ratio}:1; it must be at least ${MIN_TAG_CONTRAST}:1.`, options.join(' or ') || undefined);
  }
  if (r.target !== undefined && !readTarget(r.target)) at('target', 'Choose a valid target (categories, a sub-category, pinned products, a tab, brands or an action).');
  const images = obj(r.images);
  if (images.mode === 'picked' && (!Array.isArray(images.productIds) || images.productIds.length < 1 || images.productIds.length > LIMITS.pickedImages))
    at('images', `Pick 1–${LIMITS.pickedImages} products for the card images, or use automatic images.`);
  return errors;
}

// Strict: every problem, with a path the admin form can highlight.
export function validateConfig(raw: unknown): { config: TodayGridConfig; errors: ConfigError[] } {
  const r = obj(raw), errors: ConfigError[] = [];
  for (const id of Object.keys(obj(r.items))) {
    if (!(ITEM_IDS as string[]).includes(id)) errors.push({ path: `items.${id}`, message: `Unknown card "${id}".` });
    else errors.push(...itemErrors(id as ItemId, obj(r.items)[id]));
  }
  const config = readConfig(raw);
  const enabled = (id: ItemId) => config.items[id].enabled;
  if (r.slots !== undefined) {
    const rawSlots = Array.isArray(r.slots) ? r.slots : [];
    const slots = rawSlots.map(readSlot);
    slots.forEach((slot, i) => { if (!slot) errors.push({ path: `slots.${i}`, message: 'Each slot needs a known key, IST from/to times, a hero and its cards.' }); });
    const good = slots.filter((s): s is SlotRule => !!s);
    if (new Set(good.map(s => s.key)).size !== good.length) errors.push({ path: 'slots', message: 'Each slot can appear only once.' });
    errors.push(...slotCoverageErrors(good));
    good.forEach((slot, i) => {
      const raw = obj(rawSlots[i]).cards;
      if (!Array.isArray(raw) || raw.length < 1 || raw.length > 4) errors.push({ path: `slots.${i}.cards`, message: 'A slot needs 1–4 cards.' });
      if (Array.isArray(raw) && raw.some(id => !isCard(id))) errors.push({ path: `slots.${i}.cards`, message: 'A slot has an unknown card.' });
      if (new Set(slot.cards).size !== slot.cards.length) errors.push({ path: `slots.${i}.cards`, message: `"${slot.key}" has the same card twice.` });
      for (const id of slot.cards) {
        if (!enabled(id)) errors.push({ path: `slots.${i}.cards`, message: `${config.items[id].title} is disabled and cannot be placed in a slot.` });
        if (ITEM_FACTS[id].type === 'special') errors.push({ path: `slots.${i}.cards`, message: `${config.items[id].title} is added by a modifier, not placed in slots.` });
      }
      if (!enabled(slot.hero)) errors.push({ path: `slots.${i}.hero`, message: `${config.items[slot.hero].title} is disabled.` });
    });
  }
  if (r.backups !== undefined) {
    const raw = Array.isArray(r.backups) ? r.backups : [];
    if (!raw.length || raw.some(id => !isCard(id))) errors.push({ path: 'backups', message: 'Backups must be a list of known cards.' });
    if (new Set(raw).size !== raw.length) errors.push({ path: 'backups', message: 'A backup can appear only once.' });
    for (const id of config.backups) if (!enabled(id)) errors.push({ path: 'backups', message: `${config.items[id].title} is disabled and cannot be a backup.` });
  }
  if (r.modifiers !== undefined) {
    const m = config.modifiers;
    if (m.monthStart.fromDay > m.monthStart.toDay) errors.push({ path: 'modifiers.monthStart', message: 'Month start: first day must be on or before the last day.' });
    if (m.festival.titleTemplate.length > LIMITS.title + 8 || placeholdersIn(m.festival.titleTemplate).some(p => p !== 'festival'))
      errors.push({ path: 'modifiers.festival.titleTemplate', message: 'Festival title may only use {festival} and must stay short.' });
    for (const [key, card] of [['monthStart', m.monthStart.card], ['weekendParty', m.weekendParty.card], ['rain', m.rain.card]] as const)
      if (!enabled(card)) errors.push({ path: `modifiers.${key}.card`, message: `${config.items[card].title} is disabled.` });
  }
  return { config, errors };
}

export { ACCENT_PRESETS };

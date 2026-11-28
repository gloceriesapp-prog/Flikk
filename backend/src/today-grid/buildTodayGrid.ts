// Pure: which hero and which cards the "Today on Gloceries" grid shows, and
// with what copy. No database, no Date.now(): `now`, the user, live
// availability and config are all passed in, so admin preview and tests run
// the exact same rules as the endpoint.
//
// Pipeline (fixed order): slot list -> modifiers -> dedupe -> data checks with
// backups -> at most 4 unique cards. Fewer than 4 is fine; an empty card never is.
import { CARD_CATALOG, HERO_CATALOG } from './catalog.js';
import type { TodayGridConfig } from './config.js';
import { formatIstMinute, inWindow, istClock, type IstClock } from './istClock.js';
import { EMPTY_STAT, type Availability, type CardDef, type CardId, type GridCard, type HeroId, type Stat, type TodayGrid, type UserSummary } from './types.js';

export const MAX_CARDS = 4;
const MIN_ITEMS = 3;

export interface BuildInput { now: Date; user: UserSummary; availability: Availability; config: TodayGridConfig }

// ---- hero ----------------------------------------------------------------
const HERO_WINDOWS: { id: HeroId; from: number; to: number }[] = [
  { id: 'todays-catch', from: 6 * 60, to: 11 * 60 },
  { id: 'village-fresh', from: 11 * 60, to: 17 * 60 },
  { id: 'veg-for-tomorrow', from: 17 * 60, to: 22 * 60 },
  { id: 'fresh-by-7', from: 22 * 60, to: 6 * 60 },
];

function heroStat(id: HeroId, a: Availability): Stat | null {
  switch (id) {
    case 'todays-catch': return a.fish.count > 0 && a.fish.arrivedMinute != null ? a.fish : null;
    case 'village-fresh': return a.villagePickedToday.count > 0 ? a.villagePickedToday : null;
    case 'veg-for-tomorrow': return a.vegetables.count >= MIN_ITEMS ? a.vegetables : null;
    case 'fresh-by-7': return a.preorder.open ? a.fruitsAndVegetables : null;
    case 'fruits-vegetables': return a.fruitsAndVegetables;
  }
}

export function pickHero(clock: IstClock, a: Availability): GridCard {
  const windowed = HERO_WINDOWS.find(w => inWindow(clock.minute, w.from, w.to))!.id;
  const stat = heroStat(windowed, a);
  const id: HeroId = stat ? windowed : 'fruits-vegetables';
  const def = HERO_CATALOG[id];
  const used = stat ?? a.fruitsAndVegetables;
  const tag = id === 'todays-catch' ? def.tag.replace('{time}', formatIstMinute(a.fish.arrivedMinute!)) : def.tag;
  return {
    id, title: def.title, tag, line: def.line, accent: def.accent, tagBg: def.accent, tagText: def.tagText ?? '#FFFFFF',
    imageUrls: used.imageUrls.slice(0, 2), target: { type: 'tab', id: id === 'fresh-by-7' ? 'preorder' : 'fresh' },
    ...(used.minPrice != null ? { price: { amount: used.minPrice, mrp: used.minPriceMrp != null && used.minPriceMrp > used.minPrice ? used.minPriceMrp : null } } : {}),
  };
}

// ---- slot + modifiers ----------------------------------------------------
export function slotFor(clock: IstClock, config: TodayGridConfig) {
  // parseConfig guarantees at least one slot.
  return config.slots.find(slot => inWindow(clock.minute, slot.from, slot.to)) ?? config.slots[0]!;
}

const placeAt = (cards: CardId[], position: number, id: CardId) => { cards[position - 1] = id; };
function festivalLive(config: TodayGridConfig, clock: IstClock) {
  const { active, from, to } = config.festival;
  return active && (!from || clock.date >= from) && (!to || clock.date <= to);
}

export function applyModifiers(base: CardId[], clock: IstClock, user: UserSummary, config: TodayGridConfig): CardId[] {
  const cards = [...base];
  if (clock.dayOfMonth <= 5 && !cards.includes('glo-bulk')) placeAt(cards, 4, 'glo-bulk');
  if (clock.weekday >= 4 && clock.weekday <= 6 && clock.hour >= 17) placeAt(cards, 4, 'party-orders');
  if (festivalLive(config, clock)) placeAt(cards, 3, 'festival-needs');
  if (config.rain && clock.hour >= 16) placeAt(cards, 3, 'rainy-day');
  if (user.deliveredOrders < 2) return cards.map(id => (id === 'your-usuals' ? 'popular-near-you' : id));
  return cards;
}

// ---- data checks -----------------------------------------------------------
export function cardDefinition(id: CardId, config: TodayGridConfig): CardDef {
  const base = CARD_CATALOG[id];
  const o = config.cards[id] ?? {};
  return { ...base, id, title: o.title ?? base.title, line: o.line ?? base.line, accent: o.accent ?? base.accent, categories: o.categories ?? base.categories };
}

function mergeStats(stats: Stat[]): Stat {
  const present = stats.filter(s => s.count > 0);
  if (!present.length) return EMPTY_STAT;
  const cheapest = present.filter(s => s.minPrice != null).sort((x, y) => x.minPrice! - y.minPrice!)[0];
  const pcts = present.map(s => s.maxDiscountPct).filter((p): p is number => p != null);
  return {
    count: present.reduce((sum, s) => sum + s.count, 0),
    minPrice: cheapest?.minPrice ?? null, minPriceMrp: cheapest?.minPriceMrp ?? null,
    maxDiscountPct: pcts.length ? Math.max(...pcts) : null,
    imageUrls: [...new Set(present.flatMap(s => s.imageUrls))].slice(0, 2),
  };
}

// The live stat behind a card, or null when its data check fails.
export function cardStat(def: CardDef, user: UserSummary, a: Availability): Stat | null {
  const categoryStat = () => mergeStats(def.categories.map(name => a.categories[name] ?? EMPTY_STAT));
  switch (def.check.kind) {
    case 'categories': { const s = categoryStat(); return s.count >= def.check.min ? s : null; }
    case 'usuals': return user.kind === 'customer' && user.deliveredOrders >= 2 && user.usuals.count >= MIN_ITEMS ? user.usuals : null;
    case 'popular': return a.popularThisWeek.count >= MIN_ITEMS ? a.popularThisWeek : null;
    case 'offers': return user.kind === 'customer' && user.offers.count > 0 && user.offers.maxDiscountPct != null ? user.offers : null;
    case 'storeOpen': { const s = categoryStat(); return a.openStores >= 1 && s.count > 0 ? s : null; }
    case 'preorder': return a.preorder.open ? mergeStats([a.categories['Milk & Dairy Drinks'] ?? EMPTY_STAT, a.categories['Non Veg'] ?? EMPTY_STAT]) : null;
    case 'bulk': return a.bulk.count > 0 ? a.bulk : null;
    case 'party': return a.party.count > 0 ? a.party : null;
    case 'brands': return a.brands.count > 0 ? a.brands : null;
  }
}

// Honest numbers: every placeholder must come from live data, else the
// card's non-numeric fallback tag.
export function renderTag(def: CardDef, stat: Stat, a: Availability): string {
  const values: Record<string, string | null> = {
    min: stat.minPrice != null ? formatRupees(stat.minPrice) : null,
    pct: stat.maxDiscountPct != null && stat.maxDiscountPct > 0 ? String(stat.maxDiscountPct) : null,
    total: stat.count > 0 ? String(stat.count) : null,
    cutoff: a.preorder.cutoffMinute != null ? formatIstMinute(a.preorder.cutoffMinute) : null,
  };
  let missing = false;
  const tag = def.tag.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? ((missing = true), ''));
  return missing ? def.fallbackTag : tag;
}
const formatRupees = (amount: number) => (Number.isInteger(amount) ? String(amount) : amount.toFixed(2));

function toCard(def: CardDef, stat: Stat, a: Availability): GridCard {
  return {
    id: def.id, title: def.title, tag: renderTag(def, stat, a), line: def.line,
    accent: def.accent, tagBg: def.accent, tagText: def.tagText ?? '#FFFFFF',
    imageUrls: stat.imageUrls.slice(0, 2),
    target: def.target.type === 'categories' ? { type: 'categories', categories: def.categories } : def.target,
  };
}

// Next instant the grid can change on its own (a slot or hero window edge),
// so the app refetches exactly then instead of polling.
export function nextChangeAt(now: Date, config: TodayGridConfig): Date {
  const clock = istClock(now);
  const edges = new Set([...config.slots.flatMap(slot => [slot.from, slot.to]), ...HERO_WINDOWS.map(w => w.from)].map(m => m % 1440));
  const ahead = [...edges].map(edge => (edge - clock.minute + 1440) % 1440 || 1440);
  const minutes = Math.min(...ahead);
  const startOfMinute = now.getTime() - (now.getTime() % 60_000);
  return new Date(startOfMinute + minutes * 60_000);
}

// ---- the whole grid ----------------------------------------------------------
export function buildTodayGrid({ now, user, availability: a, config }: BuildInput): TodayGrid {
  const clock = istClock(now);
  const slot = slotFor(clock, config);
  const enabled = (id: CardId) => config.cards[id]?.enabled !== false;
  // c. dedupe, keeping first occurrence
  const wanted = [...new Set(applyModifiers(slot.cards, clock, user, config))];
  const backups = config.backups.filter(id => !(user.deliveredOrders < 2 && id === 'your-usuals'));
  const used = new Set<CardId>();
  const cards: GridCard[] = [];
  const tryCard = (id: CardId) => {
    if (used.has(id) || !enabled(id)) return false;
    const def = cardDefinition(id, config);
    const stat = cardStat(def, user, a);
    if (!stat) return false;
    used.add(id); cards.push(toCard(def, stat, a));
    return true;
  };
  // d. each wanted card, or the first passing backup in its place
  for (const id of wanted.slice(0, MAX_CARDS)) {
    if (cards.length >= MAX_CARDS) break;
    if (!tryCard(id)) backups.find(backup => !wanted.includes(backup) && tryCard(backup));
  }
  return { hero: pickHero(clock, a), cards, slot: slot.key, refreshAt: nextChangeAt(now, config).toISOString() };
}

// Admin side of the "Today on Gloceries" grid. Rules, defaults and
// validation all come from packages/today-grid — the same engine the backend
// endpoint runs — so admin never re-implements them.
export {
  ACCENT_PRESETS, CARD_IDS, contrastRatio, DEFAULT_CONFIG, HERO_IDS, ITEM_FACTS, ITEM_IDS, MIN_TAG_CONTRAST,
  fill, passingShade, placeholdersIn, readConfig, SLOT_KEYS, TAG_TEXT_COLORS, validateConfig, buildTodayGrid, EMPTY_STAT,
} from '../../../../../packages/today-grid/index.js';
export type { Availability, CardId, CardTarget, ConfigError, GridCard, HeroId, ItemConfig, ItemId, SlotRule, TodayGrid, TodayGridConfig, TraceRow, UserSummary } from '../../../../../packages/today-grid/index.js';
import type { ItemId, TodayGridConfig } from '../../../../../packages/today-grid/index.js';

export interface DiffEntry { path: string; from: unknown; to: unknown }

// Changed leaf paths between two configs (who-changed-what for each version).
export function configDiff(before: unknown, after: unknown, path = '', out: DiffEntry[] = []): DiffEntry[] {
  if (out.length >= 100) return out;
  const isObj = (v: unknown) => v !== null && typeof v === 'object' && !Array.isArray(v);
  if (isObj(before) && isObj(after)) {
    const keys = new Set([...Object.keys(before as object), ...Object.keys(after as object)]);
    for (const key of [...keys].sort()) configDiff((before as Record<string, unknown>)[key], (after as Record<string, unknown>)[key], path ? `${path}.${key}` : key, out);
  } else if (JSON.stringify(before) !== JSON.stringify(after)) out.push({ path, from: before ?? null, to: after ?? null });
  return out;
}

// Stamp who/when on every item whose content changed in this save.
export function stampEditedItems(before: TodayGridConfig, after: TodayGridConfig, by: string, at: string): TodayGridConfig {
  const items = { ...after.items };
  for (const id of Object.keys(items) as ItemId[]) {
    const content = (item: typeof items[ItemId]) => JSON.stringify({ ...item, updatedBy: null, updatedAt: null });
    if (content(items[id]) !== content(before.items[id])) items[id] = { ...items[id], updatedBy: by, updatedAt: at };
    else items[id] = { ...items[id], updatedBy: before.items[id].updatedBy ?? null, updatedAt: before.items[id].updatedAt ?? null };
  }
  return { ...after, items };
}

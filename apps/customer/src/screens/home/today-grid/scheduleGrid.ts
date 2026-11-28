// The planned grid by India time alone, from the shared rules package
// (same slots, heroes, cards, backups and modifiers the server uses). Shown
// only when GET /home/today-grid can't answer (not deployed yet, offline),
// so Home still gets its 5 timed cards. No live numbers here: every tag is
// the card's no-number fallback and photos come later from the server.
// ponytail: no in-stock check in this mode, a card can open an empty list;
// the server grid replaces it as soon as the endpoint responds.
import {
  applyModifiers, DEFAULT_CONFIG, EMPTY_STAT, istClock, nextChangeAt, placeholdersIn, slotFor,
  type CardId, type GridCard, type ItemId, type UserSummary,
} from '../../../../../../packages/today-grid/index.js';
import type { TodayGrid } from './api';

// Built per customer by the server; meaningless without their history.
const PERSONAL: CardId[] = ['your-usuals', 'offers-for-you'];
const NO_USER: UserSummary = { kind: 'guest', deliveredOrders: 0, usuals: EMPTY_STAT, offers: EMPTY_STAT, usualIds: [], offerIds: [] };

export function scheduleCard(id: ItemId): GridCard {
  const item = DEFAULT_CONFIG.items[id];
  return {
    id, title: item.title, line: item.line, accent: item.accent, tagBg: item.accent, tagText: item.tagText, imageUrls: [], target: item.target,
    tag: placeholdersIn(item.tag).length ? item.fallbackTag : item.tag,
  };
}

export function scheduleGrid(now: Date): TodayGrid & { hero: GridCard } {
  const config = DEFAULT_CONFIG;
  const clock = istClock(now);
  const slot = slotFor(clock, config);
  const modified = applyModifiers(slot.cards, clock, now, NO_USER, config, { active: false, name: null }).cards;
  const cards = [...modified, ...config.backups].filter((id, i, all) => !PERSONAL.includes(id) && config.items[id].enabled && all.indexOf(id) === i).slice(0, 4);
  return {
    enabled: true, slot: slot.key, hero: scheduleCard(slot.hero), cards: cards.map(scheduleCard),
    refreshAt: nextChangeAt(now, config).toISOString(), generatedAt: now.toISOString(),
  };
}

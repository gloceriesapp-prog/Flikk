// Admin-editable grid config: one JSONB row (today_grid_config, migration
// 20261128120000). Slot table, backup order, per-card overrides, festival
// dates and the rain switch. parseConfig never throws: anything invalid falls
// back to the default for that field, so a bad edit cannot blank Home.
import { CARD_IDS } from './catalog.js';
const h = (hour) => hour * 60;
export const DEFAULT_CONFIG = {
    slots: [
        { key: 'morning', from: h(6), to: h(9), cards: ['milk-breakfast', 'your-usuals', 'breakfast-ready', 'tea-coffee'] },
        { key: 'late-morning', from: h(9), to: h(12), cards: ['your-usuals', 'lunch-essentials', 'offers-for-you', 'taste-of-tulunadu'] },
        { key: 'afternoon', from: h(12), to: h(16), cards: ['glo-bulk', 'offers-for-you', 'namma-brands', 'home-cleaning'] },
        { key: 'evening', from: h(16), to: h(19), cards: ['snack-time', 'cold-drinks', 'your-usuals', 'fish-meat'] },
        { key: 'night', from: h(19), to: h(22), cards: ['tomorrow-by-7', 'fish-meat', 'ice-cream', 'your-usuals'] },
        { key: 'late-night', from: h(22), to: h(6), cards: ['tomorrow-by-7', 'late-night-snacks', 'daily-needs', 'your-usuals'] },
    ],
    backups: ['daily-essentials', 'offers-for-you', 'namma-brands', 'snack-time'],
    cards: {},
    festival: { active: false, from: null, to: null },
    rain: false,
};
const isCard = (value) => typeof value === 'string' && CARD_IDS.includes(value);
const isMinute = (value) => Number.isInteger(value) && value >= 0 && value <= 1440;
const isDate = (value) => typeof value === 'string' && /^\d{4}-\d\d-\d\d$/.test(value);
const HEX = /^#[0-9a-f]{6}$/i;
const text = (value, max) => (typeof value === 'string' && value.trim() && value.trim().length <= max ? value.trim() : undefined);
function parseOverride(value) {
    if (!value || typeof value !== 'object')
        return null;
    const row = value;
    const out = {};
    if (typeof row.enabled === 'boolean')
        out.enabled = row.enabled;
    const title = text(row.title, 40);
    if (title)
        out.title = title;
    const line = text(row.line, 80);
    if (line)
        out.line = line;
    if (typeof row.accent === 'string' && HEX.test(row.accent))
        out.accent = row.accent;
    if (Array.isArray(row.categories)) {
        const names = row.categories.map(name => text(name, 60)).filter((name) => !!name);
        if (names.length)
            out.categories = [...new Set(names)].slice(0, 12);
    }
    return out;
}
export function parseConfig(raw) {
    const row = (raw && typeof raw === 'object' ? raw : {});
    const slots = Array.isArray(row.slots) ? row.slots.flatMap(slot => {
        const s = slot;
        const cards = Array.isArray(s?.cards) ? s.cards.filter(isCard) : [];
        return typeof s?.key === 'string' && isMinute(s.from) && isMinute(s.to) && s.from !== s.to && cards.length
            ? [{ key: s.key, from: s.from, to: s.to, cards: cards.slice(0, 4) }] : [];
    }) : [];
    const backups = Array.isArray(row.backups) ? row.backups.filter(isCard) : [];
    const cards = {};
    if (row.cards && typeof row.cards === 'object') {
        for (const [id, value] of Object.entries(row.cards)) {
            const override = isCard(id) ? parseOverride(value) : null;
            if (override)
                cards[id] = override;
        }
    }
    const festival = (row.festival ?? {});
    return {
        slots: slots.length ? slots : DEFAULT_CONFIG.slots,
        backups: backups.length ? [...new Set(backups)] : DEFAULT_CONFIG.backups,
        cards,
        festival: { active: festival.active === true, from: isDate(festival.from) ? festival.from : null, to: isDate(festival.to) ? festival.to : null },
        rain: row.rain === true,
    };
}

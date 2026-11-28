import { describe, expect, it } from 'vitest';
import { contrastRatio, DEFAULT_CONFIG, ITEM_IDS, readConfig, validateConfig } from '../../../packages/today-grid/index.js';

const paths = (raw: unknown) => validateConfig(raw).errors.map(e => e.path);
const messages = (raw: unknown) => validateConfig(raw).errors.map(e => e.message).join(' | ');

describe('validateConfig', () => {
  it('accepts the recommended defaults, including every default accent/text pair', () => {
    expect(validateConfig(DEFAULT_CONFIG).errors).toEqual([]);
    for (const id of ITEM_IDS) expect(contrastRatio(DEFAULT_CONFIG.items[id].accent, DEFAULT_CONFIG.items[id].tagText)).toBeGreaterThanOrEqual(4.5);
  });
  it('rejects placeholders the card does not support', () => {
    expect(messages({ items: { 'tea-coffee': { tag: 'Landed {time}' } } })).toMatch(/Unknown placeholder \{time\}/);
    expect(messages({ items: { 'tea-coffee': { tag: 'From {price}' } } })).toMatch(/Unknown placeholder \{price\}/);
    expect(paths({ items: { 'todays-catch': { tag: 'Landed {time}' } } })).toEqual([]);
    expect(messages({ items: { 'tea-coffee': { title: 'Tea {min}' } } })).toMatch(/Titles cannot hold/);
  });
  it('requires a placeholder-free fallback tag when the tag has a placeholder', () => {
    expect(paths({ items: { 'tea-coffee': { tag: 'From ₹{min}', fallbackTag: 'From ₹{min}' } } })).toContain('items.tea-coffee.fallbackTag');
  });
  it('enforces title/line limits', () => {
    expect(paths({ items: { 'tea-coffee': { title: 'x'.repeat(25) } } })).toContain('items.tea-coffee.title');
    expect(paths({ items: { 'tea-coffee': { line: 'x'.repeat(41) } } })).toContain('items.tea-coffee.line');
  });
  it('blocks a tag below 4.5:1 and suggests a fix', () => {
    const { errors } = validateConfig({ items: { 'snack-time': { accent: '#F2A900', tagText: '#FFFFFF' } } });
    expect(errors[0]).toMatchObject({ path: 'items.snack-time.accent', message: expect.stringMatching(/must be at least 4.5:1/), suggestion: expect.stringMatching(/use accent #/) });
    expect(paths({ items: { 'fish-meat': { accent: '#0B1F4D', tagText: '#FFD84D' } } })).toEqual([]);
    expect(paths({ items: { 'tea-coffee': { tagText: '#000000' } } })).toContain('items.tea-coffee.tagText');
  });
  it('slots must cover 24h with no gaps or overlaps', () => {
    const gap = structuredClone(DEFAULT_CONFIG.slots); gap[0]!.to = 8 * 60;
    expect(messages({ slots: gap })).toMatch(/gap at 08:00/);
    const overlap = structuredClone(DEFAULT_CONFIG.slots); overlap[0]!.to = 10 * 60;
    expect(messages({ slots: overlap })).toMatch(/overlap at 09:00/);
  });
  it('no duplicate, disabled or modifier-only cards in a slot', () => {
    const dup = structuredClone(DEFAULT_CONFIG.slots); dup[0]!.cards = ['tea-coffee', 'tea-coffee'];
    expect(messages({ slots: dup })).toMatch(/same card twice/);
    expect(messages({ items: { 'tea-coffee': { enabled: false } }, slots: DEFAULT_CONFIG.slots })).toMatch(/Tea & Coffee is disabled and cannot be placed/);
    const special = structuredClone(DEFAULT_CONFIG.slots); special[0]!.cards = ['party-orders'];
    expect(messages({ slots: special })).toMatch(/added by a modifier/);
  });
  it('backups and modifier cards must be enabled', () => {
    expect(messages({ items: { 'snack-time': { enabled: false } }, backups: DEFAULT_CONFIG.backups })).toMatch(/cannot be a backup/);
    expect(messages({ items: { 'glo-bulk': { enabled: false } }, modifiers: DEFAULT_CONFIG.modifiers })).toMatch(/Glo Bulk is disabled/);
  });
  it('rejects unknown cards and bad targets', () => {
    expect(paths({ items: { nope: {} } })).toContain('items.nope');
    expect(paths({ items: { 'tea-coffee': { target: { type: 'url', href: 'x' } } } })).toContain('items.tea-coffee.target');
  });
});

describe('readConfig (endpoint, lenient)', () => {
  it('keeps valid edits and falls back for the rest', () => {
    const c = readConfig({ items: { 'tea-coffee': { title: 'Chai', accent: 'red' } }, slots: 'bad', modifiers: { newUsers: { threshold: 99 } } });
    expect(c.items['tea-coffee'].title).toBe('Chai');
    expect(c.items['tea-coffee'].accent).toBe(DEFAULT_CONFIG.items['tea-coffee'].accent);
    expect(c.slots).toEqual(DEFAULT_CONFIG.slots);
    expect(c.modifiers.newUsers.threshold).toBe(2);
  });
});

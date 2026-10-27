import { expect, it } from 'vitest';
import { sectionLive } from './homeSections.js';

it('a section is live only while switched on and inside its schedule', () => {
  const now = Date.parse('2026-10-27T12:00:00Z');
  expect(sectionLive({ enabled: true }, now)).toBe(true);
  expect(sectionLive({ enabled: false }, now)).toBe(false);
  expect(sectionLive({ enabled: true, starts_at: '2026-10-28T00:00:00Z' }, now)).toBe(false);
  expect(sectionLive({ enabled: true, starts_at: '2026-10-27T00:00:00Z', ends_at: '2026-10-27T12:00:00Z' }, now)).toBe(false);
  expect(sectionLive({ enabled: true, starts_at: '2026-10-27T00:00:00Z', ends_at: '2026-10-28T00:00:00Z' }, now)).toBe(true);
});

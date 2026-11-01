import { describe, expect, it } from 'vitest';
import { MAX_EVENTS_PER_BATCH, parseRiderEvents } from './riderEvents.js';

const NOW = Date.parse('2026-11-01T10:00:00Z');
const rider = 'rider-1';

describe('rider event parsing', () => {
  it('keeps allowlisted events with their props, version and platform', () => {
    const rows = parseRiderEvents({
      app_version: '1.0.1', platform: 'android',
      events: [{ name: 'offer_accepted', at: '2026-11-01T09:59:00Z', props: { order_id: 'o1', seconds_left: 12, from_push: true } }],
    }, rider, NOW);
    expect(rows).toEqual([{
      rider_id: rider, name: 'offer_accepted', props: { order_id: 'o1', seconds_left: 12, from_push: true },
      occurred_at: '2026-11-01T09:59:00.000Z', app_version: '1.0.1', platform: 'android',
    }]);
  });

  it('drops unknown names and malformed entries instead of failing the batch', () => {
    const rows = parseRiderEvents({ events: [{ name: 'hack' }, null, 'x', { name: 'app_opened' }] }, rider, NOW);
    expect(rows.map((r) => r.name)).toEqual(['app_opened']);
  });

  it('strips nested, oversized, phone-like and badly keyed props', () => {
    const [row] = parseRiderEvents({ events: [{ name: 'screen_viewed', props: {
      screen: 'Home', nested: { a: 1 }, long: 'x'.repeat(65), phone: '9945147769', 'Bad-Key': 'v', nan: NaN,
    } }] }, rider, NOW);
    expect(row.props).toEqual({ screen: 'Home' });
  });

  it('replaces implausible client timestamps with arrival time', () => {
    const rows = parseRiderEvents({ events: [
      { name: 'app_opened', at: '2020-01-01T00:00:00Z' },
      { name: 'app_opened', at: '2027-01-01T00:00:00Z' },
      { name: 'app_opened', at: 'garbage' },
    ] }, rider, NOW);
    expect(rows.every((r) => r.occurred_at === new Date(NOW).toISOString())).toBe(true);
  });

  it('caps the batch size and ignores a bad platform/version', () => {
    const events = Array.from({ length: MAX_EVENTS_PER_BATCH + 10 }, () => ({ name: 'went_online' }));
    const rows = parseRiderEvents({ events, platform: 'windows', app_version: 'v'.repeat(40) }, rider, NOW);
    expect(rows).toHaveLength(MAX_EVENTS_PER_BATCH);
    expect(rows[0].platform).toBeNull();
    expect(rows[0].app_version).toBeNull();
  });

  it('returns nothing for a body without an events array', () => {
    expect(parseRiderEvents(undefined, rider, NOW)).toEqual([]);
    expect(parseRiderEvents({ events: 'nope' }, rider, NOW)).toEqual([]);
  });
});

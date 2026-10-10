import { describe, expect, it } from 'vitest';
import { FLEET_AUDIENCES, fleetPushKind, fleetPushMessages, isFleetAudience } from './fleetPush.js';

describe('isFleetAudience', () => {
  it('accepts exactly the three fleet audiences', () => {
    for (const a of FLEET_AUDIENCES) expect(isFleetAudience(a)).toBe(true);
  });
  it('rejects the customer audiences and anything else', () => {
    for (const bad of ['customer', 'all_customers', 'all', '', 'rider', undefined, null, 7]) expect(isFleetAudience(bad)).toBe(false);
  });
});

describe('fleetPushKind', () => {
  it('routes partners to the partner app and both rider audiences to the rider app', () => {
    expect(fleetPushKind('partners')).toBe('partner');
    expect(fleetPushKind('all_riders')).toBe('rider');
    expect(fleetPushKind('online_riders')).toBe('rider');
  });
});

describe('fleetPushMessages', () => {
  it('builds one high-priority admin_message per token with the kind + audience the apps branch on', () => {
    expect(fleetPushMessages(['tok1'], 'online_riders', 'Surge', 'Come online')).toEqual([
      { to: 'tok1', title: 'Surge', body: 'Come online', priority: 'high', data: { type: 'admin_message', kind: 'rider', audience: 'online_riders' } },
    ]);
  });
  it('drops blank tokens and de-duplicates a rider signed in on two stale installs', () => {
    const msgs = fleetPushMessages(['tok1', '', 'tok1', 'tok2'], 'partners', 'Notice', 'Read this');
    expect(msgs.map((m) => m.to)).toEqual(['tok1', 'tok2']);
    expect(msgs.every((m) => m.data.kind === 'partner')).toBe(true);
  });
  it('returns nothing for an empty audience', () => {
    expect(fleetPushMessages([], 'all_riders', 't', 'b')).toEqual([]);
  });
});

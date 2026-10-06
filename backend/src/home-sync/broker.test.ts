import { describe, expect, it } from 'vitest';
import { HomeBroker, parseScope } from './broker.js';
describe('Scoped inventory fan-out', () => {
  it('sends stock changes only to subscribed stores, not everyone in a zone', () => {
    const broker = new HomeBroker<string>();
    broker.add('A', { storeIds: ['a'], zoneIds: ['zone'] });
    broker.add('B', { storeIds: ['b'], zoneIds: ['zone'] });
    broker.add('settings-only', { storeIds: [], zoneIds: [] });
    expect([...broker.recipients({ type: 'inventory', storeIds: ['a'], zoneIds: ['zone'], storeChanged: false })]).toEqual(['A']);
    expect(broker.recipients({ type: 'content' }).size).toBe(3);
  });
  it('notifies both old and new zones on store moves, once per client', () => {
    const broker = new HomeBroker<string>();
    broker.add('moving', { storeIds: ['a'], zoneIds: ['old', 'new'] });
    broker.add('new-zone', { storeIds: [], zoneIds: ['new'] });
    broker.add('unrelated', { storeIds: [], zoneIds: ['elsewhere'] });
    expect([...broker.recipients({ type: 'inventory', storeIds: ['a'], zoneIds: ['old', 'new'], storeChanged: true })]).toEqual(['moving', 'new-zone']);
  });
  it('removes all indexes when a stream closes', () => {
    const broker = new HomeBroker<string>();
    const remove = broker.add('A', { storeIds: ['a', 'a'], zoneIds: ['zone'] });
    remove(); remove(); expect(broker.size).toBe(0);
    expect(broker.recipients({ type: 'inventory', storeIds: ['a'], zoneIds: ['zone'], storeChanged: true }).size).toBe(0);
  });
  it('bounds and validates public scope requests', () => {
    const id = '10000000-0000-0000-0000-000000000001';
    expect(parseScope(undefined, 1)).toEqual([]);
    expect(parseScope(`${id},${id}`, 1)).toEqual([id]);
    expect(parseScope([id], 1)).toBeNull(); expect(parseScope('anything', 100)).toBeNull();
    expect(parseScope(`${id},20000000-0000-0000-0000-000000000002`, 1)).toBeNull();
  });
});

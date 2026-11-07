import { bookingDates, cartConflict, cartPreorder, dayLabel, formatDeliveryWindow } from '../src/store/preorder';
import { useCartStore } from '../src/store/useCartStore';
import { mustPickInDetail } from '../src/store/cartIdentity';

// 2026-11-06 22:00 IST.
const now = new Date('2026-11-06T16:30:00Z');
const slot = { id: '00000000-0000-4000-8000-0000000000b1', label: '7 – 9 AM', startsMinute: 420, endsMinute: 540 };
const idli = { id: 'idli', productId: 'idli', name: 'Idli', weight: '4 pcs', price: 40, storeId: 's1', preorderMinQty: 10 };

describe('pre-order day and slot', () => {
  it('offers a week of days from the notice, in India time', () => {
    expect(bookingDates(1, now)).toEqual(['2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']);
    expect(bookingDates(2, now)[0]).toBe('2026-11-08');
    expect(dayLabel('2026-11-07', now)).toBe('Tomorrow');
    expect(dayLabel('2026-11-08', now)).toBe('Sun 8 Nov');
    expect(cartPreorder('2026-11-08', slot, now)).toEqual({ date: '2026-11-08', slotId: slot.id, label: 'Sun 8 Nov · 7 – 9 AM' });
    expect(formatDeliveryWindow('2026-11-08T01:30:00Z', '2026-11-08T03:30:00Z', now)).toBe('Sun 8 Nov, 7:00 AM – 9:00 AM');
  });
  it('labels tomorrow using the India calendar day rather than the machine clock', () => {
    const from = '2026-11-08T01:30:00Z';
    const until = '2026-11-08T03:30:00Z';
    expect(formatDeliveryWindow(from, until, new Date('2026-11-06T18:29:59Z'))).toBe('Sun 8 Nov, 7:00 AM – 9:00 AM');
    expect(formatDeliveryWindow(from, until, new Date('2026-11-06T18:30:00Z'))).toBe('Tomorrow, 7:00 AM – 9:00 AM');
  });
  it('never mixes a pre-order with quick delivery or another shop', () => {
    expect(cartConflict([], idli)).toBeNull();
    expect(cartConflict([{ storeId: 's1' }], idli)).toMatch(/quick delivery/);
    expect(cartConflict([idli], { storeId: 's1' })).toMatch(/has a pre-order/);
    expect(cartConflict([idli], { ...idli, storeId: 's2' })).toMatch(/one shop/);
    expect(cartConflict([idli], idli)).toBeNull();
    expect(mustPickInDetail({ preorder: { minQty: 10, leadDays: 1 } })).toBe(true);
  });
});

describe('pre-order cart lines', () => {
  beforeEach(() => useCartStore.getState().clear());
  it('starts at the bulk minimum, keeps the slot, and never drops below the minimum', () => {
    const cart = useCartStore.getState();
    cart.addItem(idli);
    expect(useCartStore.getState().items).toHaveLength(0);
    cart.addItem(idli, cartPreorder('2026-11-07', slot, now));
    expect(useCartStore.getState().items[0]!.quantity).toBe(10);
    expect(useCartStore.getState().preorder?.slotId).toBe(slot.id);
    useCartStore.getState().incrementItem('idli');
    useCartStore.getState().decrementItem('idli');
    expect(useCartStore.getState().items[0]!.quantity).toBe(10);
    useCartStore.getState().decrementItem('idli');
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().preorder).toBeNull();
  });
  it('refuses a quick-delivery item in a pre-order cart', () => {
    useCartStore.getState().addItem(idli, cartPreorder('2026-11-07', slot, now));
    useCartStore.getState().addItem({ id: 'milk', productId: 'milk', name: 'Milk', weight: '500 ml', price: 30, storeId: 's1' });
    expect(useCartStore.getState().items.map((i) => i.id)).toEqual(['idli']);
  });
});

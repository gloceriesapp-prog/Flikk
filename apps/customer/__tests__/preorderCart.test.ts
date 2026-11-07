import { bookingDates, cartConflict, cartPreorder, dayCard, dayLabel, dayOpen, formatDeliveryWindow, slotOpen } from '../src/store/preorder';
import { useCartStore } from '../src/store/useCartStore';
import { mustPickInDetail } from '../src/store/cartIdentity';

// 2026-11-06 22:00 IST.
const now = new Date('2026-11-06T16:30:00Z');
const slot = { id: '00000000-0000-4000-8000-0000000000b1', label: '7 – 9 AM', startsMinute: 420, endsMinute: 540 };
const idli = { id: 'idli', productId: 'idli', name: 'Idli', weight: '4 pcs', price: 40, storeId: 's1', preorderMinQty: 10 };

describe('pre-order day and slot', () => {
  it('offers today and the next 4 days, in India time', () => {
    expect(bookingDates(now)).toEqual(['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10']);
    expect(dayLabel('2026-11-06', now)).toBe('Today');
    expect(dayLabel('2026-11-07', now)).toBe('Tomorrow');
    expect(dayLabel('2026-11-08', now)).toBe('Sun 8 Nov');
    expect(dayCard('2026-11-08', now)).toEqual({ top: 'sun', day: 8, month: 'nov' });
    expect(dayCard('2026-11-06', now).top).toBe('today');
  });
  it('greys out days without notice or open slots', () => {
    const evening = { ...slot, startsMinute: 1080, endsMinute: 1200 };
    // 22:00 IST: nothing left today.
    expect(dayOpen('2026-11-06', 0, [slot, evening], now)).toBe(false);
    expect(dayOpen('2026-11-07', 0, [slot], now)).toBe(true);
    expect(dayOpen('2026-11-07', 2, [slot], now)).toBe(false);
    // 14:00 IST: 6 PM is open (4 h away), 7 AM is gone; 17:00: 6 PM too close.
    expect(slotOpen('2026-11-06', evening, new Date('2026-11-06T08:30:00Z'))).toBe(true);
    expect(slotOpen('2026-11-06', slot, new Date('2026-11-06T08:30:00Z'))).toBe(false);
    expect(slotOpen('2026-11-06', evening, new Date('2026-11-06T11:30:00Z'))).toBe(false);
  });
  it('labels the cart delivery', () => {
    expect(cartPreorder('2026-11-08', slot, now)).toEqual({ date: '2026-11-08', slotId: slot.id, label: 'Sun 8 Nov · 7 – 9 AM' });
    expect(formatDeliveryWindow('2026-11-08T01:30:00Z', '2026-11-08T03:30:00Z', now)).toMatch(/8 Nov, 7:00 AM – 9:00 AM$/);
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

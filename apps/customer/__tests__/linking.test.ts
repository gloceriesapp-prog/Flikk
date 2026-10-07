import { stateFromDeepLink } from '../src/navigation/linking';

const id = '3f1c2b9a-1d2e-4f50-8a6b-7c8d9e0f1a2b';

test('valid deep links map to screens with Home underneath', () => {
  expect(stateFromDeepLink('home')).toEqual({ routes: [{ name: 'Home' }] });
  expect(stateFromDeepLink(`order/${id}`)?.routes[1]).toEqual({ name: 'TrackOrder', params: { orderId: id, isTrip: false, paymentMethodLabel: '' } });
  expect(stateFromDeepLink(`/order/${id}?trip=1`)?.routes[1]).toMatchObject({ params: { isTrip: true } });
  expect(stateFromDeepLink(`store/${id}`)?.routes[1]).toMatchObject({ name: 'StoreDetail', params: { storeId: id } });
});

test('unknown paths and malformed ids open nothing', () => {
  expect(stateFromDeepLink('order/not-a-uuid')).toBeUndefined();
  expect(stateFromDeepLink('order')).toBeUndefined();
  expect(stateFromDeepLink(`order/${id}/extra`)).toBeUndefined();
  expect(stateFromDeepLink(`admin/${id}`)).toBeUndefined();
  expect(stateFromDeepLink('home/x')).toBeUndefined();
});

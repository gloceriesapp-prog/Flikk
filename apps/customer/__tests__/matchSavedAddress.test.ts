import { cartAddressForLocation, matchSavedAddress } from '../src/features/delivery-address/matchSavedAddress';
import type { ApiAddress } from '../src/api/addresses';
const pin = { latitude: 13.2, longitude: 74.7 };
const home = { id: 'home', latitude: pin.latitude, longitude: pin.longitude, is_default: true, label: 'Home' } as ApiAddress;
const work = { ...home, id: 'work', is_default: false, latitude: 13.3 };
it('reuses the address at the confirmed pin despite small GPS rounding', () => {
  expect(matchSavedAddress([home, work], { ...pin, latitude: pin.latitude + 0.00005 })?.id).toBe('home');
  expect(cartAddressForLocation([home, work], { latitude: work.latitude, longitude: pin.longitude })?.id).toBe('work');
});
it('requires new details for a different location rather than using the old default', () => {
  expect(cartAddressForLocation([home], { ...pin, latitude: 13.5 })).toBeNull();
  expect(matchSavedAddress([{ ...home, latitude: null }], pin)).toBeNull();
  expect(matchSavedAddress([home], { latitude: NaN, longitude: 74.7 })).toBeNull();
});
it('preserves the chosen recipient when saved addresses share a pin', () => {
  expect(matchSavedAddress([{ ...home, id: 'other', is_default: false }, home], pin)?.id).toBe('home');
});
it('uses the saved default only when there is no selected Home pin', () => {
  expect(cartAddressForLocation([work, home], null)?.id).toBe('home');
});

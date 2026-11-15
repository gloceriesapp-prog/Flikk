import { locationFromAddress, mapAddressLabel, savedMapAddress } from '../src/features/delivery-address/mapAddress';
import { reverseGeocode } from '../src/location/geocoding';
jest.mock('../src/location/geocoding', () => ({ reverseGeocode: jest.fn() }));
const geocode = jest.mocked(reverseGeocode);
const address = { latitude: 13.3, longitude: 74.7, map_address: 'Katapady, Udupi, Karnataka', line1: 'Flat 12, second floor, blue gate' };
beforeEach(() => geocode.mockReset());
test('selected address displays the map label, leaving rider details unchanged', async () => {
  expect(mapAddressLabel(address)).toBe(address.map_address);
  expect(await locationFromAddress(address)).toMatchObject({ addressLabel: address.map_address, source: 'manual' });
  expect(geocode).not.toHaveBeenCalled();
  expect(address.line1).toBe('Flat 12, second floor, blue gate');
});
test('repairs legacy map labels copied from rider details using the actual pin', async () => {
  geocode.mockResolvedValue({ addressLabel: 'Katapady, Udupi', shortName: 'Katapady', city: 'Udupi', resolved: true });
  const legacy = { ...address, map_address: address.line1 };
  expect(savedMapAddress(legacy)).toBe('');
  const pin = await locationFromAddress(legacy);
  expect(geocode).toHaveBeenCalledWith({ latitude: address.latitude, longitude: address.longitude });
  expect(pin?.addressLabel).toBe('Katapady, Udupi');
  expect(mapAddressLabel(legacy, pin)).toBe('Katapady, Udupi');
  expect(mapAddressLabel({ ...legacy, latitude: 14 }, pin)).toBe('Selected map location');
});
test('offline legacy selection preserves the pin without exposing reference details as its address', async () => {
  geocode.mockRejectedValue(new Error('offline'));
  expect(await locationFromAddress({ ...address, map_address: null })).toMatchObject({ latitude: 13.3, longitude: 74.7, addressLabel: 'Selected map location' });
  expect(await locationFromAddress({ ...address, latitude: null })).toBeNull();
});

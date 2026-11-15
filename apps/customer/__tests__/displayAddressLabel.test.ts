import { displayAddressLabel } from '../src/location/geocoding';

describe('displayAddressLabel', () => {
  it('drops a leading Plus Code but keeps the rest of the address', () => {
    expect(displayAddressLabel('7QF5+WRJ, Yenna Gudde, Karnataka 574106, India')).toBe('Yenna Gudde, Karnataka 574106, India');
  });
  it('leaves named addresses alone', () => {
    expect(displayAddressLabel('Kaup Beach Road, Kaup, Karnataka')).toBe('Kaup Beach Road, Kaup, Karnataka');
    expect(displayAddressLabel('House 7+2, MG Road')).toBe('House 7+2, MG Road');
  });
});

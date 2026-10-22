import { addressDetailsReady } from '../src/screens/address/addressDetailsValidation';
const details = { building: '4B, Shanti Nivas', street: 'Temple Road, Yenna Gudde', landmark: 'Opposite school', instructions: 'Ground floor, blue gate', recipientName: 'Customer', recipientPhone: '+919000000000', label: 'Home' };
it('requires the address and receiver details before confirmation', () => {
  expect(addressDetailsReady(details)).toBe(true);
  for (const field of Object.keys(details).filter(field => field !== 'instructions')) expect(addressDetailsReady({ ...details, [field]: '  ' })).toBe(false);
});
it('rejects unusable receiver numbers and oversized delivery details', () => {
  for (const recipientPhone of ['123', '1234567890', '+91900000000a']) expect(addressDetailsReady({ ...details, recipientPhone })).toBe(false);
  expect(addressDetailsReady({ ...details, street: 'x'.repeat(141) })).toBe(false);
  expect(addressDetailsReady({ ...details, recipientPhone: '9000000000' })).toBe(true);
});

it('allows empty floor and entrance directions, while retaining their length limit', () => {
  expect(addressDetailsReady({ ...details, instructions: '' })).toBe(true);
  expect(addressDetailsReady({ ...details, instructions: '  ' })).toBe(true);
  expect(addressDetailsReady({ ...details, instructions: 'x'.repeat(301) })).toBe(false);
});

import { preorderMinimumLabel } from '../src/store/preorderQuantity';
it('shows real weight and piece minimums instead of mislabelling pack counts', () => {
  expect(preorderMinimumLabel(12, '1 kg')).toBe('Minimum 12 kg');
  expect(preorderMinimumLabel(3, '0.5 kg')).toBe('Minimum 1.5 kg');
  expect(preorderMinimumLabel(4, '500 g')).toBe('Minimum 2 kg');
  expect(preorderMinimumLabel(12, '1 pc')).toBe('Minimum 12 pc');
  expect(preorderMinimumLabel(3, '4 pieces')).toBe('Minimum 12 pc');
  expect(preorderMinimumLabel(3, 'Family pack')).toBe('Minimum 3 packs');
});

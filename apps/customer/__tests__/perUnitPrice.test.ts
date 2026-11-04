import { getPerUnitPriceLabel } from '../src/utils/perUnitPrice';

describe('getPerUnitPriceLabel', () => {
  it('prices per kg, L and piece', () => {
    expect(getPerUnitPriceLabel('kg', 5, 318)).toBe('₹63.6/kg');
    expect(getPerUnitPriceLabel('kg', 1, 65)).toBe('₹65/kg');
    expect(getPerUnitPriceLabel('g', 500, 40)).toBe('₹80/kg');
    expect(getPerUnitPriceLabel('ml', 500, 95)).toBe('₹190/L');
    expect(getPerUnitPriceLabel('l', 1.5, 210)).toBe('₹140/L');
    expect(getPerUnitPriceLabel('pc', 12, 78)).toBe('₹6.5/pc');
  });
  it('skips a single piece and bad input', () => {
    expect(getPerUnitPriceLabel('pc', 1, 20)).toBeNull();
    expect(getPerUnitPriceLabel('kg', 0, 20)).toBeNull();
    expect(getPerUnitPriceLabel('kg', 1, 0)).toBeNull();
  });
});

import { productShareMessage } from '../src/utils/shareProduct';

describe('product share text', () => {
  it('names the product, size, price and shop, and links Gloceries', () => {
    expect(productShareMessage({ name: 'Daawat Basmati Rice', weight: '1 kg', price: 152, storeName: 'Srikanth Stores' }))
      .toBe('Daawat Basmati Rice (1 kg) for ₹152 at Srikanth Stores. Order it on Gloceries: https://gloceries.com');
    expect(productShareMessage({ name: 'Amul Tru, 180 ml', weight: '180 ml', price: 10 })).toBe('Amul Tru, 180 ml for ₹10. Order it on Gloceries: https://gloceries.com');
    expect(productShareMessage({ name: 'Idli', price: 40 })).toBe('Idli for ₹40. Order it on Gloceries: https://gloceries.com');
  });
});

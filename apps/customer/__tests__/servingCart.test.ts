import { cartIdentity, cartLineId, checkoutItems, mustPickInDetail } from '../src/store/cartIdentity';

const productId = '00000000-0000-4000-8000-000000000041';
const packId = '00000000-0000-4000-8000-000000000042';

describe('chilled / room temperature cart lines', () => {
  it('keeps chilled and room temperature as separate lines', () => {
    expect(cartLineId(productId, packId, undefined, undefined, 'chilled')).not.toBe(cartLineId(productId, packId, undefined, undefined, 'room_temperature'));
    expect(cartLineId(productId, packId)).toBe(`${productId}::${packId}`);
  });
  it('sends the serving to checkout', () => {
    const id = cartLineId(productId, packId, undefined, undefined, 'chilled');
    expect(checkoutItems([{ id, productId, variantId: packId, serving: 'chilled', quantity: 1, price: 40 }]))
      .toEqual([{ product_id: productId, variant_id: packId, quantity: 1, expected_unit_price: 40, serving: 'chilled' }]);
  });
  it('drops an unknown stored serving and reads ids that carry one', () => {
    expect(cartIdentity({ id: 'x', productId, variantId: packId, serving: 'frozen' as never }).serving).toBeUndefined();
    expect(cartIdentity({ id: cartLineId(productId, packId, 'large', undefined, 'chilled') })).toMatchObject({ productId, variantId: packId });
  });
  it('sends card ADD to the detail view only when there is a choice', () => {
    expect(mustPickInDetail({ servingOptions: ['chilled', 'room_temperature'] })).toBe(true);
    expect(mustPickInDetail({ servingOptions: ['chilled'] })).toBe(false);
    expect(mustPickInDetail({})).toBe(false);
  });
});

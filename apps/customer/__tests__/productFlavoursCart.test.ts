import { cartIdentity, cartLineId, checkoutItems } from '../src/store/cartIdentity';

const productId = '00000000-0000-4000-8000-000000000031';
const packId = '00000000-0000-4000-8000-000000000032';
const masala = '00000000-0000-4000-8000-000000000033';
const tomato = '00000000-0000-4000-8000-000000000034';

describe('flavour cart lines', () => {
  it('keeps each flavour as its own line', () => {
    expect(cartLineId(productId, packId, undefined, masala)).not.toBe(cartLineId(productId, packId, undefined, tomato));
    expect(cartLineId(productId, packId)).toBe(`${productId}::${packId}`);
  });
  it('sends the flavour to checkout', () => {
    const id = cartLineId(productId, packId, undefined, masala);
    expect(checkoutItems([{ id, productId, variantId: packId, optionId: masala, quantity: 2, price: 20 }]))
      .toEqual([{ product_id: productId, variant_id: packId, quantity: 2, expected_unit_price: 20, option_id: masala }]);
  });
  it('drops a malformed stored flavour id', () => {
    expect(cartIdentity({ id: 'x', productId, variantId: packId, optionId: 'masala' }).optionId).toBeUndefined();
  });
  it('reads ids written with a flavour and a cut', () => {
    const id = cartLineId(productId, packId, 'large', masala);
    expect(cartIdentity({ id })).toMatchObject({ productId, variantId: packId });
  });
});

import { describe, expect, it } from 'vitest';
import {
  deriveStockStatus,
  formatVariantUnit,
  resolveEditImage,
  toProductPatchRow,
  toProductRow,
  toVariantPayload,
  validateProductInput,
  validateProductPatch,
  type ProductInput,
  type VariantInput,
} from './products.js';

function validVariant(overrides: Partial<VariantInput> = {}): VariantInput {
  return { unitType: 'g', quantity: 250, price: 15, ...overrides };
}

function validInput(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    storeId: 'store-1',
    name: 'Onion',
    category: 'Vegetables & Fruits',
    stockStatus: 'in_stock',
    variants: [validVariant()],
    ...overrides,
  };
}

describe('validateProductInput', () => {
  it('accepts a minimal valid input', () => {
    expect(() => validateProductInput(validInput())).not.toThrow();
  });

  it('rejects a missing storeId', () => {
    expect(() => validateProductInput(validInput({ storeId: '' }))).toThrow(/storeId/);
  });

  it('rejects a blank name', () => {
    expect(() => validateProductInput(validInput({ name: '   ' }))).toThrow(/name/);
  });

  it('rejects an invalid stockStatus', () => {
    expect(() => validateProductInput(validInput({ stockStatus: 'nearly_out' as never }))).toThrow(/stockStatus/);
  });

  it('rejects zero variants', () => {
    expect(() => validateProductInput(validInput({ variants: [] }))).toThrow(/at least one size/i);
  });

  it('rejects a variant with an invalid unitType', () => {
    expect(() => validateProductInput(validInput({ variants: [validVariant({ unitType: 'oz' as never })] }))).toThrow(
      /unitType/,
    );
  });

  it('rejects a variant with a zero or negative quantity', () => {
    expect(() => validateProductInput(validInput({ variants: [validVariant({ quantity: 0 })] }))).toThrow(/quantity/);
    expect(() => validateProductInput(validInput({ variants: [validVariant({ quantity: -1 })] }))).toThrow(/quantity/);
  });

  it('rejects a variant with a negative price', () => {
    expect(() => validateProductInput(validInput({ variants: [validVariant({ price: -5 })] }))).toThrow(/price/);
  });

  it('rejects a variant with a negative originalPrice', () => {
    expect(() =>
      validateProductInput(validInput({ variants: [validVariant({ originalPrice: -1 })] })),
    ).toThrow(/originalPrice/);
  });

  it('validates every variant, not just the first', () => {
    expect(() =>
      validateProductInput(validInput({ variants: [validVariant(), validVariant({ price: -1 })] })),
    ).toThrow(/variants\[1\]/);
  });

  it('accepts a kg variant with a custom fractional quantity', () => {
    expect(() =>
      validateProductInput(validInput({ variants: [validVariant({ unitType: 'kg', quantity: 2.5 })] })),
    ).not.toThrow();
  });
});

describe('formatVariantUnit', () => {
  it('formats grams', () => {
    expect(formatVariantUnit({ unitType: 'g', quantity: 250, price: 0 })).toBe('250 g');
  });

  it('formats a whole kg', () => {
    expect(formatVariantUnit({ unitType: 'kg', quantity: 1, price: 0 })).toBe('1 kg');
  });

  it('formats a fractional custom kg without a trailing .00', () => {
    expect(formatVariantUnit({ unitType: 'kg', quantity: 2.5, price: 0 })).toBe('2.5 kg');
  });

  it('formats litres with a capital L', () => {
    expect(formatVariantUnit({ unitType: 'l', quantity: 1, price: 0 })).toBe('1 L');
  });

  it('formats pieces', () => {
    expect(formatVariantUnit({ unitType: 'pc', quantity: 6, price: 0 })).toBe('6 pc');
  });
});

describe('toProductRow', () => {
  it('ignores approval and ownership fields injected into a product payload', () => {
    const input = {
      ...validInput(),
      approval_status: 'approved',
      approved_by: 'attacker',
      owner_user_id: 'attacker',
      store_id: 'another-store',
      role: 'admin',
    };
    const row = toProductRow(input);
    expect(row.store_id).toBe(input.storeId);
    for (const field of ['approval_status', 'approved_by', 'owner_user_id', 'role']) {
      expect(row).not.toHaveProperty(field);
    }
  });

  it('denormalizes the default (first) variant onto the product row', () => {
    const row = toProductRow(validInput({ variants: [validVariant({ price: 15 }), validVariant({ unitType: 'kg', quantity: 1, price: 52 })] }));
    expect(row.price).toBe(15);
    expect(row.unit).toBe('250 g');
  });

  it('trims whitespace on free-text fields', () => {
    const row = toProductRow(validInput({ name: '  Onion  ', category: '  Vegetables  ' }));
    expect(row.name).toBe('Onion');
    expect(row.category).toBe('Vegetables');
  });

  it('drops the default variant\'s originalPrice when it is not actually a discount', () => {
    expect(toProductRow(validInput({ variants: [validVariant({ price: 100, originalPrice: 90 })] })).original_price).toBeNull();
    expect(toProductRow(validInput({ variants: [validVariant({ price: 100, originalPrice: 120 })] })).original_price).toBe(120);
  });

  it('defaults isVeg to true when unset', () => {
    expect(toProductRow(validInput()).is_veg).toBe(true);
  });

  it('turns empty optional strings into null, not empty strings', () => {
    const row = toProductRow(validInput({ imageUrl: '', localName: '   ' }));
    expect(row.image_url).toBeNull();
    expect(row.local_name).toBeNull();
  });

  it('omits stock_quantity entirely when unset, keeping the caller stockStatus', () => {
    const row = toProductRow(validInput({ stockStatus: 'out_of_stock' }));
    expect('stock_quantity' in row).toBe(false);
    expect(row.stock_status).toBe('out_of_stock');
  });

  it('persists a real count and derives status from it, overriding the caller stockStatus', () => {
    // Partner sends stockStatus in_stock but a count of 0 — the count wins.
    const row = toProductRow(validInput({ stockStatus: 'in_stock', stockQuantity: 0 }));
    expect(row.stock_quantity).toBe(0);
    expect(row.stock_status).toBe('out_of_stock');
  });

  it('derives low_stock at the threshold and in_stock above it', () => {
    expect(toProductRow(validInput({ stockQuantity: 10 })).stock_status).toBe('low_stock');
    expect(toProductRow(validInput({ stockQuantity: 11 })).stock_status).toBe('in_stock');
  });
});

describe('resolveEditImage', () => {
  it('queues a new image on an approved (live) product without touching image_url', () => {
    const cols = resolveEditImage('old.jpg', 'approved', 'new.jpg');
    expect(cols.pending_image_url).toBe('new.jpg');
    expect('image_url' in cols).toBe(false);
  });

  it('writes a new image straight to image_url on a not-yet-approved product', () => {
    expect(resolveEditImage('old.jpg', 'pending', 'new.jpg')).toEqual({ image_url: 'new.jpg' });
    expect(resolveEditImage('old.jpg', 'rejected', 'new.jpg')).toEqual({ image_url: 'new.jpg' });
  });

  it('is a no-op when the image is unchanged (after trim), even if approved', () => {
    expect(resolveEditImage('same.jpg', 'approved', '  same.jpg  ')).toEqual({});
    expect(resolveEditImage(null, 'approved', '   ')).toEqual({});
  });
});

describe('deriveStockStatus', () => {
  it('maps quantity to the three states across the threshold boundary', () => {
    expect(deriveStockStatus(0)).toBe('out_of_stock');
    expect(deriveStockStatus(-3)).toBe('out_of_stock');
    expect(deriveStockStatus(1)).toBe('low_stock');
    expect(deriveStockStatus(10)).toBe('low_stock');
    expect(deriveStockStatus(11)).toBe('in_stock');
  });
});

describe('toVariantPayload', () => {
  it('keeps the client order (index 0 is the default pack) and pack ids', () => {
    const payload = toVariantPayload([validVariant({ id: 'v-250' }), validVariant({ unitType: 'kg', quantity: 1, price: 52 })]);
    expect(payload.map((p) => [p.id, p.unit_type, p.quantity])).toEqual([['v-250', 'g', 250], [undefined, 'kg', 1]]);
  });

  it('omits stock_quantity when no count was sent, so the RPC keeps the stored count', () => {
    const [pack] = toVariantPayload([validVariant({ id: 'v-250', price: 18 })]);
    expect(pack).not.toHaveProperty('stock_quantity');
    expect(pack?.price).toBe(18);
  });

  it('sends each pack its own count, including zero', () => {
    const payload = toVariantPayload([validVariant({ stockQuantity: 0 }), validVariant({ unitType: 'kg', quantity: 1, stockQuantity: 7 })]);
    expect(payload.map((p) => p.stock_quantity)).toEqual([0, 7]);
  });

  it('applies a product-level count to a single-pack product only', () => {
    expect(toVariantPayload([validVariant()], 9)[0]?.stock_quantity).toBe(9);
    expect(toVariantPayload([validVariant({ stockQuantity: 2 })], 9)[0]?.stock_quantity).toBe(2);
    const multi = toVariantPayload([validVariant(), validVariant({ unitType: 'kg', quantity: 1 })], 9);
    expect(multi.some((p) => 'stock_quantity' in p)).toBe(false);
  });

  it('resolves each variant\'s own originalPrice independently', () => {
    const payload = toVariantPayload([validVariant({ price: 15, originalPrice: 20 }), validVariant({ unitType: 'kg', quantity: 1, price: 52, originalPrice: 40 })]);
    expect(payload[0]?.original_price).toBe(20);
    expect(payload[1]?.original_price).toBeNull();
  });
});

describe('validateProductInput pack rules', () => {
  it('rejects a duplicate size and a negative or fractional pack count', () => {
    expect(() => validateProductInput(validInput({ variants: [validVariant(), validVariant()] }))).toThrow(/only be listed once/);
    expect(() => validateProductInput(validInput({ variants: [validVariant({ stockQuantity: -1 })] }))).toThrow(/stockQuantity/);
    expect(() => validateProductInput(validInput({ variants: [validVariant({ stockQuantity: 1.5 })] }))).toThrow(/stockQuantity/);
  });
});

describe('partial product updates', () => {
  it('writes only the fields present in the request', () => {
    validateProductPatch({ name: ' Onion ' });
    expect(toProductPatchRow({ name: ' Onion ' })).toEqual({ name: 'Onion' });
  });

  it('never nulls admin metadata the partner app does not send', () => {
    const input = { name: 'Onion', category: 'Vegetables & Fruits', stockStatus: 'in_stock' as const, variants: [validVariant()] };
    validateProductPatch(input);
    const row = toProductPatchRow(input);
    for (const column of ['local_name', 'description', 'freshness_tag', 'is_veg', 'image_url', 'store_id', 'stock_quantity']) {
      expect(row).not.toHaveProperty(column);
    }
    expect(row).toMatchObject({ unit: '250 g', price: 15, original_price: null });
  });

  it('clears a text field only when the request explicitly sends it empty', () => {
    expect(toProductPatchRow({ description: '  ' })).toEqual({ description: null });
    expect(toProductPatchRow({ isVeg: false })).toEqual({ is_veg: false });
  });

  it('leaves denormalized price/unit alone when sizes are not sent', () => {
    expect(toProductPatchRow({ stockStatus: 'out_of_stock' })).toEqual({ stock_status: 'out_of_stock' });
  });

  it('validates present fields only', () => {
    expect(() => validateProductPatch({})).not.toThrow();
    expect(() => validateProductPatch({ name: '' })).toThrow(/name/);
    expect(() => validateProductPatch({ variants: [] })).toThrow(/at least one size/i);
    expect(() => validateProductPatch({ isVeg: 'yes' })).toThrow(/isVeg/);
    expect(() => validateProductPatch({ description: 5 })).toThrow(/description/);
    expect(() => validateProductPatch(null)).toThrow();
  });
});

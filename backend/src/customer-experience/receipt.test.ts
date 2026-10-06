import { expect, it } from 'vitest';
import { receiptItems, withReceiptAddress } from './receipt.js';
it('uses immutable name and image snapshots instead of renamed catalogue records', () => {
 expect(receiptItems([{ product_name_at_order: 'Original rice', product_image_at_order: 'old.png', unit_at_order: '1 kg', products: { name: 'Changed rice', image_url: 'new.png', unit: '500 g' } }])[0].products).toEqual({ name: 'Original rice', image_url: 'old.png', unit: '1 kg' });
});
it('uses the saved delivery address instead of mutable address-book records', () => {
 const snapshot = { line1: 'Original', recipient_phone: '919000000001' };
 expect(withReceiptAddress({ delivery_address_at_order: snapshot, addresses: { line1: 'Changed' } }).addresses).toEqual(snapshot);
});
it('retains explicit compatibility for historical receipts with no snapshot', () => {
 const row = { addresses: { line1: 'Legacy' }, delivery_address_at_order: null };
 expect(withReceiptAddress(row)).toBe(row);
 const items = [{ products: { name: 'Legacy catalogue' } }]; expect(receiptItems(items)).toEqual(items);
});

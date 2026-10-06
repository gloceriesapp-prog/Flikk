import { createItem, createSelection } from './model.js';
import { selectContentProducts } from './selection.js';
import { validateContent } from './validation.js';

// Explicit, temporary seed data. Never used as a customer-side stock fallback.
// Pass approved, available food listings only; no products or stores are created.
export function buildPreviewContent(records, products) {
  if (!products.length) throw new Error('Preview content needs available food products.');
  const discounted = products.filter((p) => Number.isFinite(p.original_price) && p.original_price > p.price);
  const manual = (rows) => ({
    ...createSelection(),
    mode: 'manual',
    productIds: rows.slice(0, 100).map((p) => p.id),
  });
  const rotate = (rows, offset) => {
    const start = offset % rows.length;
    return [...rows.slice(start), ...rows.slice(0, start)];
  };
  return records.map((record) => {
    const content = structuredClone(record.content);
    content.sections.forEach((section, index) => {
      if (['products', 'hero', 'stores'].includes(section.kind)) {
        const candidates = section.selection.discountedOnly ? discounted : products;
        const preferred = selectContentProducts(candidates, section.selection);
        const selected = new Set(preferred.map((p) => p.id));
        // Fill sparse collections with real sample food cards for layout review.
        section.selection = manual([
          ...preferred,
          ...rotate(candidates, index).filter((p) => !selected.has(p.id)),
        ]);
        section.selection.discountedOnly = candidates === discounted;
      }
      if (section.kind === 'categories') {
        section.items.forEach((item, itemIndex) => {
          const preferred = selectContentProducts(products, item.selection);
          const rows = preferred.length ? preferred : rotate(products, itemIndex);
          item.selection = manual(rows);
          item.imageUrl ||= rows.find((p) => p.image_url)?.image_url || '';
        });
      }
      if (section.kind === 'brands' && !section.items.length) {
        section.items = ['Sample Pantry', 'Sample Coast', 'Sample Kitchen'].map((title, itemIndex) => ({
          ...createItem(`sample-brand-${itemIndex + 1}`, title),
          backgroundColor: '#FFFFFF',
          selection: manual(rotate(products, itemIndex * 2)),
        }));
      }
    });
    return { ...record, content: validateContent(content) };
  });
}

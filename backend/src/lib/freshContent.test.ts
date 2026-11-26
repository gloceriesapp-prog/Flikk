import { describe, expect, it } from 'vitest';
import { DEFAULT_CONTENT, createSection, selectContentProducts, validateContent } from '../../../packages/home-content/index.js';
import { publicHomeContent } from './publicHomeContent.js';

describe('published Fresh choices', () => {
  const productId = '00000000-0000-4000-8000-000000000001';
  const shelf = { ...createSection('products', 'village-vegetables', 'Village vegetables'), freshPlacement: 'village' as const };
  shelf.selection = { ...shelf.selection, mode: 'manual', productIds: [productId] };
  const draft = { ...DEFAULT_CONTENT.fresh, freshTabs: { everyday: 'Market Fresh', village: 'Village Fresh' }, sections: [shelf] };
  it('round-trips titles, placements and exact product selections as one document', () => {
    expect(validateContent(JSON.parse(JSON.stringify(draft)))).toEqual(draft);
    const publicRow = publicHomeContent(draft);
    expect(publicRow.freshTabs).toEqual(draft.freshTabs);
    expect(publicRow.freshSectionPlacements).toEqual({ 'village-vegetables': 'village' });
    expect(publicRow.content).not.toHaveProperty('freshTabs');
    expect((publicRow.content as typeof draft).sections[0]).not.toHaveProperty('freshPlacement');
    // The wire content remains compatible with the previously strict schema.
    expect(validateContent(publicRow.content).sections[0].selection.productIds).toEqual([productId]);
    expect(draft.sections[0].freshPlacement).toBe('village');
  });
  it('rejects unsupported placement and missing, oversized or indistinguishable titles', () => {
    for (const freshTabs of [{ everyday: '', village: 'Village' }, { everyday: 'A'.repeat(25), village: 'Village' }, { everyday: 'Fresh', village: 'fresh' }]) {
      expect(() => validateContent({ ...draft, freshTabs })).toThrow();
    }
    for (const freshPlacement of ['guess-from-name', null, false]) {
      expect(() => validateContent({ ...draft, sections: [{ ...shelf, freshPlacement }] })).toThrow();
    }
    expect(() => validateContent({ ...draft, sections: [{ ...shelf, kind: 'footer' }] })).toThrow();
  });
  it('accepts the third choice: Fruits title and fruits placement, and keeps titles distinct', () => {
    const fruitShelf = { ...shelf, id: 'mango-season', freshPlacement: 'fruits' as const };
    const withFruits = { ...draft, freshTabs: { everyday: 'Vegetables', fruits: 'Fruits', village: 'Village Fresh' }, sections: [fruitShelf] };
    expect(validateContent(JSON.parse(JSON.stringify(withFruits)))).toEqual(withFruits);
    expect(publicHomeContent(withFruits).freshSectionPlacements).toEqual({ 'mango-season': 'fruits' });
    expect(() => validateContent({ ...withFruits, freshTabs: { everyday: 'Fresh', fruits: 'FRESH', village: 'Village' } })).toThrow();
    // Titles saved before Fruits existed stay valid.
    expect(validateContent({ ...draft, freshTabs: { everyday: 'Veg', village: 'Village' } }).freshTabs).toEqual({ everyday: 'Veg', village: 'Village' });
  });
  it('never fills a curated section with unselected vegetables', () => {
    const products = [productId, '00000000-0000-4000-8000-000000000002'].map(id => ({ id, name: 'Tomato', category: 'Vegetables' }));
    expect(selectContentProducts(products, shelf.selection).map(p => p.id)).toEqual([productId]);
    expect(selectContentProducts(products, { ...shelf.selection, productIds: [] })).toEqual([]);
  });
});

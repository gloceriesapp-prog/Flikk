import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTENT,
  createSection,
  addMissingFestivalSections,
  createFestivalSections,
  createItem,
  validateContent,
  referencedIds,
  selectContentProducts,
} from '../../../packages/home-content/index.js';
import { mergeManagedTabs } from '../../../apps/customer/src/screens/home/content/mergeTabs';

const ids = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
];
function fixture() {
  return structuredClone(DEFAULT_CONTENT.grocery);
}
const products = ids.map((id, i) => ({
  id,
  name: ['Rice', 'Coconut oil', 'Hair oil'][i]!,
  category: 'Grocery',
  sub_category_id: ids[i],
  store_id: ids[i],
  price: 20,
  original_price: i === 0 ? 30 : null,
}));
describe('Home content publication contract', () => {
  it('validates all seeded tabs and preserves the existing 30-section order', () => {
    expect(
      Object.values(DEFAULT_CONTENT).map((doc) => validateContent(doc).sections.length),
    ).toEqual([11, 9, 10, 10, 3]);
    expect(DEFAULT_CONTENT.fresh.sections[4]?.id).toBe('home-grown-nearby');
  });
  it('rejects unknown renderers, duplicate keys, and non-boolean visibility', () => {
    const doc = fixture();
    doc.sections[0]!.kind = 'script' as never;
    expect(() => validateContent(doc)).toThrow('invalid section type');
    const duplicate = fixture();
    duplicate.sections.push(duplicate.sections[0]!);
    expect(() => validateContent(duplicate)).toThrow('duplicate');
    const visibility = fixture();
    visibility.enabled = 'false' as never;
    expect(() => validateContent(visibility)).toThrow('true or false');
  });
  it('rejects unsafe image URLs and malformed colors', () => {
    const doc = fixture();
    for (const url of [
      'javascript:alert(1)',
      'http://example.com/a.png',
      'https://user:password@example.com/a.png',
    ]) {
      doc.sections[0]!.imageUrl = url;
      expect(() => validateContent(doc)).toThrow('HTTPS');
    }
    doc.sections[0]!.imageUrl = '';
    doc.sections[0]!.backgroundColor = 'red';
    expect(() => validateContent(doc)).toThrow('hex');
  });
  it('bounds document complexity, item counts and display limits', () => {
    const doc = fixture();
    doc.sections[0]!.limit = 25;
    expect(() => validateContent(doc)).toThrow('1 to 24');
    doc.sections[0]!.limit = 6;
    doc.sections = Array.from({ length: 41 }, (_, i) => createSection('products', `s-${i}`));
    expect(() => validateContent(doc)).toThrow('at most 40');
  });
  it('validates and deduplicates actual database references', () => {
    const doc = fixture();
    doc.sections[0]!.selection.productIds = ['fake-product'];
    expect(() => validateContent(doc)).toThrow('UUID');
    doc.sections[0]!.selection.productIds = [ids[0]!, ids[0]!];
    expect(() => validateContent(doc)).toThrow('duplicate');
    doc.sections[0]!.selection.productIds = [ids[0]!];
    const item = createItem('brand', 'Actual brand');
    item.selection.productIds = [ids[0]!, ids[1]!];
    doc.sections[0]!.items = [item];
    expect(referencedIds(doc).productIds).toEqual([ids[0], ids[1]]);
  });
});
describe('Address-scoped catalogue selection', () => {
  it('balances automatic collections rather than filling a row with one staple', () => {
    const rule = createSection('products', 'test').selection;
    rule.includeTerms = ['rice', 'oil'];
    const inventory = [
      products[0]!,
      { ...products[0]!, id: ids[2]!, name: 'Rice flour' },
      products[1]!,
    ];
    expect(selectContentProducts(inventory, rule, 2).map((product) => product.name)).toEqual([
      'Rice',
      'Coconut oil',
    ]);
  });
  it('returns only available supplied inventory, in curated order without duplicates', () => {
    const rule = createSection('products', 'test').selection;
    rule.mode = 'manual';
    rule.productIds = [ids[1]!, ids[0]!, '00000000-0000-4000-8000-000000000099'];
    expect(selectContentProducts([...products, products[0]!], rule).map((p) => p.id)).toEqual([
      ids[1],
      ids[0],
    ]);
  });
  it('does not fall back to unrelated stock for an empty curated collection', () => {
    const rule = createSection('products', 'test').selection;
    rule.mode = 'manual';
    expect(selectContentProducts(products, rule)).toEqual([]);
  });
  it('combines include, exclude, category and store rules with AND semantics', () => {
    const rule = createSection('products', 'test').selection;
    rule.includeTerms = ['oil'];
    rule.excludeTerms = ['hair'];
    rule.categoryIds = [ids[1]!];
    rule.storeIds = [ids[1]!];
    expect(selectContentProducts(products, rule).map((p) => p.name)).toEqual(['Coconut oil']);
  });
  it('only shows true discounts and honors section limits', () => {
    const rule = createSection('products', 'test').selection;
    rule.discountedOnly = true;
    expect(
      selectContentProducts([...products, { ...products[1]!, original_price: 20 }], rule).map(
        (p) => p.name,
      ),
    ).toEqual(['Rice']);
    rule.discountedOnly = false;
    expect(selectContentProducts(products, rule, 2)).toHaveLength(2);
  });
  it('treats matching terms literally, never as executable regex', () => {
    const rule = createSection('products', 'test').selection;
    rule.includeTerms = ['(a+)+$'];
    expect(selectContentProducts(products, rule)).toEqual([]);
  });
});
describe('Stable Home tab routing', () => {
  const tabs = [{ id: ids[0]!, name: 'Groceries', tiles: [], banners: [] }];
  const record = {
    tabKey: 'grocery' as const,
    homeTabId: ids[0]!,
    revision: 3,
    updatedAt: '',
    content: fixture(),
  };
  it('preserves the database tab ID when the header label changes', () => {
    record.content.tabTitle = 'Pantry';
    expect(mergeManagedTabs(tabs, [record])[0]).toMatchObject({
      id: ids[0],
      label: 'Pantry',
      contentKey: 'grocery',
    });
    expect(
      mergeManagedTabs([{ ...tabs[0]!, name: 'A renamed tab' }], [record])[0]?.contentKey,
    ).toBe('grocery');
  });
  it('removes a disabled tab rather than recreating a fallback', () => {
    const hidden = { ...record, content: { ...record.content, enabled: false } };
    expect(mergeManagedTabs(tabs, [hidden])).toEqual([]);
  });
  it('keeps unrelated tabs and adds missing configured tabs once', () => {
    const extra = { id: ids[2]!, name: 'Bakeries', tiles: [], banners: [] };
    const result = mergeManagedTabs([extra], [record]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(extra);
    expect(result[1]?.contentKey).toBe('grocery');
  });
});

it('bounds the combined managed-tab preview budget', () => {
  const content = structuredClone(DEFAULT_CONTENT.grocery);
  const template = content.sections.find(s => s.kind === 'products')!;
  content.sections = Array.from({ length: 40 }, (_, i) => ({ ...structuredClone(template), id: `budget-${i}`, enabled: true, limit: 24 }));
  expect(() => validateContent(content)).toThrow(/preview budget/);
});


describe('Festival section publication', () => {
  it('ships all named festival sections through the production content contract', () => {
    const doc = validateContent(DEFAULT_CONTENT.festivals);
    expect(doc.sections.map(section => section.id)).toEqual([
      'festival-shelf', 'festival-puja', 'festival-flowers', 'festival-sweets',
      'festival-fruits', 'festival-lights', 'festival-decor', 'festival-local-shops',
      'festival-offers', 'brand-footer',
    ]);
    expect(doc.sections.find(section => section.id === 'festival-offers')!.selection.discountedOnly).toBe(true);
    expect(doc.sections.find(section => section.id === 'festival-local-shops')!.kind).toBe('stores');
  });

  it('adds only missing shelves to legacy drafts and preserves existing manual picks, visibility and ordering', () => {
    const edited = createFestivalSections()[0]!;
    edited.title = 'Store puja picks';
    edited.enabled = false;
    edited.selection.mode = 'manual';
    edited.selection.productIds = [ids[0]!];
    const original = { ...structuredClone(DEFAULT_CONTENT.festivals), sections: [edited, createSection('footer', 'brand-footer')] };
    const upgraded = validateContent(addMissingFestivalSections(original));
    expect(upgraded.sections[0]).toEqual(edited);
    expect(upgraded.sections.at(-1)!.id).toBe('brand-footer');
    expect(upgraded.sections).toHaveLength(9);
    expect(original.sections).toHaveLength(2);
    expect(addMissingFestivalSections(upgraded)).toEqual(upgraded);
    expect(referencedIds(upgraded).productIds).toContain(ids[0]);
  });

  it('uses real matching inventory and discounts rather than sample festival stock', () => {
    const options = createFestivalSections();
    const candidates = [
      { ...products[0]!, name: 'Cotton wick', category: 'Puja' },
      { ...products[1]!, name: 'Jasmine garland', category: 'Flowers' },
      { ...products[2]!, name: 'Rice', category: 'Grocery' },
    ];
    expect(selectContentProducts(candidates, options.find(s => s.id === 'festival-puja')!.selection).map(p => p.name)).toEqual(['Cotton wick']);
    expect(selectContentProducts(candidates, options.find(s => s.id === 'festival-offers')!.selection).map(p => p.name)).toEqual(['Cotton wick']);
    expect(selectContentProducts([], options[0]!.selection)).toEqual([]);
  });
});

import { createSection, createItem, SECTION_KINDS, createSelection as selection } from './model.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function fail(path, message) {
  throw new Error(`${path}: ${message}`);
}
function object(value, path, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object');
  if (Object.keys(value).some((key) => !keys.includes(key)))
    fail(path, 'contains unsupported fields');
  return value;
}
function text(value, path, max = 120, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()))
    fail(path, `must be ${required ? 'non-empty ' : ''}text up to ${max} characters`);
  return value.trim();
}
function boolean(value, path) {
  if (typeof value !== 'boolean') fail(path, 'must be true or false');
  return value;
}
function list(value, path, max) {
  if (!Array.isArray(value) || value.length > max)
    fail(path, `must be an array of at most ${max} items`);
  return value;
}
function ids(value, path) {
  const result = list(value, path, 100).map((v) => {
    if (typeof v !== 'string' || !uuid.test(v)) fail(path, 'must contain database UUIDs');
    return v.toLowerCase();
  });
  if (new Set(result).size !== result.length) fail(path, 'contains duplicate IDs');
  return result;
}
function color(value, path) {
  const v = text(value, path, 7);
  if (v && !/^#[0-9a-f]{6}$/i.test(v)) fail(path, 'use a six-digit hex color');
  return v;
}
function url(value, path) {
  const v = text(value, path, 2048);
  if (v) {
    let parsed;
    try {
      parsed = new URL(v);
    } catch {
      fail(path, 'invalid image URL');
    }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
      fail(path, 'use a public HTTPS image URL');
  }
  return v;
}
function key(value, path) {
  const v = text(value, path, 80, true);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(v)) fail(path, 'use lowercase letters, digits and hyphens');
  return v;
}
function unique(values, path) {
  if (new Set(values.map((v) => v.id)).size !== values.length)
    fail(path, 'contains duplicate item IDs');
  return values;
}
function validateSelection(raw, path) {
  const r = object(raw, path, Object.keys(selection()));
  if (!['automatic', 'manual'].includes(r.mode)) fail(path + '.mode', 'invalid mode');
  return {
    mode: r.mode,
    productIds: ids(r.productIds, path + '.productIds'),
    categoryIds: ids(r.categoryIds, path + '.categoryIds'),
    storeIds: ids(r.storeIds, path + '.storeIds'),
    includeTerms: list(r.includeTerms, path, 80).map((v) => text(v, path, 80, true)),
    excludeTerms: list(r.excludeTerms, path, 80).map((v) => text(v, path, 80, true)),
    discountedOnly: boolean(r.discountedOnly, path + '.discountedOnly'),
  };
}
export function validateContent(raw) {
  const doc = object(raw, 'content', ['schemaVersion', 'tabTitle', 'enabled', 'sections']);
  if (doc.schemaVersion !== 1) fail('schemaVersion', 'unsupported version');
  const sections = unique(
    list(doc.sections, 'sections', 40).map((rawSection, index) => {
      const path = `sections[${index}]`,
        s = object(rawSection, path, Object.keys(createSection('products', 'new')));
      if (!SECTION_KINDS.includes(s.kind)) fail(path + '.kind', 'invalid section type');
      if (!['horizontal', 'grid'].includes(s.layout) || ![2, 3, 4].includes(s.columns))
        fail(path, 'invalid layout');
      if (!Number.isInteger(s.limit) || s.limit < 1 || s.limit > 24)
        fail(path + '.limit', 'use a whole number from 1 to 24');
      if (
        typeof s.imageAspectRatio !== 'number' ||
        !Number.isFinite(s.imageAspectRatio) ||
        s.imageAspectRatio < 0.3 ||
        s.imageAspectRatio > 5
      )
        fail(path + '.imageAspectRatio', 'use a number from 0.3 to 5');
      return {
        id: key(s.id, path + '.id'),
        kind: s.kind,
        title: text(s.title, path + '.title'),
        subtitle: text(s.subtitle, path + '.subtitle', 300),
        enabled: boolean(s.enabled, path + '.enabled'),
        layout: s.layout,
        columns: s.columns,
        limit: s.limit,
        backgroundColor: color(s.backgroundColor, path),
        imageUrl: url(s.imageUrl, path),
        imageAspectRatio: s.imageAspectRatio,
        imageFade: boolean(s.imageFade, path),
        buttonEnabled: boolean(s.buttonEnabled, path),
        buttonLabel: text(s.buttonLabel, path, 60, true),
        hideWhenEmpty: boolean(s.hideWhenEmpty, path),
        selection: validateSelection(s.selection, path + '.selection'),
        items: unique(
          list(s.items, path + '.items', 40).map((rawItem, i) => {
            const p = `${path}.items[${i}]`,
              item = object(rawItem, p, Object.keys(createItem('new')));
            return {
              id: key(item.id, p),
              title: text(item.title, p, 120, true),
              enabled: boolean(item.enabled, p),
              imageUrl: url(item.imageUrl, p),
              backgroundColor: color(item.backgroundColor, p),
              description: text(item.description, p, 300),
              origin: text(item.origin, p, 120),
              selection: validateSelection(item.selection, p + '.selection'),
            };
          }),
          path + '.items',
        ),
      };
    }),
    'sections',
  );
  const previewBudget = sections.filter(s => s.enabled).reduce((total, section) =>
    total + (['products', 'hero', 'stores'].includes(section.kind)
      ? section.kind === 'stores' ? 3 : section.limit : 0)
      + section.items.filter(item => item.enabled).length, 0);
  if (previewBudget > 600) fail('sections', 'combined preview budget must not exceed 600 products per shop');
  return {
    schemaVersion: 1,
    tabTitle: text(doc.tabTitle, 'tabTitle', 32, true),
    enabled: boolean(doc.enabled, 'enabled'),
    sections,
  };
}

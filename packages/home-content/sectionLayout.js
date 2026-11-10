const PRODUCT_LAYOUTS = new Map([
  ['everyday-dairy', 'horizontal'],
  ['trending', 'horizontal'],
  ['most-bought', 'horizontal'],
  ['deals-for-you', 'grid'],
  ['todays-best-deals', 'grid'],
  ['everyday-essentials', 'grid'],
  ['custom-tasteofudupi', 'horizontal'],
]);

export const isCustomHomeSection = (key) => /^custom-[a-z0-9]{6,32}$/.test(key);
export const isHomeProductLayout = (value) => value === 'horizontal' || value === 'grid';

export function defaultHomeProductLayout(key) {
  return PRODUCT_LAYOUTS.get(key) ?? (isCustomHomeSection(key) ? 'grid' : null);
}

export function homeProductLayout(key, override) {
  const fallback = defaultHomeProductLayout(key);
  return fallback && isHomeProductLayout(override) ? override : fallback;
}

export function homePreviewLimit(layout) {
  return layout === 'horizontal' ? 7 : 6;
}

export const DEFAULT_PREORDER_BANNER = 'https://images.gloceries.com/appsui/pre-ordr-now.png';

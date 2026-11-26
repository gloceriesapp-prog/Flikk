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
// Namma Brands header image (its banner_image_url; NULL = this default).
export const DEFAULT_NAMMA_HEADER = 'https://images.gloceries.com/appsui/Namma.png';

// Banners belong to product shelves; structural/navigation sections keep their
// own design. Namma Brands' "banner" is its header image.
export const supportsHomeBanner = (key) => key === 'preorders' || key === 'price-drops' || key === 'namma-brands' || defaultHomeProductLayout(key) !== null;
// The image a section shows when no banner is set (only some have one).
export const defaultHomeBanner = (key) => (key === 'preorders' ? DEFAULT_PREORDER_BANNER : key === 'namma-brands' ? DEFAULT_NAMMA_HEADER : '');

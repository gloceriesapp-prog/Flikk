import type { Product } from '../../home/products/types';

export type ProductSort = 'recommended' | 'price-low' | 'price-high' | 'discount';
export type FilterPanel = 'all' | 'sort' | 'type' | 'brand';
export interface ProductFilters {
  sort: ProductSort;
  type: string;
  brand: string;
  vegOnly: boolean;
  dealsOnly: boolean;
}
export interface BrandOption {
  id: string;
  name: string;
  productIds: string[];
}
export const DEFAULT_FILTERS: ProductFilters = { sort: 'recommended', type: '', brand: '', vegOnly: false, dealsOnly: false };
export const SORT_OPTIONS: { value: ProductSort; label: string; shortLabel: string }[] = [
  { value: 'recommended', label: 'Recommended', shortLabel: 'Sort By' },
  { value: 'price-low', label: 'Price: low to high', shortLabel: 'Price ↑' },
  { value: 'price-high', label: 'Price: high to low', shortLabel: 'Price ↓' },
  { value: 'discount', label: 'Highest discount', shortLabel: 'Discount' },
];

export function isRealCategoryId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function productType(product: Product): string {
  return product.categoryLabel?.trim().toLowerCase() ?? '';
}

export function getTypeOptions(products: Product[]): { id: string; label: string }[] {
  const types = new Map<string, string>();
  for (const product of products) {
    const id = productType(product);
    if (id && !types.has(id)) types.set(id, product.categoryLabel!.trim());
  }
  return [...types].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
}

function discount(product: Product): number {
  const original = product.originalPrice;
  return Number.isFinite(product.price) && product.price >= 0 && original != null && Number.isFinite(original) && original > product.price
    ? (original - product.price) / original
    : 0;
}

export function activeFilterCount(filters: ProductFilters): number {
  return Number(filters.sort !== 'recommended') + Number(Boolean(filters.type)) + Number(Boolean(filters.brand)) + Number(filters.vegOnly) + Number(filters.dealsOnly);
}

export function filterProducts(products: Product[], filters: ProductFilters, brands: BrandOption[]): Product[] {
  const brand = filters.brand ? brands.find((item) => item.id === filters.brand) : undefined;
  const brandProducts = new Set(brand?.productIds ?? []);
  const result = products.filter((product) =>
    (!filters.type || productType(product) === filters.type)
    && (!filters.brand || brandProducts.has(product.id))
    && (!filters.vegOnly || product.isVeg === true)
    && (!filters.dealsOnly || discount(product) > 0),
  );
  if (filters.sort === 'recommended') return result;
  // Stable ties retain catalogue order. Invalid prices always sort last.
  return result.sort((a, b) => {
    if (filters.sort === 'discount') return discount(b) - discount(a);
    const aValid = Number.isFinite(a.price) && a.price >= 0;
    const bValid = Number.isFinite(b.price) && b.price >= 0;
    if (aValid !== bValid) return aValid ? -1 : 1;
    if (!aValid) return 0;
    return filters.sort === 'price-low' ? a.price - b.price : b.price - a.price;
  });
}

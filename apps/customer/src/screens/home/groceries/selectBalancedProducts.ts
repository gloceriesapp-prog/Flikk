import type { ApiProduct } from '../../../api/products';

// Round-robin across product types: rice cannot occupy every position while
// dal and oil are available. Preserve distance-ranked seller order within each
// type and avoid repeating the same named pack from multiple sellers.
export function selectBalancedProducts(products: ApiProduct[], groups: RegExp[], limit = 8): ApiProduct[] {
  const buckets = groups.map(() => [] as ApiProduct[]);
  for (const product of products) {
    const group = groups.findIndex((pattern) => pattern.test(product.name));
    if (group >= 0) buckets[group].push(product);
  }

  const chosen: ApiProduct[] = [];
  const seen = new Set<string>();
  while (chosen.length < limit && buckets.some((bucket) => bucket.length > 0)) {
    for (const bucket of buckets) {
      while (bucket.length > 0) {
        const product = bucket.shift()!;
        const pack = product.product_variants.find((variant) => variant.is_default) ?? product.product_variants[0];
        const key = `${product.name.trim().toLowerCase()}|${pack?.quantity ?? ''}|${pack?.unit_type ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        chosen.push(product);
        break;
      }
      if (chosen.length === limit) break;
    }
  }
  return chosen;
}

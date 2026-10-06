// Config is data, never executable expressions. Literal terms avoid regex
// denial of service and work the same way in Node, Next and React Native.
export function selectContentProducts(products, rule, limit = Infinity) {
  const ids = new Set(rule.productIds),
    categories = new Set(rule.categoryIds),
    stores = new Set(rule.storeIds);
  const found = new Map();
  for (const product of products) {
    const text = `${product.name} ${product.category}`.toLowerCase();
    if (rule.mode === 'manual' && !ids.has(product.id)) continue;
    if (stores.size && !stores.has(product.store_id)) continue;
    if (categories.size && !categories.has(product.sub_category_id)) continue;
    if (
      rule.includeTerms.length &&
      !rule.includeTerms.some((term) => text.includes(term.toLowerCase()))
    )
      continue;
    if (rule.excludeTerms.some((term) => text.includes(term.toLowerCase()))) continue;
    if (
      rule.discountedOnly &&
      !(
        Number.isFinite(product.original_price) &&
        Number.isFinite(product.price) &&
        product.original_price > product.price
      )
    )
      continue;
    if (!found.has(product.id)) found.set(product.id, product);
  }
  let result = [...found.values()];
  if (rule.mode === 'manual')
    result.sort((a, b) => rule.productIds.indexOf(a.id) - rule.productIds.indexOf(b.id));
  else if (rule.includeTerms.length > 1) {
    // Keep staple collections balanced: rice, atta and dal each get a turn
    // rather than letting one alphabetically early product dominate the row.
    const buckets = rule.includeTerms.map((term) => ({
      products: result.filter((product) =>
        `${product.name} ${product.category}`.toLowerCase().includes(term.toLowerCase()),
      ),
      index: 0,
    }));
    const selected = new Set();
    const balanced = [];
    let hasMore = true;
    while (hasMore && balanced.length < limit) {
      hasMore = false;
      for (const bucket of buckets) {
        while (bucket.products[bucket.index] && selected.has(bucket.products[bucket.index].id))
          bucket.index += 1;
        const product = bucket.products[bucket.index++];
        if (product) {
          selected.add(product.id);
          balanced.push(product);
          hasMore = true;
        }
        if (balanced.length >= limit) break;
      }
    }
    result = balanced;
  }
  return result.slice(0, limit);
}
export function tabKeyForName(name) {
  const normalized = name.trim().toLowerCase();
  if (['grocery', 'groceries'].includes(normalized)) return 'grocery';
  if (['fresh', 'fruit & veg', 'fruits & veg'].includes(normalized)) return 'fresh';
  if (normalized === 'regional') return 'regional';
}
export function referencedIds(content) {
  const rules = content.sections.flatMap((s) => [s.selection, ...s.items.map((i) => i.selection)]);
  return Object.fromEntries(
    ['productIds', 'categoryIds', 'storeIds'].map((key) => [
      key,
      [...new Set(rules.flatMap((r) => r[key]))],
    ]),
  );
}

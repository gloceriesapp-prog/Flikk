import type { ApiProduct } from '../../../api/products';

export interface CollectionCategory { id: string; label: string; imageUrl?: string; parentId?: string }
export function collectionSidebar(products: ApiProduct[], categories: CollectionCategory[], allowedIds: string[]) {
  const present = new Set(products.map(product => product.sub_category_id));
  const allowed = new Set(allowedIds);
  return categories.filter(category => (allowed.size ? allowed.has(category.id) : present.has(category.id)));
}
export function filterCollectionCategory(products: ApiProduct[], selectedId: string) {
  return selectedId === 'all' ? products : products.filter(product => product.sub_category_id === selectedId);
}

export function catalogueParent(categories: CollectionCategory[]): string | undefined {
  const parents = [...new Set(categories.map(category => category.parentId).filter((id): id is string => Boolean(id)))];
  return parents.length === 1 ? parents[0] : undefined;
}

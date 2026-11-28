import type { CardTarget, ItemConfig } from '@/lib/home/todayGrid';

export const ACTION_LABELS: Record<string, string> = {
  'add-usuals': 'Add usuals to cart', 'party-form': 'Party order form', 'preorder-list': 'Pre-order list',
  popular: 'Popular near you list', offers: 'Offers list', bulk: 'Bulk products list',
};
export function targetLabel(target: CardTarget, categoryNames: string[] = []): string {
  switch (target.type) {
    case 'categories': { const names = target.categories.length ? target.categories : categoryNames; return `Categories: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`; }
    case 'subcategory': return 'Sub-category';
    case 'products': return `${target.productIds.length} pinned products`;
    case 'tab': return `Tab: ${target.id}`;
    case 'brands': return 'Local brands list';
    case 'action': return ACTION_LABELS[target.id] ?? target.id;
  }
}

// Where a tap goes in the app (apps/customer .../today-grid/useCardTap.ts).
export function opensLabel(item: Pick<ItemConfig, 'target' | 'bannerUrl'>): string {
  const t = item.target;
  if ((t.type === 'tab' && t.id === 'preorder') || (t.type === 'action' && t.id === 'preorder-list')) return 'Pre-order page';
  if (t.type === 'tab') return t.id === 'udupi' ? 'Udupi mode' : 'Fresh page';
  if (t.type === 'brands') return 'All brands';
  if (t.type === 'action' && t.id === 'add-usuals') return 'Adds usuals to cart';
  return item.bannerUrl ? 'Card page (own banner)' : 'Card page (grid header banner)';
}

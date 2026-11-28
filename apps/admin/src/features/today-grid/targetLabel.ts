import type { CardTarget } from '@/lib/home/todayGrid';

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

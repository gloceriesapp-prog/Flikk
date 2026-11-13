import type { ApiProduct } from '../../../api/products';
import { hasContentSelection, selectContentProducts, type HomeContentItem } from './contracts';

export function categoryTileProducts(products: ApiProduct[], items: HomeContentItem[]): ApiProduct[] {
  return [...new Map(items.filter(item => item.enabled && hasContentSelection(item.selection))
    .flatMap(item => selectContentProducts(products, item.selection)).map(product => [product.id, product])).values()];
}

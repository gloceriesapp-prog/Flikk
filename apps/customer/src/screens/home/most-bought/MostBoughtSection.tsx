import type { HomeProductLayout } from '../../../../../../packages/home-content/sectionLayout.js';
import { ProductSection } from '../products/ProductSection';
import type { Product } from '../products/types';

interface Props {
  title: string;
  subtitle?: string | null;
  products: Product[];
  layout: HomeProductLayout;
}

export function MostBoughtSection(props: Props) {
  return <ProductSection {...props} showDiscountBadge />;
}

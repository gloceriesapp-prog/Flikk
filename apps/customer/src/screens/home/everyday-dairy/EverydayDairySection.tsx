import { GroceryCollectionSection } from '../groceries/components/GroceryCollectionSection';
import { homePreviewLimit, type HomeProductLayout } from '../../../../../../packages/home-content/sectionLayout.js';
import type { Product } from '../products/types';
import { EVERYDAY_DAIRY_GROUPS } from './data';

interface Props {
  title: string;
  subtitle: string | null;
  products: Product[];
  layout: HomeProductLayout;
  pinnedOnly: boolean;
}

export function EverydayDairySection({ title, subtitle, products, layout, pinnedOnly }: Props) {
  return (
    <GroceryCollectionSection
      title={title}
      subtitle={subtitle}
      groups={EVERYDAY_DAIRY_GROUPS}
      maxProducts={homePreviewLimit(layout)}
      collectionLabel={`See all ${title}`}
      pinnedProducts={products}
      homeLayout={layout}
      pinnedOnly={pinnedOnly}
    />
  );
}

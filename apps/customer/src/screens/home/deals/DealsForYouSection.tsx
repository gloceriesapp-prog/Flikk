import type { HomeProductLayout } from '../../../../../../packages/home-content/sectionLayout.js';
import { useCopy } from '../../../api/appConfig';
import { HomeProductCollectionButton } from '../components/HomeSectionButton';
import { HomeScallopedPanel } from '../components/HomeScallopedPanel';
import { ProductSection } from '../products/ProductSection';
import type { Product } from '../products/types';

interface Props {
  products: Product[];
  collectionProducts: Product[];
  title: string;
  subtitle?: string | null;
  layout: HomeProductLayout;
}

export function DealsForYouSection({ products, collectionProducts, title, subtitle, layout }: Props) {
  const ctaLabel = useCopy('home.dealsForYou.cta');
  if (products.length === 0) return null;

  return (
    <HomeScallopedPanel title={title} subtitle={subtitle} backgroundColor="#EEF3FF">
      <ProductSection products={products} layout={layout} showDiscountBadge />

      <HomeProductCollectionButton
        label={ctaLabel}
        title={title}
        products={collectionProducts}
        preview={products}
        showDiscountBadge
      />
    </HomeScallopedPanel>
  );
}

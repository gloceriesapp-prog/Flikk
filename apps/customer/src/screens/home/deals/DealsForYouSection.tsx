import { ScrollView } from 'react-native';
import { useCopy } from '../../../api/appConfig';
import { HomeProductCollectionButton } from '../components/HomeSectionButton';
import { HomeScallopedPanel } from '../components/HomeScallopedPanel';
import { ProductCard } from '../products/ProductCard';
import type { Product } from '../products/types';

const MAX_OFFERS = 4;

interface Props {
  products: Product[];
  collectionProducts: Product[];
  title: string;
  subtitle?: string | null;
}

export function DealsForYouSection({ products, collectionProducts, title, subtitle }: Props) {
  const ctaLabel = useCopy('home.dealsForYou.cta');
  const offers = products.slice(0, MAX_OFFERS);
  if (offers.length === 0) return null;

  return (
    <HomeScallopedPanel title={title} subtitle={subtitle} backgroundColor="#EEF3FF">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
      >
        {offers.map((product) => (
          <ProductCard key={product.id} product={product} showDiscountBadge widthClassName="w-32" />
        ))}
      </ScrollView>

      <HomeProductCollectionButton
        label={ctaLabel}
        title={title}
        products={collectionProducts}
        preview={offers}
        showDiscountBadge
      />
    </HomeScallopedPanel>
  );
}

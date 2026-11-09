// The admin Festival Section's picked products as a Home rail. Renders
// nothing while no section is active or it has no products, so an inactive
// or empty admin section leaves no gap in the Home layout.
import { ScrollView, View } from 'react-native';
import { ProductCard } from '../../products/ProductCard';
import { HomeProductCollectionButton } from '../../components/HomeSectionButton';
import { SectionTitle } from '../../components/SectionTitle';
import { useFestivalSection } from './useFestivalSection';

const CARD_WIDTH = 'w-32';
const CARD_SNAP_INTERVAL = 128 + 10;
// Limit the rail while keeping all picks accessible from the collection.
const RAIL_LIMIT = 12;

interface Props {
  // Home Sections title override; the admin section title otherwise.
  title?: string;
}

export function FestivalPicksSection({ title }: Props) {
  const { data: section } = useFestivalSection();
  if (!section || section.products.length === 0) return null;
  const sectionTitle = title?.trim() || section.title;
  const preview = section.products.slice(0, RAIL_LIMIT);
  return (
    <View className="pt-8">
      <SectionTitle>{sectionTitle}</SectionTitle>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="items-start gap-2.5 px-5"
        snapToInterval={CARD_SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
      >
        {preview.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName={CARD_WIDTH} showDiscountBadge />
        ))}
      </ScrollView>
      <HomeProductCollectionButton
        label="See all festival picks"
        title={sectionTitle}
        products={section.products}
        preview={preview}
        showDiscountBadge
      />
    </View>
  );
}

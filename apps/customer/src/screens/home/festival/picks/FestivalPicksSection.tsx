import { HORIZONTAL_PRODUCT_CARD_GAP, horizontalProductCardWidth } from '../../products/horizontalProductLayout';
// The admin Festival Section's picked products as a Home rail. Renders
// nothing while no section is active or it has no products, so an inactive
// or empty admin section leaves no gap in the Home layout.
import { ScrollView, View , useWindowDimensions } from 'react-native';
import { ProductCard } from '../../products/ProductCard';
import { HomeProductCollectionButton } from '../../components/HomeSectionButton';
import { SectionTitle } from '../../components/SectionTitle';
import { useFestivalSection } from './useFestivalSection';

// Limit the rail while keeping all picks accessible from the collection.
const RAIL_LIMIT = 12;

interface Props {
  // Home Sections title override; the admin section title otherwise.
  title?: string;
}

export function FestivalPicksSection({ title }: Props) {
  const { width: viewportWidth } = useWindowDimensions();
  const cardWidth = horizontalProductCardWidth(viewportWidth);
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
        contentContainerClassName="items-start px-5"
        contentContainerStyle={{ gap: HORIZONTAL_PRODUCT_CARD_GAP }}
        snapToInterval={cardWidth + HORIZONTAL_PRODUCT_CARD_GAP}
        snapToAlignment="start"
        decelerationRate="fast"
      >
        {preview.map((product) => (
          <View key={product.id} style={{ width: cardWidth }}>
            <ProductCard product={product} widthClassName="w-full" showDiscountBadge />
          </View>
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

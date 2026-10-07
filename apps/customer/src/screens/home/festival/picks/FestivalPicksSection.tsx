// The admin Festival Section's picked products as a Home rail. Renders
// nothing while no section is active or it has no products, so an inactive
// or empty admin section leaves no gap in the Home layout.
import { ScrollView, View } from 'react-native';
import { ProductCard } from '../../products/ProductCard';
import { SectionTitle } from '../../components/SectionTitle';
import { useFestivalSection } from './useFestivalSection';

const CARD_WIDTH = 'w-32';
const CARD_SNAP_INTERVAL = 128 + 10;

interface Props {
  // Home Sections title override; the admin section title otherwise.
  title?: string;
}

export function FestivalPicksSection({ title }: Props) {
  const { data: section } = useFestivalSection();
  if (!section || section.products.length === 0) return null;
  return (
    <View className="pt-8">
      <SectionTitle>{title?.trim() || section.title}</SectionTitle>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="items-start gap-2.5 px-5"
        snapToInterval={CARD_SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
      >
        {section.products.map((product) => (
          <ProductCard key={product.id} product={product} widthClassName={CARD_WIDTH} showDiscountBadge />
        ))}
      </ScrollView>
    </View>
  );
}

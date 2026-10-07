// "Biggest Price Drops" — the premium magenta gradient DealCard row (highest
// % / ₹ off, first 4 of the nearest-store discounted feed). Renamed from the
// old "Deals for You" section: this one is specifically the price-drop
// showcase; the plain ProductCard "Deals for You" row lives in
// DealsForYouSection.tsx now.
import { ScrollView, View } from 'react-native';
import { DealCard } from './DealCard';
import { SectionTitle } from '../components/SectionTitle';
import type { Product } from '../products/types';

const MAX_OFFERS = 4;

interface Props { products: Product[]; title: string; subtitle?: string | null; }

export function PriceDropsSection({ products, title, subtitle }: Props) {
  const offers = products.slice(0, MAX_OFFERS);
  if (offers.length === 0) return null;
  return (
    <View className="bg-white pt-8">
      <SectionTitle subtitle={subtitle}>{title}</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
        {offers.map((product) => (
          <DealCard key={product.id} product={product} />
        ))}
      </ScrollView>
    </View>
  );
}

// Plain "Most Bought Near You" row leading Home's "All" tab — per an
// explicit ask, no card shell/background/"See all" button, just the
// title and the product row (PromoListCard.tsx's own note). 30-day units
// sold near the pin (GET /browse/popular?days=30) — distinct from Trending's 7 days.
//
// No horizontal padding on this wrapper — PromoListCard's own title and
// ScrollView each carry their own px-5 instead, so the ScrollView's real
// viewport spans the full screen width (a padded wrapper around it was
// the actual "not full width" bug, see that file's own note).
//
// Sits above NearbyStoresSection ("Shops Near You") on Home's "All" tab,
// per an explicit ask.

import { View } from 'react-native';
import { PromoListCard } from '../products/PromoListCard';
import type { Product } from '../products/types';

// Products come from AllTabSections (30-day popularity, minus anything
// Trending already shows); title/subtitle resolved there from admin copy.
interface Props {
  title: string;
  subtitle?: string | null;
  products: Product[];
}

export function MostBoughtSection({ title, subtitle, products }: Props) {
  if (products.length === 0) return null;

  return (
    <View className="pt-8">
      <PromoListCard title={title} subtitle={subtitle} products={products} />
    </View>
  );
}

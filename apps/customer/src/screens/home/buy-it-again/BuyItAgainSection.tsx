// "Buy It Again" — Home's "All" tab, sits right after the Seasonal/
// Festival panel (per the agreed section order: personalized-to-you rows
// lead, before general browse/discovery rows further down). Renders
// nothing for a guest, a brand-new customer with no delivered order yet,
// or while the request is still loading — same "no real data = section
// off" convention every other Home row already follows (MostBoughtSection,
// FestivalPicksSection): never a placeholder/skeleton implying content
// that isn't there.
//
// Reuses the exact same title+horizontal-scroll shell MostBoughtSection
// already renders (PromoListCard, home/products/) — this section owns
// nothing visually of its own beyond which real feed it hands that shell.

import { View } from 'react-native';
import { PromoListCard } from '../products/PromoListCard';
import { useBuyItAgain } from './useBuyItAgain';

export function BuyItAgainSection() {
  const { data: products = [] } = useBuyItAgain();

  if (products.length === 0) return null;

  return (
    <View className="pt-8">
      <PromoListCard title="Buy It Again" products={products} />
    </View>
  );
}

// Ads/deals promo card, shown on Home regardless of which category tab is
// selected. Deliberately flat — border only, no shadow, per the reference.
// Placeholder marketing copy + a random image (picsum) until there's a real
// promotions/campaigns backend to source this from.

import { View } from 'react-native';
import { DealsBannerCard } from './DealsBannerCard';
import { DealsCountdownRow } from './DealsCountdownRow';

export function DealsSection() {
  return (
    <View className="mx-5 mt-6 overflow-hidden rounded-3xl border border-mist bg-white">
      <DealsBannerCard />
      <View className="h-px bg-mist" />
      <DealsCountdownRow />
    </View>
  );
}

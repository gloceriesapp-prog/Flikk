// Ads/deals section, shown on Home's "All" tab. A single, full-width image —
// no scroll, no heading, no CTA, no countdown. Earlier versions had a
// horizontal scroll of multiple images; simplified further to one image per
// a later revision.

import { View } from 'react-native';
import { DealsImageCard } from './DealsImageCard';
import { DEAL_IMAGE_URI } from './data';

export function DealsSection() {
  return (
    <View className="px-5 pt-6">
      <DealsImageCard uri={DEAL_IMAGE_URI} />
    </View>
  );
}

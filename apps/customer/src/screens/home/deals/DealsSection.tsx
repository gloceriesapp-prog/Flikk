// Ads/deals section, shown on Home's "All" tab. A single, full-width image —
// no scroll, no heading, no CTA, no countdown. Earlier versions had a
// horizontal scroll of multiple images; simplified further to one image per
// a later revision. Uses the app-wide placeholder image, same as every
// other card — not its own hardcoded URL anymore.

import { View } from 'react-native';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { DealsImageCard } from './DealsImageCard';

export function DealsSection() {
  return (
    <View className="px-5 pt-6">
      <DealsImageCard uri={PLACEHOLDER_IMAGE_URI} />
    </View>
  );
}

// Ads/deals section, shown on Home's "All" tab. A single, full-width deal
// image — no scroll, no heading, no CTA, no countdown. Its own hardcoded
// image (not the app-wide placeholder) since this section's whole purpose
// is showing this specific deal creative.

import { View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { storageUrl } from '../../../utils/storageUrl';

const DEAL_IMAGE_URI = storageUrl('Images/deal.jpeg');

export function DealsSection() {
  return (
    <View className="px-5 pt-8">
      <View className="h-48 w-full overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-md shadow-black/15">
        <Image source={{ uri: DEAL_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
      </View>
    </View>
  );
}

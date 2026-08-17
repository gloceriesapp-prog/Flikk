// Ads/deals section, shown on Home's "All" tab. A single, full-width deal
// image — no scroll, no heading, no CTA, no countdown. Its own hardcoded
// image (not the app-wide placeholder) since this section's whole purpose
// is showing this specific deal creative.

import { Image, View } from 'react-native';

const DEAL_IMAGE_URI = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/deal.jpeg';

export function DealsSection() {
  return (
    <View className="px-5 pt-6">
      <View className="h-48 w-full overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-md shadow-black/15">
        <Image source={{ uri: DEAL_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
      </View>
    </View>
  );
}

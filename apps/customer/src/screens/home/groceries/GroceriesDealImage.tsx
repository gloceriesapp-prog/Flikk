// Replaces the old PromoBanner (badge/heading/CTA) in the Groceries tab —
// this tab now shows a single deal image, same pattern as
// ../deals/DealsSection.tsx on the "All" tab, just its own file/image since
// this one is scoped to Groceries only (Bakery/Essentials still use
// PromoBanner, see ../category-tab/components/PromoBanner.tsx).

import { Image, View } from 'react-native';

const GROCERIES_DEAL_IMAGE_URI = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/deal1.jpeg';

export function GroceriesDealImage() {
  return (
    <View className="px-5 pt-6">
      <View className="h-48 w-full overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-md shadow-black/15">
        <Image source={{ uri: GROCERIES_DEAL_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
      </View>
    </View>
  );
}

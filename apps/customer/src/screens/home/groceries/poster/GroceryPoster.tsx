import { Text, View } from 'react-native';
import { ShoppingBasket01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../../components/AppIcon';
import { PosterBanner } from '../../category-tab/components/PosterBanner';
import type { RemoteHomeTabBanner } from '../../data/useHomeTabs';

export function GroceryPoster({ banner }: { banner?: RemoteHomeTabBanner }) {
  if (banner?.imageUrl) return <PosterBanner imageUri={banner.imageUrl} />;

  return (
    <View className="mx-5 mt-7 overflow-hidden rounded-3xl bg-[#EAF3DF] px-5 py-6">
      <View className="flex-row items-center gap-4">
        <View className="flex-1">
          <Text className="text-[18px] font-bold tracking-tight text-ink">Stock Up on Essentials</Text>
        </View>
        <View className="h-20 w-20 items-center justify-center rounded-full bg-white/70">
          <AppIcon icon={ShoppingBasket01Icon} size={44} color="#526A36" strokeWidth={1.5} />
        </View>
      </View>
    </View>
  );
}

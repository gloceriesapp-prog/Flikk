// "Meet Your Local Stores" — the trust/community-moat row, deliberately
// NOT a ProductTeaserRow reuse: this row is about the merchant
// relationship itself (name + one-line story), not products. Competitors
// can't replicate this row without rebuilding the whole merchant
// relationship, which is the actual point of giving it its own component
// instead of squeezing a story string into a product-card layout that was
// never built to show one.
//
// No onPress/store-profile screen wired yet — there's no per-store
// storefront page built in this app, same "UI exists, flow not wired"
// convention as ProductCardView's own bookmark heart.

import { Store01Icon } from '@hugeicons/core-free-icons';
import { ScrollView, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { LocalStore } from './data';

interface Props {
  title: string;
  stores: LocalStore[];
}

export function LocalStoreRow({ title, stores }: Props) {
  if (stores.length === 0) return null;

  return (
    <View className="pt-6">
      <Text className="px-5 pb-4 text-lg font-bold text-ink">{title}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-5">
        {stores.map((store) => (
          <View key={store.id} className="w-60 gap-2 rounded-2xl border border-gray-100 bg-white p-4">
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-mist">
                <AppIcon icon={Store01Icon} size={16} color={colors.limeDeep} />
              </View>
              <View className="flex-1">
                <Text className="text-[13.5px] font-bold text-ink" numberOfLines={1}>
                  {store.name}
                </Text>
                <Text className="text-[11.5px] text-ink/45" numberOfLines={1}>
                  {store.area}
                </Text>
              </View>
            </View>
            <Text className="text-[12.5px] leading-4 text-ink/60" numberOfLines={2}>
              {store.story}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

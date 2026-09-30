import { Pressable, Text, View } from 'react-native';
import { ArrowRight01Icon, Store03Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../../components/AppIcon';
import { PopularProductRow } from '../../../store-list/popular/PopularProductRow';
import type { NearbyStore } from '../../nearby-stores/useNearbyStores';
import type { Product } from '../../products/types';

const ACCENT = '#155DFC';

interface Props {
  store: NearbyStore & { products: Product[] };
  onOpen: () => void;
}

export function GroceryStorePreviewCard({ store, onOpen }: Props) {
  return (
    <View className="w-[308px] overflow-hidden rounded-[28px] bg-white border border-gray-200 shadow-sm shadow-black/[0.05]">
      <Pressable accessibilityRole="button" accessibilityLabel={`Visit ${store.name}`} onPress={onOpen} className="px-4 pb-4 pt-4 active:bg-[#FAFAFA]">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5 rounded-full bg-[#155DFC]/[0.08] px-2.5 py-1.5">
            <AppIcon icon={Store03Icon} size={13} color={ACCENT} strokeWidth={2} />
            <Text className="text-[12px] font-semibold text-[#155DFC]">Nearby</Text>
          </View>
          <View className="h-9 w-9 items-center justify-center rounded-full bg-[#F7F7F7]">
            <AppIcon icon={ArrowRight01Icon} size={16} color="#111111" strokeWidth={2} />
          </View>
        </View>
        <Text numberOfLines={1} className="mt-3.5 text-[17px] font-semibold tracking-[-0.35px] text-[#111111]">{store.name}</Text>
        <View className="mt-2 flex-row flex-wrap gap-x-2 gap-y-1">
          <Text className={`text-[11px] font-semibold ${store.isOpen ? 'text-[#407039]' : 'text-ink/50'}`}>
            {store.isOpen ? 'Open now' : 'Closed now'}
          </Text>
          {store.distanceLabel && <Text className="text-[11px] text-ink/50">{store.distanceLabel} away</Text>}
        </View>
      </Pressable>
      <View className="px-2.5 pb-2.5">
        <View className="overflow-hidden rounded-2xl bg-[#F7F7F7]">
          {store.products.map((product, index) => (
            <View key={product.id} className={index === store.products.length - 1 ? '' : 'border-b border-black/[0.05]'}>
              <PopularProductRow product={product} allowAdd={store.isOpen} onPress={store.isOpen ? undefined : onOpen} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

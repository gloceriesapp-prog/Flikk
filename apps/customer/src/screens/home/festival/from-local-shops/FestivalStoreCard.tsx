import { Pressable, Text, View } from 'react-native';
import { ArrowRight01Icon, Store01Icon } from '@hugeicons/core-free-icons';
import { AppImage } from '../../../../components/AppImage';
import { AppIcon } from '../../../../components/AppIcon';
import type { NearbyStore } from '../../nearby-stores/useNearbyStores';

export function FestivalStoreCard({ store, onPress }: { store: NearbyStore; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Visit ${store.name}, ${store.isOpen ? 'open' : 'closed'}`} onPress={onPress} className="w-[224px] overflow-hidden rounded-3xl border border-ink/10 bg-white active:opacity-80">
      <View className="h-32 items-center justify-center bg-[#F5EFE5]">
        {store.photoUrl ? (
          <AppImage source={{ uri: store.photoUrl }} className="h-full w-full" resizeMode="cover" accessibilityLabel={`${store.name} storefront`} />
        ) : (
          <AppIcon icon={Store01Icon} size={42} color="#958371" strokeWidth={1.5} />
        )}
        <View className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1.5">
          <Text className={`text-[11px] font-semibold ${store.isOpen ? 'text-[#237A4B]' : 'text-ink/60'}`}>{store.isOpen ? 'Open now' : 'Closed'}</Text>
        </View>
      </View>
      <View className="p-4">
        <Text numberOfLines={1} className="text-[15px] font-bold text-ink">{store.name}</Text>
        <Text numberOfLines={1} className="mt-1 text-[12px] text-ink/60">{store.locality || store.distanceLabel || 'Nearby shop'}</Text>
        {!store.isOpen && store.openTime && <Text numberOfLines={1} className="mt-1 text-[11px] text-ink/55">Opens {store.openTime}</Text>}
        <View className="mt-4 flex-row items-center justify-between rounded-xl bg-[#F3F4F6] px-3 py-2.5">
          <Text className="text-[12px] font-semibold text-ink/80">Visit shop</Text>
          <AppIcon icon={ArrowRight01Icon} size={16} color="#48564A" />
        </View>
      </View>
    </Pressable>
  );
}

// Bottom of the Store list: the store delivering to this address, then
// "Didn't find an item?" which opens RequestProductSheet. Categories shows
// only the request block (withStore={false}).

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useCopyImage } from '../../../api/appConfig';
import { AppImage } from '../../../components/AppImage';
import { useNearestStore } from '../../home/useNearestStore';
import { GROCERY_QUICK_CATEGORY_IMAGE } from '../../home/quick-categories/data';
import { useLocationStore } from '../../../store/useLocationStore';
import { RequestProductSheet } from './RequestProductSheet';

export function RequestProductFooter({ withStore = true }: { withStore?: boolean }) {
  const city = useLocationStore((state) => state.location?.city);
  const { storeName } = useNearestStore();
  const artwork = useCopyImage('stores.requestProduct.imageUrl', GROCERY_QUICK_CATEGORY_IMAGE);
  const [open, setOpen] = useState(false);
  // New key per open, so the sheet starts empty every time.
  const [sheetKey, setSheetKey] = useState(0);

  return (
    <View className="pt-4">
      {/* Nearest store to the delivery pin (same lookup as Home); hidden
          until it resolves or when no store covers this address. */}
      {withStore && storeName && (
        <View className="mx-5 items-center rounded-2xl border border-[#9ED3B6] bg-[#E4F3EC] px-5 py-4">
          <Text className="text-center text-[16px] leading-[22px] text-[#2E4A38]">We are delivering your items from</Text>
          <Text numberOfLines={2} className="mt-1 text-center text-[16px] font-bold leading-[22px] text-[#1F3B2B]">{storeName}</Text>
        </View>
      )}

      <View className={`${withStore ? 'mt-5' : ''} overflow-hidden bg-[#F3F4F6]`}>
        <View className="flex-row items-center py-8 pl-5 pr-3">
          <View className="min-w-0 flex-1 pr-2">
            <Text accessibilityRole="header" className="text-[23px] font-bold leading-[29px] tracking-[-0.3px] text-ink">Didn’t find an item?</Text>
            <Text className="mt-2 text-[14px] leading-[20px] text-ink/65">Request a product and we’ll do our best to make it available.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => { setSheetKey((key) => key + 1); setOpen(true); }}
              className="mt-5 self-start rounded-2xl bg-[#155DFC] px-5 py-3.5 active:opacity-80"
            >
              <Text className="text-[15px] font-bold text-white">Request product</Text>
            </Pressable>
          </View>
          <AppImage source={{ uri: artwork }} style={{ width: 136, height: 136 }} resizeMode="contain" accessible={false} />
        </View>
      </View>

      <RequestProductSheet key={sheetKey} visible={open} onClose={() => setOpen(false)} city={city} storeName={storeName} />
    </View>
  );
}

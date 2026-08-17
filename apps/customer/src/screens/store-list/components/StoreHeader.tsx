// Full-bleed photo banner header — back/search circles float over the image,
// title sits bottom-left on a dark image so it stays white, rounded bottom
// corners separate it from the store list below.

import { ArrowLeft01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

const BANNER_IMAGE_URI = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/img11.png';

interface Props {
  onBack: () => void;
  onSearch: () => void;
}

export function StoreHeader({ onBack, onSearch }: Props) {
  return (
    <View className="h-64 w-full overflow-hidden rounded-b-[32px] bg-ink">
      <Image source={{ uri: BANNER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />

      <View className="absolute inset-x-5 top-0 flex-row items-center justify-between pt-safe-offset-3">
        <Pressable onPress={onBack} hitSlop={12} className="h-11 w-11 items-center justify-center rounded-full bg-white">
          <AppIcon icon={ArrowLeft01Icon} size={20} color={colors.ink} />
        </Pressable>
        <Pressable onPress={onSearch} hitSlop={12} className="h-11 w-11 items-center justify-center rounded-full bg-white">
          <AppIcon icon={Search01Icon} size={19} color={colors.ink} />
        </Pressable>
      </View>

      <View className="absolute bottom-6 left-5 right-5">
        <Text className="text-[28px] font-semibold leading-8 text-black">Shops you{'\n'}already know.</Text>
      </View>
    </View>
  );
}

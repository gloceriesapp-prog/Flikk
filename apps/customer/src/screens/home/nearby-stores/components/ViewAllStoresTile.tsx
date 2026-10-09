import {
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';

import {
  Pressable,
  Text,
  View,
} from 'react-native';

import { AppIcon } from '../../../../components/AppIcon';

interface Props {
  onPress: () => void;
  width?: number;
  aspectRatio?: number;
}

export function ViewAllStoresTile({
  onPress,
  width = 170,
  aspectRatio,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={{ width, height: aspectRatio ? width / aspectRatio : 174 }}
      className="
        items-center
        justify-center
        overflow-hidden
        rounded-[24px]
        border
        border-[#DDE5FF]
        bg-[#F6F8FF]
        px-5
        active:scale-[0.98]
      "
    >
      {/* ICON */}
      <View
        className="
          h-12
          w-12
          items-center
          justify-center
          rounded-full
          bg-primary
        "
      >
        <AppIcon
          icon={ArrowRight01Icon}
          size={20}
          color="#FFFFFF"
          strokeWidth={2}
        />
      </View>

      <Text
        className="
          mt-3
          text-center
          text-[14px]
          font-semibold
          tracking-[-0.2px]
          text-[#1C1C1C]
        "
      >
        Explore all stores
      </Text>

      <Text
        className="
          mt-1
          text-center
          text-[11px]
          font-medium
          leading-[15px]
          text-black/40
        "
      >
        Discover more stores nearby
      </Text>
    </Pressable>
  );
}

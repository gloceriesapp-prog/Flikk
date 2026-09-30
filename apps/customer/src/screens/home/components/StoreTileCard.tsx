import {
  ArrowUpRight01Icon,
} from '@hugeicons/core-free-icons';

import {
  Pressable,
  Text,
  View,
} from 'react-native';

import { AppImage as Image } from '../../../components/AppImage';
import { AppIcon } from '../../../components/AppIcon';

import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';

export interface StoreTile {
  id: string;
  name: string;
  photoUrl?: string;
  isOpen: boolean;
  openTime?: string;
  metaLabel?: string;
}

interface Props {
  store: StoreTile;
  onPress: () => void;
}

export function StoreTileCard({
  store,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="
        h-[196px]
        w-[168px]
        overflow-hidden
        rounded-[28px]
        border
        border-black/[0.05]
        bg-[#EEEEEE]
        active:scale-[0.98]
      "
    >
      {/* FULL BACKGROUND IMAGE */}
      <Image
        source={{
          uri:
            store.photoUrl ||
            PLACEHOLDER_IMAGE_URI,
        }}
        className="
          absolute
          inset-0
          h-full
          w-full
        "
        resizeMode="cover"
      />

      {/* VERY LIGHT IMAGE SCRIM */}
      <View
        className="
          absolute
          inset-0
          bg-black/[0.04]
        "
      />

      {/* TOP CONTROLS */}
      <View
        className="
          absolute
          inset-x-0
          top-0
          flex-row
          items-center
          justify-between
          p-2.5
        "
      >
        {/* STATUS */}
        <View
          className={`
            flex-row
            items-center
            gap-1.5
            rounded-full
            border
            border-white/50
            px-2.5
            py-1.5
            ${
              store.isOpen
                ? 'bg-white/90'
                : 'bg-black/70'
            }
          `}
        >
          <View
            className={`
              h-1.5
              w-1.5
              rounded-full
              ${
                store.isOpen
                  ? 'bg-[#22A05A]'
                  : 'bg-white/80'
              }
            `}
          />

          <Text
            className={`
              text-[10px]
              font-semibold
              ${
                store.isOpen
                  ? 'text-[#1C1C1C]'
                  : 'text-white'
              }
            `}
          >
            {store.isOpen
              ? 'Open'
              : 'Closed'}
          </Text>
        </View>

        {/* OPEN BUTTON */}
        <View
          className="
            h-8
            w-8
            items-center
            justify-center
            rounded-full
            border
            border-white/50
            bg-white/90
          "
        >
          <AppIcon
            icon={ArrowUpRight01Icon}
            size={14}
            color="#1C1C1C"
            strokeWidth={2}
          />
        </View>
      </View>

      {/* FLOATING STORE INFO */}
      <View
        className="
          absolute
          bottom-2.5
          left-2.5
          right-2.5
          overflow-hidden
          rounded-[19px]
          border
          border-white/60
          bg-white/95
          px-3
          py-2.5
        "
      >
        <Text
          numberOfLines={1}
          className="
            text-[14px]
            font-semibold
            tracking-[-0.25px]
            text-[#1C1C1C]
          "
        >
          {store.name}
        </Text>

        {store.metaLabel && (
          <View
            className="
              mt-1
              flex-row
              items-center
              gap-1.5
            "
          >
            <View
              className="
                h-1
                w-1
                rounded-full
                bg-black/30
              "
            />

            <Text
              numberOfLines={1}
              className="
                flex-1
                text-[11px]
                font-medium
                text-black/45
              "
            >
              {store.metaLabel}
            </Text>
          </View>
        )}

        {!store.isOpen &&
          store.openTime && (
            <Text
              numberOfLines={1}
              className="
                mt-1
                text-[10.5px]
                font-medium
                text-black/40
              "
            >
              Opens {store.openTime}
            </Text>
          )}
      </View>
    </Pressable>
  );
}
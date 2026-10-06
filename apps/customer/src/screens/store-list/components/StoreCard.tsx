import { useDeliveryEstimateMinutes } from '../../../api/deliverySettings';
import {
  ArrowRight01Icon,
  Bookmark01Icon,
  Clock01Icon,
  Location01Icon,
  StarIcon,
} from '@hugeicons/core-free-icons';

import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppImage as Image } from '../../../components/AppImage';
import { AppIcon } from '../../../components/AppIcon';
import { useLikedStoresStore } from '../../../store/useLikedStoresStore';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { getStoreStatusText } from '../storeHours';

import type { AppStackParamList } from '../../../navigation/types';
import type { RealStore } from '../all-stores/useAllStores';

interface Props {
  store: RealStore;
}

export function StoreCard({ store }: Props) {
  const estimatedMinutes = useDeliveryEstimateMinutes();
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AppStackParamList>
    >();

  const isLiked = useLikedStoresStore(
    (state) => state.isLiked(store.id),
  );

  const toggleLiked = useLikedStoresStore(
    (state) => state.toggle,
  );

  const status = getStoreStatusText(
    store.isOpen,
    store.openTime,
    store.closeTime,
  );

  const isOpen = status.word === 'Open';

  const address = [
    store.addressLine,
    store.district,
    store.city,
  ]
    .filter(Boolean)
    .join(', ');

  function goToStore() {
    navigation.navigate('StoreDetail', {
      storeId: store.id,
      storeName: store.name,
    });
  }

  return (
  <View
    className="
      rounded-[28px]
      bg-white
      shadow-sm
      shadow-black/[0.05]
    "
  >
    <Pressable
      onPress={goToStore}
      className="
        overflow-hidden
        rounded-[28px]
        bg-white
     
      "
    >
      {/* MAIN AREA */}
      <View className="flex-row gap-3 p-3">

        {/* IMAGE */}
        <View
          className="
            relative
            h-[106px]
            w-[106px]
            shrink-0
            overflow-hidden
            rounded-2xl
            bg-[#F7F7F7]
          "
        >
          <Image
            source={{
              uri:
                store.photoUrl ||
                PLACEHOLDER_IMAGE_URI,
            }}
            className="h-full w-full"
            contentFit="cover"
          />

          {/* RATING */}
          {store.rating !== undefined && (
            <View
              className="
                absolute
                bottom-2
                left-2
                flex-row
                items-center
                gap-1
                rounded-full
                bg-white/95
                px-2
                py-1
              "
            >
              <AppIcon
                icon={StarIcon}
                size={10}
                color="#F59E0B"
                fill="#F59E0B"
                strokeWidth={0}
              />

              <Text className="text-[11.5px] font-semibold text-[#111111]">
                {store.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        {/* RIGHT CONTENT */}
        <View className="min-w-0 flex-1">

          {/* CATEGORY + SAVE */}
          <View className="flex-row items-center justify-between">
            <Text
              numberOfLines={1}
              className="
                flex-1
                pr-2
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.4px]
                text-black/40
              "
            >
              {store.category}
            </Text>

            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                toggleLiked(store.id);
              }}
              hitSlop={8}
              className="
                h-8
                w-8
                items-center
                justify-center
                rounded-full
                bg-[#F7F7F7]
                active:scale-95
              "
            >
              <AppIcon
                icon={Bookmark01Icon}
                size={17}
                color={
                  isLiked
                    ? '#155DFC'
                    : '#111111'
                }
                fill={
                  isLiked
                    ? '#155DFC'
                    : undefined
                }
                strokeWidth={
                  isLiked ? 0 : 1.8
                }
              />
            </Pressable>
          </View>

          {/* NAME */}
          <Text
            numberOfLines={2}
            className="
              -mt-0.5
              pr-1
              text-[16px]
              font-semibold
              leading-[20px]
              tracking-[-0.3px]
              text-[#111111]
            "
          >
            {store.name}
          </Text>

          {/* ADDRESS */}
          {address.length > 0 && (
            <View className="mt-1.5 flex-row items-center gap-1.5">
              <AppIcon
                icon={Location01Icon}
                size={12}
                color="#8A8A8A"
                strokeWidth={1.8}
              />

              <Text
                numberOfLines={1}
                className="
                  flex-1
                  text-[11.5px]
                  font-semibold
                  text-black/45
                "
              >
                {address}
              </Text>
            </View>
          )}

          {/* STATUS */}
          <View className="mt-2 flex-row items-center gap-1.5">
            <View
              className={`
                h-1.5
                w-1.5
                rounded-full
                ${
                  isOpen
                    ? 'bg-[#16A34A]'
                    : 'bg-[#DC2626]'
                }
              `}
            />

            <Text
              className={`
                text-[12px]
                font-semibold
                ${
                  isOpen
                    ? 'text-[#15803D]'
                    : 'text-[#DC2626]'
                }
              `}
            >
              {status.word}
            </Text>

            {status.suffix ? (
              <>
                <View className="h-1 w-1 rounded-full bg-black/15" />

                <Text
                  numberOfLines={1}
                  className={`
                    flex-1
                    text-[11.5px]
                    font-semibold
                    ${
                      status.urgent
                        ? 'text-[#B7791F]'
                        : 'text-black/40'
                    }
                  `}
                >
                  {status.suffix.trim()}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </View>

      {/* DELIVERY FOOTER */}
      <View className="px-3 pb-3">
        <View
          className="
            flex-row
            items-center
            rounded-2xl
            bg-[#F7F7F7]
            px-3
            py-2.5
          "
        >
          <View
            className="
              h-8
              w-8
              items-center
              justify-center
              rounded-full
              bg-white
            "
          >
            <AppIcon
              icon={Clock01Icon}
              size={14}
              color="#155DFC"
              strokeWidth={1.9}
            />
          </View>

          <View className="ml-2.5 min-w-0 flex-1">
            <Text
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.4px]
                text-black/35
              "
            >
              Delivery
            </Text>

            <Text
              numberOfLines={1}
              className="
                mt-0.5
                text-[12.5px]
                font-semibold
                text-[#111111]
              "
            >
              {`Delivers in ~${estimatedMinutes} min`}
            </Text>
          </View>

          <View
            className="
              ml-2
              h-8
              w-8
              items-center
              justify-center
              rounded-full
              bg-white
            "
          >
            <AppIcon
              icon={ArrowRight01Icon}
              size={15}
              color="#111111"
              strokeWidth={2}
            />
          </View>
        </View>
      </View>
    </Pressable>
    </View>
  );
}
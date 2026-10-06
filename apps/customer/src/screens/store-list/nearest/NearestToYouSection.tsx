// "Nearest to you" — real horizontal card row below StoreFilterBar.
//
// Premium card treatment:
// - Pure #FFFFFF card
// - 16px radius
// - No shadows
// - Very subtle border
// - Image-forward layout
// - Real rating / distance / category / status only
// - Bookmark remains connected to useLikedStoresStore
// - Bookmark press does not accidentally open StoreDetail
//
import { useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  Bookmark01Icon,
  StarIcon,
} from '@hugeicons/core-free-icons';

import {
  AppImage as Image,
  prefetchImages,
} from '../../../components/AppImage';

import { AppIcon } from '../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { useLocationStore } from '../../../store/useLocationStore';
import { useLikedStoresStore } from '../../../store/useLikedStoresStore';
import { getStoreStatusText } from '../storeHours';

import {
  useNearestStores,
  type NearestStore,
} from './useNearestStores';

import type { AppStackParamList } from '../../../navigation/types';

const CARD_WIDTH = 232;
const PHOTO_HEIGHT = 145;
function NearestStoreCard({
  store,
}: {
  store: NearestStore;
}) {
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

  return (
    <Pressable
      onPress={() =>
        navigation.navigate('StoreDetail', {
          storeId: store.id,
          storeName: store.name,
        })
      }
      className="
        active:scale-[0.985]
        active:opacity-95
      "
      style={{
        width: CARD_WIDTH,
      }}
    >
      <View
        className="
          overflow-hidden
          rounded-2xl
          border
          border-black/[0.06]
          bg-white
        "
      >
        {/* STORE IMAGE */}
        <View
          className="
            relative
            w-full
            bg-[#F7F7F7]
          "
          style={{
            height: PHOTO_HEIGHT,
          }}
        >
          <Image
  source={{ uri: store.photoUrl || PLACEHOLDER_IMAGE_URI }}
  className="h-full w-full"
  contentFit="cover"
/>

          {/* BOOKMARK */}
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              toggleLiked(store.id);
            }}
            hitSlop={8}
            className="
              absolute
              right-3
              top-3
              h-9
              w-9
              items-center
              justify-center
              rounded-full
              border
              border-black/[0.06]
              bg-white
              active:scale-95
              active:bg-[#F7F7F7]
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

          {/* RATING */}
          {store.rating !== undefined && (
            <View
              className="
                absolute
                bottom-3
                left-3
                flex-row
                items-center
                gap-1
                rounded-full
                bg-white
                px-2.5
                py-1.5
              "
            >
              <AppIcon
                icon={StarIcon}
                size={11}
                color="#F59E0B"
                fill="#F59E0B"
                strokeWidth={0}
              />

              <Text
                className="
                  text-[12px]
                  font-semibold
                  text-[#111111]
                "
              >
                {store.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        {/* STORE INFORMATION */}
        <View
          className="
            bg-white
            px-3.5
            pb-3.5
            pt-3
          "
        >
          {/* CATEGORY */}
          <Text
            numberOfLines={1}
            className="
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.45px]
              text-black/45
            "
          >
            {store.category}
          </Text>

          {/* STORE NAME */}
          <Text
            numberOfLines={1}
            className="
              mt-1
              text-[16px]
              font-semibold
              tracking-[-0.3px]
              text-[#111111]
            "
          >
            {store.name}
          </Text>

          {/* DISTANCE + STATUS */}
          <View
            className="
              mt-2.5
              flex-row
              items-center
            "
          >
            {store.distanceKm != null && (
              <>
                <Text
                  className="
                    text-[12.5px]
                    font-semibold
                    text-black/55
                  "
                >
                  {store.distanceKm.toFixed(1)} km
                </Text>

                <View
                  className="
                    mx-2
                    h-1
                    w-1
                    rounded-full
                    bg-black/20
                  "
                />
              </>
            )}

            <View
              className="
                flex-row
                items-center
                gap-1.5
              "
            >
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
                  text-[12.5px]
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
            </View>
          </View>

          {/* STORE HOURS */}
          {status.suffix ? (
            <Text
              numberOfLines={1}
              className={`
                mt-1.5
                text-[11.5px]
                font-semibold
                ${
                  status.urgent
                    ? 'text-[#B7791F]'
                    : 'text-black/45'
                }
              `}
            >
              {status.suffix.trim()}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function NearestToYouSection() {
  const location = useLocationStore(state => state.location);
  const { data: stores = [], isPending, isError, refetch } = useNearestStores();

  useEffect(() => {
    prefetchImages(stores.flatMap(store => store.photoUrl ? [store.photoUrl] : []));
  }, [stores]);

  if (stores.length === 0) {
    return (
      <View className="px-5 pt-6">
        <Text className="mb-3 text-lg font-semibold text-ink">Nearest to you</Text>
        <Text className="text-sm text-ink/60">
          {!location ? 'Choose your location to discover nearby shops.'
            : isError ? 'Could not find nearby shops. Please try again.'
            : isPending ? 'Finding your neighbourhood favourites…'
            : 'No shops nearby yet. Try another delivery location.'}
        </Text>
        {isError && <Pressable onPress={() => void refetch()} accessibilityRole="button" className="mt-3">
          <Text className="font-semibold text-[#155DFC]">Try again</Text>
        </Pressable>}
      </View>
    );
  }

  return (
    <View className="pt-6">
      {/* SECTION TITLE */}
      <Text
        className="
          mb-3.5
          px-5
          text-[18px]
          font-bold
          tracking-[-0.35px]
          text-[#111111]
        "
      >
        Nearest to you
      </Text>

      {/* HORIZONTAL STORE CARDS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="
          gap-3
          px-5
          pb-1
        "
      >
        {stores.map((store) => (
          <NearestStoreCard
            key={store.id}
            store={store}
          />
        ))}
      </ScrollView>
    </View>
  );
}
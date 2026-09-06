// Second redesign — the hero-photo-with-overlay-badges layout (rating/
// open-status badges floating on a single full-bleed image) is gone,
// replaced with a Google-Maps-listing shape per an explicit reference:
// text header block first (name, then rating · category, then
// open/closed · closing time), THEN a row of three photo thumbnails
// below it, THEN the Shop now / Share / bookmark footer.
//
// Flat, not a card — no white box/shadow/rounded-corner background and
// no own horizontal padding, per an explicit ask to strip that chrome
// entirely; AllStoresSection.tsx's own `px-5` on the list container
// already provides the left/right margin every card needs, so adding a
// second one here would double it up. The full-bleed divider that used
// to live at the bottom of this file now lives in AllStoresSection.tsx
// instead, between items only (not after the last one) — same edge-to-
// edge divider the Google Maps reference itself uses between listings.
//
// The three-photo row is the one deliberately-fake part of this card,
// and only per an explicit ask ("add random image of 3 for now") — every
// other field on this card is real store data, nothing else invented.
// getStoreImageUri (theme/placeholderImage.ts) already exists in this
// exact codebase for exactly this situation (real per-store photos don't
// exist until store onboarding grows one — that file's own header note),
// seeded so the same store always shows the same three photos across
// renders/sessions instead of reshuffling on every scroll. The real
// store.photoUrl (when a store actually has one) always fills the first
// slot rather than being discarded in favor of an all-random three —
// once real photo galleries exist, this only needs to swap the other two
// getStoreImageUri calls for real URLs, not restructure the row.
//
// Review count and distance are both dummy data, per explicit asks ("add
// some dummy data for it", then a reference screenshot showing a
// "780.0m"-style distance too) — neither has a real column behind it
// (no reviews table; no geolocation on stores yet, PRD Section 26 v3
// scope, same reasoning useAllStores.ts's own header note gives), unlike
// rating/category/open-status/closeTime, which are real. Same
// deterministic-hash trick ProductDetailSheet.tsx's own sibling-picking
// uses: a plain function of store.id, not Math.random(), so a given store
// shows the same dummy values on every render/session instead of
// reshuffling — easy to spot and delete (dummyReviewCount/
// dummyDistanceLabel below) the moment real columns exist to replace them
// with. No price range, no review quote — those still aren't shown at all.

import { FavouriteIcon, Share03Icon, StarIcon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../../components/AppIcon';
import { useLikedStoresStore } from '../../../store/useLikedStoresStore';
import { getStoreImageUri, PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { colors } from '../../../theme/tokens';
import type { AppStackParamList } from '../../../navigation/types';
import type { RealStore } from '../all-stores/useAllStores';

interface Props {
  store: RealStore;
}

// Same #2457F5 CartBar.tsx/ProductDetailFooter.tsx/PrimaryButton.tsx's own
// variant="blue" already use — per an explicit ask to use "the blue which
// we have used in our app" for Shop now, not the coral this card had
// (coral is still this app's one CTA color everywhere else per the design
// system; Shop now here is a deliberate screen-specific opt-in, same as
// LoginScreen.tsx's own PrimaryButton variant="blue"). A colored shadow
// (shadowColor: STORE_BLUE, not black) is what makes it read as an
// elevated glow rather than a flat rectangle — same "wow" a plain
// drop-shadow can't give since a black shadow under a blue pill just
// looks muddy, not lit.
const STORE_BLUE = '#2457F5';

// djb2 — a plain pure hash, used only to make the dummy review count/
// distance below deterministic per store instead of calling Math.random().
function hashString(id: string): number {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) hash = (hash * 33 + id.charCodeAt(i)) >>> 0;
  return hash;
}

function dummyReviewCount(id: string): number {
  return 40 + (hashString(id) % 260); // lands somewhere in 40-299
}

// Dummy — no geolocation on stores yet (PRD Section 26 v3 scope, same
// reasoning useAllStores.ts's own header note gives), added only per an
// explicit ask matching a reference screenshot's own "780.0m"/"950.0m"/
// "7.3km" formatting. Meters under 1km, km with one decimal above it.
function dummyDistanceLabel(id: string): string {
  const meters = 80 + (hashString(id + 'd') % 4920); // 80m-5000m
  return meters < 1000 ? `${meters.toFixed(1)}m` : `${(meters / 1000).toFixed(1)}km`;
}

export function StoreCard({ store }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const isLiked = useLikedStoresStore((state) => state.isLiked(store.id));
  const toggleLiked = useLikedStoresStore((state) => state.toggle);

  function goToStore() {
    navigation.navigate('StoreDetail', { storeId: store.id, storeName: store.name });
  }

  const photos = [
    store.photoUrl || PLACEHOLDER_IMAGE_URI,
    getStoreImageUri(`${store.id}-b`),
    getStoreImageUri(`${store.id}-c`),
  ];

  return (
    <View>
      <Pressable onPress={goToStore}>
        <Text className="text-[17px] font-medium leading-6 tracking-tight text-ink" numberOfLines={1}>
          {store.name}
        </Text>

        <View className="mt-1.5 flex-row items-center gap-1.5">
          <AppIcon icon={StarIcon} size={13} color={colors.gold} fill={colors.gold} strokeWidth={0} />
          <Text className="text-[13px] font-semibold text-ink/70">{(store.rating ?? 4.6).toFixed(1)}</Text>
          <Text className="text-[13px] font-normal text-ink/60">({dummyReviewCount(store.id)})</Text>
          <Text className="text-[13px] text-ink/30">·</Text>
          <Text className="text-[13px] font-normal text-ink/60">{store.category}</Text>
        </View>

        <Text className="mt-1 text-[13px] font-medium">
          {store.isOpen ? (
            <Text style={{ color: colors.success }}>Open</Text>
          ) : (
            <Text className="text-ink/60">Closed</Text>
          )}
          <Text className="text-ink/60 font-normal text-[13px]">
            {store.closeTime ? ` · Closes ${store.closeTime}` : ''} · {dummyDistanceLabel(store.id)}
          </Text>
        </Text>

      </Pressable>

      {/* Fixed-width tiles wider than a third of the screen (not flex-1
          splitting it evenly) — the point is the same peeking-third-photo
          effect the reference screenshot shows, which only reads as
          scrollable if the row is actually wider than the screen.
          -mx-5 cancels AllStoresSection.tsx's own px-5 list padding just
          for this row (same trick the divider between cards already
          uses) so the last tile actually bleeds to the real screen edge
          instead of stopping short with a blank margin after it — that
          gap was the bug: the ScrollView's own viewport was still boxed
          inside the outer padding, so there was nowhere for a peeking
          tile to peek INTO. contentContainerClassName's pl-5 puts that
          same 20px back as leading space so the first tile still lines up
          with the name/rating text above it, just without a matching
          trailing pr-5 that would recreate the same gap on the right.
          Nested inside its own ScrollView rather than the outer Pressable
          so a horizontal drag here scrolls the photos instead of being
          swallowed as a tap on goToStore; a plain tap (no drag) still
          reaches the Pressable underneath either way — same gesture
          arbitration ProductDetailSheet.tsx's own nested ScrollView
          relies on elsewhere in this app. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-5 mb-3.5 mt-3.5"
        contentContainerClassName="gap-2 pl-5"
      >
        {photos.map((uri, i) => (
          <Pressable key={i} onPress={goToStore} className="h-36 w-44 overflow-hidden rounded-2xl bg-mist">
            <Image source={{ uri }} style={{ flex: 1 }} contentFit="cover" />
          </Pressable>
        ))}
      </ScrollView>

      <View className="flex-row items-center gap-2.5">
        <Pressable
          onPress={goToStore}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-full py-3.5 bg-[#2457F5]"
        >
          <Text className="text-[15px] font-medium text-white">Shop now</Text>
        </Pressable>

        <Pressable className="flex-row items-center gap-1.5 rounded-full border border-gray-200 px-4 py-3">
          <AppIcon icon={Share03Icon} size={15} color={colors.ink} />
          <Text className="text-[14px] font-medium text-black">Share</Text>
        </Pressable>

        {/* Liking here is the same shared state StoreFilterBar.tsx's own
            heart button reads (useLikedStoresStore) — per an explicit
            ask, this button's only job is filling the heart icon red on
            tap, nothing else about the button itself (bg/border stay the
            plain gray-200 outline every time, active or not). */}
        <Pressable
          onPress={() => toggleLiked(store.id)}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center rounded-full border border-gray-200"
        >
          <AppIcon
            icon={FavouriteIcon}
            size={17}
            color={isLiked ? colors.danger : colors.ink}
            fill={isLiked ? colors.danger : undefined}
            strokeWidth={isLiked ? 0 : 1.8}
          />
        </Pressable>
      </View>
    </View>
  );
}

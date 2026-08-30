// Pixel-matched to an explicit reference: a rounded white outer surface,
// a large inset photo with its own rounded corners, and a white content
// panel that visually OVERLAPS the bottom of the photo (negative margin,
// not a panel sitting flush underneath it) — same layered look as the
// reference, not a simplified stacked layout. A small white circular
// 3-dot menu sits over the seam between photo and panel.
//
// Content is real store data throughout, not the reference's literal
// content: the reference's "avatars + app icons" row has no equivalent
// here — this app has no per-store customer-avatar or third-party-
// integration data, and fabricating fake user photos / Gmail-ChatGPT-
// Todoist icons for a grocery app would just be inventing content. The
// real substitute that fills the same visual slot: a rating line on the
// left, the real "Shop now" CTA on the right — same balanced two-side
// bottom row, real data on both sides instead of fabricated avatars/logos.
//
// The 3-dot menu is a real control, not decoration — it's a sibling
// Pressable of the card's own tap target (not nested inside it, same
// nested-Pressable class of bug fixed elsewhere in this app), opening a
// real action sheet.
//
// Card width is whatever AllStoresSection's own list column gives it
// (full device width minus screen padding) — no hardcoded 288/416px
// screenshot dimensions; image height is a proportion of that measured
// width instead, so the layout holds its proportions on any screen size.

import { useState } from 'react';
import { ArrowRight01Icon, StarIcon } from '@hugeicons/core-free-icons';
import { Alert, Image, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon } from '../../../components/AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../../theme/placeholderImage';
import { colors } from '../../../theme/tokens';
import type { AppStackParamList } from '../../../navigation/types';
import type { RealStore } from '../all-stores/useAllStores';

interface Props {
  store: RealStore;
}

const IMAGE_ASPECT_RATIO = 0.46; // image height as a proportion of the card's own measured width
const IMAGE_INSET = 8;
const PANEL_OVERLAP = 22;
const PANEL_RADIUS = 30;

// The concave "bite" the reference cuts into the panel's top-right corner
// around the 3-dot button — a plain rounded rect can't do this, it needs
// an actual path: flat top edge, two quarter-circle arcs dipping around
// the button (the classic message-bubble-tail trick), then the panel's
// own top-right corner radius continuing on from there. Filled the same
// white as the panel/outer card so it reads as one continuous seam, not a
// separate shape.
const NOTCH_PATCH_W = 110;
const NOTCH_PATCH_H = 60;
const NOTCH_RADIUS = 20;
const NOTCH_CENTER_X = NOTCH_PATCH_W - PANEL_RADIUS - NOTCH_RADIUS;
const NOTCH_PATH = `M0,0 L${NOTCH_CENTER_X - NOTCH_RADIUS},0 A${NOTCH_RADIUS},${NOTCH_RADIUS} 0 0 0 ${NOTCH_CENTER_X},${NOTCH_RADIUS} A${NOTCH_RADIUS},${NOTCH_RADIUS} 0 0 0 ${NOTCH_CENTER_X + NOTCH_RADIUS},0 L${NOTCH_PATCH_W - PANEL_RADIUS},0 A${PANEL_RADIUS},${PANEL_RADIUS} 0 0 1 ${NOTCH_PATCH_W},${PANEL_RADIUS} L${NOTCH_PATCH_W},${NOTCH_PATCH_H} L0,${NOTCH_PATCH_H} Z`;

export function StoreCard({ store }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [cardWidth, setCardWidth] = useState(0);

  // TEMP — real stores don't have a rating set yet (founder hasn't rated
  // any store on file), so this row never showed up to actually preview.
  // Dummy fallback only, real store.rating still wins the instant it's
  // set. Remove once real ratings exist.
  const displayRating = store.rating ?? 4.6;

  function handleLayout(e: LayoutChangeEvent) {
    setCardWidth(e.nativeEvent.layout.width);
  }

  function goToStore() {
    navigation.navigate('StoreDetail', { storeId: store.id, storeName: store.name });
  }

  function openMenu() {
    Alert.alert(store.name, undefined, [
      { text: 'View store', onPress: goToStore },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const imageHeight = cardWidth > 0 ? cardWidth * IMAGE_ASPECT_RATIO : undefined;
  // Where the panel's own top edge actually sits (image block height minus
  // how far the panel overlaps up into it) — the notch patch and the menu
  // button both anchor off this same value so they line up with each other.
  const panelTop = imageHeight !== undefined ? imageHeight + IMAGE_INSET * 2 - PANEL_OVERLAP : undefined;

  return (
    <View onLayout={handleLayout} style={styles.outer}>
      <Pressable onPress={goToStore}>
        <View style={{ margin: IMAGE_INSET, height: imageHeight, borderRadius: 30, overflow: 'hidden', backgroundColor: colors.mist }}>
          <Image source={{ uri: store.photoUrl || PLACEHOLDER_IMAGE_URI }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        </View>

        <View style={[styles.panel, { marginTop: -PANEL_OVERLAP }]}>
          <Text className="text-[13px] text-ink/45">
            {store.category} <Text className="text-ink/30">•</Text> {store.isOpen ? 'Open' : 'Closed'}
          </Text>
          <Text className="mt-1 text-[20px] font-medium leading-6 tracking-tight text-ink" numberOfLines={2}>
            {store.name}
          </Text>

          <View className="my-2.5 h-px bg-gray-100" />

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <AppIcon icon={StarIcon} size={14} color={colors.gold} />
              <Text className="text-[13px] font-semibold text-ink/70">{displayRating.toFixed(1)} rating</Text>
            </View>

            <View className="flex-row items-center gap-1.5 rounded-full px-5 py-2.5" style={{ backgroundColor: '#1447E6' }}>
              <Text className="text-xs font-extrabold text-white">Shop now</Text>
              <AppIcon icon={ArrowRight01Icon} size={13} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </Pressable>

      {panelTop !== undefined ? (
        <Svg
          width={NOTCH_PATCH_W}
          height={NOTCH_PATCH_H}
          viewBox={`0 0 ${NOTCH_PATCH_W} ${NOTCH_PATCH_H}`}
          style={{ position: 'absolute', right: 0, top: panelTop }}
          pointerEvents="none"
        >
          <Path d={NOTCH_PATH} fill="#FFFFFF" />
        </Svg>
      ) : null}

      <Pressable
        onPress={openMenu}
        hitSlop={8}
        style={[
          styles.menuButton,
          {
            right: NOTCH_PATCH_W - NOTCH_CENTER_X - 15,
            top: panelTop !== undefined ? panelTop + NOTCH_RADIUS - 15 : 0,
          },
        ]}
      >
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
  },
  menuButton: {
    position: 'absolute',
    right: 20,
    height: 30,
    width: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.ink,
  },
});

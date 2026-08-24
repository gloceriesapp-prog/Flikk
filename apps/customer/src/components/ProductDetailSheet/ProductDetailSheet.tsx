// "Quick view" modal opened by tapping a product card
// (screens/home/products/ProductCard.tsx owns the open/close state — this
// component is just the presentation).
//
// Full width always (no left/right margin) and flush with the bottom (no
// bottom margin, square bottom corners) — only the top has a margin/curve,
// and only while floating: large rounded top corners, backdrop visible
// above the card. Dragging the content (the ScrollView holding the hero
// image + ProductDetailInfo) past GROW_TRIGGER_DISTANCE crosses a threshold
// that animates the top margin to 0 too (full screen); scrolling back near
// the top crosses it the other way and animates back to the floating top
// margin. Top corners stay rounded the whole time, even at full screen.
//
// This is a threshold *crossing* (tracked in isGrownRef, flipped inside
// onScroll, animated with a single Animated.timing per crossing) rather than
// scrollY driving the margins directly via 1:1 interpolation. That direct
// approach has a feedback loop: growing the card enlarges the ScrollView's
// own visible height, which shrinks how far there is left to scroll, which
// caps scrollY below the distance needed to finish growing — the card gets
// stuck part-grown with visible gaps top and bottom. Decoupling the "grown"
// state from continuous scroll position (it only changes on a discrete
// crossing, not every scroll tick) breaks that loop.
//
// isGrownRef is only ever mutated inside the onScroll handler (an event
// callback, not render), so it doesn't hit the lint rule that flags reading
// ref.current during render. useNativeDriver: false because margin/
// borderRadius aren't transforms/opacity — the two props the native driver
// supports.
//
// Close/bookmark/share float in a fixed header layered on top of the
// Animated.ScrollView (pointerEvents box-none so they don't block scrolling
// through the gaps between them), so they stay pinned to the card's own top
// edge as it grows, rather than scrolling away with the image. Footer stays
// outside the ScrollView too, pinned to the card's bottom edge.
//
// Backdrop is a real glassmorphism blur (BlurView, same convention as
// BottomNavBar.tsx's own glass pill). It's only visible while the card is
// still floating — once scrolled to full screen the card covers it, no
// special-casing needed.
//
// The footer is the same glass treatment: an absolutely-positioned BlurView
// overlay pinned to the card's bottom edge (not a normal-flow sibling below
// the ScrollView), so scrolled content is visible frosted through it as it
// passes underneath — the ScrollView gets matching bottom padding
// (FOOTER_SPACER) so real content doesn't end up hidden under the opaque
// button.

import { Bookmark01Icon, ChevronDownIcon, Share03Icon, Share08Icon } from '@hugeicons/core-free-icons';
import { useRef, useState } from 'react';
import { Animated, Image, Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../AppIcon';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { colors } from '../../theme/tokens';
import { ProductDetailInfo } from './ProductDetailInfo';
import { ProductDetailFooter } from './ProductDetailFooter';
import type { Product } from '../../screens/home/products/types';

const GROW_TRIGGER_DISTANCE = 24;
const SHRINK_TRIGGER_DISTANCE = 4;
const GROW_ANIMATION_MS = 220;
const CARD_MARGIN = 16;
const CARD_RADIUS = 38;
const FOOTER_SPACER = 96;

interface Props {
  product: Product;
  visible: boolean;
  onClose: () => void;
}

export function ProductDetailSheet({ product, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [isBookmarked, setIsBookmarked] = useState(false);
  // useState instead of useRef().current — this repo's react-compiler lint
  // rule flags reading ref.current during render, even for the standard
  // Animated.Value-via-ref pattern; lazy useState sidesteps it while still
  // only constructing the Animated.Value once.
  const [grow] = useState(() => new Animated.Value(0));
  const isGrownRef = useRef(false);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > GROW_TRIGGER_DISTANCE && !isGrownRef.current) {
      isGrownRef.current = true;
      Animated.timing(grow, { toValue: 1, duration: GROW_ANIMATION_MS, useNativeDriver: false }).start();
    } else if (offsetY <= SHRINK_TRIGGER_DISTANCE && isGrownRef.current) {
      isGrownRef.current = false;
      Animated.timing(grow, { toValue: 0, duration: GROW_ANIMATION_MS, useNativeDriver: false }).start();
    }
  };

  const cardMarginTop = grow.interpolate({ inputRange: [0, 1], outputRange: [insets.top + CARD_MARGIN, 0] });
  // At full screen the card's own top edge is the physical screen edge, so
  // the floating card's fixed 14px header offset starts colliding with the
  // notch/status bar — grow the safe-area inset in on top of it.
  const headerTop = grow.interpolate({ inputRange: [0, 1], outputRange: [14, insets.top + 14] });
  // Constant, not animated — the card's bottom edge is *always* the
  // physical screen edge now (no floating bottom margin at all, see the
  // file's own header note), so the home-indicator safe-area padding always
  // applies, not just once "grown". This used to animate 0 -> insets.bottom
  // from before that change, which left the footer flush against the home
  // indicator with no padding while the card was still floating.
  const footerPaddingBottom = insets.bottom;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1">
        {/* BlurView isn't one of NativeWind's auto-patched components — a
            className here is silently ignored, same as elsewhere in this
            app (BottomNavBar.tsx's own note). Android has no native blur
            backend, so BlurView alone renders as a flat tint there — the
            "dark" tint plus a low-opacity black wash on top is what actually
            reads as frosted glass rather than a solid black sheet on every
            platform. */}
        <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFill} />
        <View className="absolute inset-0 bg-black/10" />
        <Pressable className="absolute inset-0" onPress={onClose} />

        <Animated.View
          style={{
            flex: 1,
            marginTop: cardMarginTop,
            borderTopLeftRadius: CARD_RADIUS,
            borderTopRightRadius: CARD_RADIUS,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
          }}
          className="shadow-lg shadow-black/30"
        >
          <Animated.View
            pointerEvents="box-none"
            style={{ top: headerTop }}
            className="absolute left-4 right-4 z-10 flex-row items-center justify-between"
          >
            <Pressable
              onPress={onClose}
              hitSlop={10}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/90"
            >
              <AppIcon icon={ChevronDownIcon} size={20} color={colors.ink} />
            </Pressable>

            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setIsBookmarked((prev) => !prev)}
                hitSlop={10}
                className={`h-10 w-10 items-center justify-center rounded-full ${
                  isBookmarked ? 'bg-lime-deep' : 'bg-white/90'
                }`}
              >
                <AppIcon icon={Bookmark01Icon} size={18} color={isBookmarked ? '#FFFFFF' : colors.ink} strokeWidth={isBookmarked ? 0 : 1.8} />
              </Pressable>
              <Pressable hitSlop={10} className="h-10 w-10 items-center justify-center rounded-full bg-white/90">
                <AppIcon icon={Share03Icon} size={18} color={colors.ink} />
              </Pressable>
            </View>
          </Animated.View>

          <Animated.ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: FOOTER_SPACER }}
          >
            <View className="relative h-72 w-full items-center justify-center" style={{ backgroundColor: '#FAFAFA' }}>
              <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="contain" />
              <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-ink' : 'bg-ink/25'}`} />
                ))}
              </View>
            </View>

            <ProductDetailInfo product={product} />
          </Animated.ScrollView>

          <Animated.View style={{ paddingBottom: footerPaddingBottom }} className="absolute bottom-0 left-0 right-0 overflow-hidden">
            {/* Same NativeWind-blind-spot as the modal backdrop above —
                BlurView needs its sizing/positioning on style, not className. */}
            <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
            <View className="absolute inset-0 bg-white/40" />
            <ProductDetailFooter product={product} />
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

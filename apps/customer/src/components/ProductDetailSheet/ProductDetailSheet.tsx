// "Quick view" modal opened by tapping a product card
// (screens/home/products/ProductCard.tsx owns the open/close state — this
// component is just the presentation).
//
// While floating (resting state, before scrolling grows it) the card pulls
// in from all four edges — top, both sides (CARD_SIDE_MARGIN), and bottom
// (CARD_BOTTOM_MARGIN, all four corners rounded) — so the blurred backdrop
// shows all the way around it. Dragging the content (the ScrollView
// holding the hero image + ProductDetailInfo) UP past GROW_TRIGGER_DISTANCE
// crosses a threshold that animates every margin to 0 too (full screen);
// scrolling back near the top crosses it the other way and animates back
// to the floating margins — this is the original grow behavior, restored
// exactly as it was. Top corners stay rounded the whole time, even at full
// screen; only the bottom corners square off once grown.
//
// This is a threshold *crossing* (tracked in isGrownRef, flipped inside
// handleScroll, animated with a single Animated.timing per crossing)
// rather than scrollY driving the margins directly via 1:1 interpolation —
// that direct approach has a feedback loop: growing the card enlarges the
// ScrollView's own visible height, which shrinks how far there is left to
// scroll, which caps scrollY below the distance needed to finish growing,
// leaving the card stuck part-grown. Decoupling "grown" from continuous
// scroll position (it only changes on a discrete crossing) breaks that
// loop. useNativeDriver: false throughout because margin/borderRadius
// aren't transforms/opacity — the two props the native driver supports.
//
// Closing works four ways now: the chevron button, the floating X above
// the card, dragging the header row down (PanResponder, dragY), or
// dragging the content DOWN while already scrolled to the very top
// (bounces enabled — the resulting negative contentOffset.y mirrors 1:1
// into that same dragY, see handleScroll/handleScrollEndDrag's own notes).
// This coexists with the grow-on-scroll-up behavior above because they key
// off opposite signs of the same contentOffset.y: positive (scrolling up)
// grows the card, negative (overscrolling down at the top) drives the
// dismiss — a single scroll gesture is only ever one or the other, never
// both, so there's no fight between them.
//
// Close/bookmark/share float in a fixed header layered on top of the
// Animated.ScrollView, so they stay pinned to the card's own top edge
// rather than scrolling away with the image. Footer stays outside the
// ScrollView too, pinned to the card's bottom edge.
//
// Backdrop is a real glassmorphism blur (BlurView, same convention as
// BottomNavBar.tsx's own glass pill).
//
// The footer is the same glass treatment: an absolutely-positioned BlurView
// overlay pinned to the card's bottom edge (not a normal-flow sibling below
// the ScrollView), so scrolled content is visible frosted through it as it
// passes underneath — the ScrollView gets matching bottom padding
// (FOOTER_SPACER) so real content doesn't end up hidden under the opaque
// button.

import { Bookmark01Icon, Cancel01Icon, Share03Icon } from '@hugeicons/core-free-icons';
import { useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../AppIcon';
import { CartBar } from '../CartBar/CartBar';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { colors } from '../../theme/tokens';
import { selectCartTotalQuantity, useCartStore } from '../../store/useCartStore';
import { ProductDetailInfo } from './ProductDetailInfo';
import { ProductDetailFooter } from './ProductDetailFooter';
import { useSimilarProducts } from './useSimilarProducts';
import type { Product } from '../../screens/home/products/types';

const GROW_TRIGGER_DISTANCE = 24;
const SHRINK_TRIGGER_DISTANCE = 4;
const GROW_ANIMATION_MS = 220;
const CARD_RADIUS = 38;
const FOOTER_SPACER = 96;
// Resting top margin as a fraction of screen height, not a fixed px — per
// an explicit ask, the card should open sitting lower (roughly a quarter
// down the screen), with the blurred backdrop actually visible above it,
// rather than starting right under the status bar the way a fixed small
// margin (the old CARD_MARGIN=16) left almost the whole screen covered.
// Fraction, not a hardcoded px, so this scales correctly across small and
// large phones instead of looking right on only one screen size. Scrolling
// the content still grows it to full screen exactly as before — this only
// changes where it rests before that happens.
const REST_MARGIN_FRACTION = 0.24;
// Side margin while floating — animates to 0 together with the top margin
// once grown to full screen (see this file's own header note).
const CARD_SIDE_MARGIN = 10;
// Bottom margin + corner radius while floating — same animate-to-0-when-
// grown treatment as the top/sides.
const CARD_BOTTOM_MARGIN = 18;
const CARD_BOTTOM_RADIUS = 28;
// Footer's own bottom padding while floating — small fixed gap, not the
// full safe-area inset, since the card's own CARD_BOTTOM_MARGIN already
// clears the home indicator at rest. Animates up to the real insets.bottom
// once grown (card is flush against the physical edge again then).
const FOOTER_REST_PADDING = 22;
// Floating close (X) button, centered above the card's own top edge, on
// the backdrop itself — a second, more obvious close affordance than the
// chevron already inside the header row, per an explicit ask. Tracks the
// card's top edge (cardMarginTop) so it stays glued just above it as the
// card grows, and fades out once grown to full screen — there's no
// backdrop left above the card at that point for it to sit on.
const CLOSE_BUTTON_SIZE = 36;
const CLOSE_BUTTON_GAP = 12;
// Drag-to-dismiss (the header row's own grab handle, not the ScrollView
// content — dragging content itself is already spoken for by the grow/
// shrink gesture above). Past DRAG_DISMISS_DISTANCE, or a fast enough
// downward flick (DRAG_DISMISS_VELOCITY) even if short, closes the sheet;
// otherwise it springs back to resting position. Real screen height, not a
// fixed px, for the slide-away distance so the card fully clears the
// screen on every device size.
const DRAG_DISMISS_DISTANCE = 120;
const DRAG_DISMISS_VELOCITY = 1.1;
const DISMISS_ANIMATION_MS = 200;

interface Props {
  product: Product;
  visible: boolean;
  onClose: () => void;
}

export function ProductDetailSheet({ product, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [isBookmarked, setIsBookmarked] = useState(false);
  // useState instead of useRef().current — this repo's react-compiler lint
  // rule flags reading ref.current during render, even for the standard
  // Animated.Value-via-ref pattern; lazy useState sidesteps it while still
  // only constructing the Animated.Value once.
  const [grow] = useState(() => new Animated.Value(0));
  const isGrownRef = useRef(false);
  // Drag-to-dismiss offset — 0 at rest, animates toward screenHeight on a
  // successful drag-down dismissal. Separate Animated.Value from `grow`
  // (that one drives the resting-vs-full-screen margins/radii) since this
  // is a transform offset layered on top of whatever `grow` state the card
  // is already in, not a replacement for it.
  //
  // useNativeDriver: true everywhere this value is driven (here, the
  // release animations below, and handleScrollEndDrag's own dismiss
  // timing) — it only ever animates `transform`, which the native driver
  // can run entirely on the UI thread. Left at false (matching `grow`,
  // which animates margin/borderRadius and can't use the native driver at
  // all) it was round-tripping every touch-move frame through the JS
  // bridge, which is what read as glitchy/stuttery while actually
  // dragging — this isn't a new animation, just moving the existing one
  // off the thread that was getting congested.
  const [dragY] = useState(() => new Animated.Value(0));
  const [panResponder] = useState(() =>
    PanResponder.create({
      // Claim the gesture only once it's clearly a downward drag (dy
      // positive and bigger than any horizontal movement) — small taps on
      // the header's own buttons (chevron/bookmark/share) never cross this
      // threshold, so they still register as normal presses.
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: Animated.event([null, { dy: dragY }], { useNativeDriver: true }),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DRAG_DISMISS_DISTANCE || gesture.vy > DRAG_DISMISS_VELOCITY) {
          Animated.timing(dragY, { toValue: screenHeight, duration: DISMISS_ANIMATION_MS, useNativeDriver: true }).start(() => {
            onClose();
            // Reset immediately so the next time this sheet opens (same
            // mounted instance, ProductCard.tsx just flips `visible` back
            // to true) it isn't still offset off-screen from this dismiss.
            dragY.setValue(0);
          });
        } else {
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  );

  // Mock products (still used by several data.ts files) set their own
  // relatedProducts inline — real backend products never do (api/products.ts
  // has no such field to set), so this only fires for those, and only once
  // the sheet is actually open.
  const needsSimilar = visible && !product.relatedProducts;
  const similar = useSimilarProducts(needsSimilar ? product.categoryLabel : undefined, product.id);
  const relatedProducts = product.relatedProducts ?? similar.data ?? [];
  const cartTotalQuantity = useCartStore(selectCartTotalQuantity);

  // Two independent behaviors live in this one handler, split by the sign
  // of contentOffset.y — see this file's own header note on why they never
  // fight: positive offset (scrolling the content up) is the original
  // grow-to-full-screen crossing logic, restored exactly as it was.
  // Negative offset (overscrolling down while already at the top, only
  // possible because `bounces` is on) drives the same dragY the header's
  // own PanResponder uses, 1:1, so the whole card visibly follows the
  // finger on a downward drag from the content too — bounces={false}
  // previously absorbed that gesture with zero feedback, which read as
  // "drag down does nothing". Whether it actually dismisses on release is
  // decided in handleScrollEndDrag below, not here.
  const isOverscrollDismissingRef = useRef(false);
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    if (offsetY > GROW_TRIGGER_DISTANCE && !isGrownRef.current) {
      isGrownRef.current = true;
      Animated.timing(grow, { toValue: 1, duration: GROW_ANIMATION_MS, useNativeDriver: false }).start();
    } else if (offsetY <= SHRINK_TRIGGER_DISTANCE && isGrownRef.current) {
      isGrownRef.current = false;
      Animated.timing(grow, { toValue: 0, duration: GROW_ANIMATION_MS, useNativeDriver: false }).start();
    }

    if (isOverscrollDismissingRef.current) return;
    dragY.setValue(offsetY < 0 ? -offsetY : 0);
  };

  const handleScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > -DRAG_DISMISS_DISTANCE) return;
    isOverscrollDismissingRef.current = true;
    Animated.timing(dragY, { toValue: screenHeight, duration: DISMISS_ANIMATION_MS, useNativeDriver: true }).start(() => {
      onClose();
      dragY.setValue(0);
      isOverscrollDismissingRef.current = false;
    });
  };

  const cardMarginTop = grow.interpolate({ inputRange: [0, 1], outputRange: [screenHeight * REST_MARGIN_FRACTION, 0] });
  // Same interpolation as cardMarginTop, just offset by the button's own
  // height + gap — always sits directly above the card's top edge.
  const closeButtonTop = grow.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight * REST_MARGIN_FRACTION - CLOSE_BUTTON_SIZE - CLOSE_BUTTON_GAP, -CLOSE_BUTTON_SIZE],
  });
  const closeButtonOpacity = grow.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const cardMarginHorizontal = grow.interpolate({ inputRange: [0, 1], outputRange: [CARD_SIDE_MARGIN, 0] });
  const cardMarginBottom = grow.interpolate({ inputRange: [0, 1], outputRange: [CARD_BOTTOM_MARGIN, 0] });
  const cardBottomRadius = grow.interpolate({ inputRange: [0, 1], outputRange: [CARD_BOTTOM_RADIUS, 0] });
  // At full screen the card's own top edge is the physical screen edge, so
  // the floating card's fixed 14px header offset starts colliding with the
  // notch/status bar — grow the safe-area inset in on top of it.
  const headerTop = grow.interpolate({ inputRange: [0, 1], outputRange: [14, insets.top + 14] });
  const footerPaddingBottom = grow.interpolate({ inputRange: [0, 1], outputRange: [FOOTER_REST_PADDING, insets.bottom] });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1">
        {/* BlurView isn't one of NativeWind's auto-patched components — a
            className here is silently ignored, same as elsewhere in this
            app (BottomNavBar.tsx's own note). Android has no native blur
            backend, so BlurView alone renders as a flat tint there — the
            "dark" tint plus a low-opacity black wash on top is what actually
            reads as frosted glass rather than a solid black sheet on every
            platform. intensity dropped from 85 (which read as a near-opaque
            gray fog, the backdrop was unrecognizable) to 35, and the wash
            from black/10 to black/5 — per an explicit ask, whatever's
            behind the sheet should still be visible/identifiable through
            the blur, not just a flat gray wash. */}
        <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
        <View className="absolute inset-0 bg-black/5" />
        <Pressable className="absolute inset-0" onPress={onClose} />

        {/* Floating close (X), centered above the card's own top edge —
            see this file's own note on CLOSE_BUTTON_SIZE/GAP above. */}
        <Animated.View
          pointerEvents="box-none"
          style={{ position: 'absolute', top: closeButtonTop, left: 0, right: 0, opacity: closeButtonOpacity }}
          className="items-center"
        >
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={{ height: CLOSE_BUTTON_SIZE, width: CLOSE_BUTTON_SIZE }}
            className="items-center justify-center rounded-full bg-white/90 shadow-sm shadow-black/20"
          >
            <AppIcon icon={Cancel01Icon} size={16} color={colors.ink} strokeWidth={2} />
          </Pressable>
        </Animated.View>

        <Animated.View
          style={{
            flex: 1,
            marginTop: cardMarginTop,
            marginHorizontal: cardMarginHorizontal,
            marginBottom: cardMarginBottom,
            borderTopLeftRadius: CARD_RADIUS,
            borderTopRightRadius: CARD_RADIUS,
            borderBottomLeftRadius: cardBottomRadius,
            borderBottomRightRadius: cardBottomRadius,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            // Drag-to-dismiss offset — layered on top of whatever the
            // margin-based grow/rest position already is, via transform
            // rather than another margin, so it doesn't fight the
            // interpolations above it.
            transform: [{ translateY: dragY }],
          }}
          className="shadow-lg shadow-black/30"
        >
          {/* Grab handle — the whole fixed header row is the drag-to-
              dismiss target (panHandlers below), not just a thin bar, so
              there's a generous hit area; onMoveShouldSetPanResponder's own
              6px+vertical-only threshold is what keeps the chevron/
              bookmark/share buttons still tappable normally (see
              PanResponder's own note above). */}
          {/* pointerEvents left at its default here (not "box-none" like
              the rest of this header used to be) — box-none excludes the
              view itself from hit-testing on empty space, which meant the
              PanResponder attached below never saw a touch start unless it
              landed exactly on a child button, so drag-to-dismiss silently
              never fired from the gaps/title area. Default hit-testing
              lets both this row's own pan gesture AND the child Pressables'
              normal taps coexist (PanResponder only claims the gesture
              past its own 6px-downward threshold, so a plain tap still
              reaches the button underneath first). */}
          <Animated.View
            {...panResponder.panHandlers}
            style={{ top: headerTop }}
            className="absolute left-4 right-4 z-10 items-center gap-2.5"
          >
            {/* Grab handle — replaces the old chevron-down close button.
                That button was redundant once the floating X (above the
                card, on the backdrop) became the explicit close action,
                and it didn't communicate the thing this row actually does
                now: drag it. A handle bar is the standard bottom-sheet
                affordance for "this is draggable" — purely visual
                (pointerEvents none), the drag itself already works
                anywhere on this row via panHandlers above. */}
            <View pointerEvents="none" className="h-1 w-9 rounded-full bg-ink/15" />

            <View className="w-full flex-row items-center justify-end">
              {/* Centered independently of the bookmark/share group
                  (absolute, not a flex-1 middle column) so its own width
                  never pushes that group off the row's right edge. No
                  left-side icon to balance against anymore — bookmark/
                  share read fine as the row's only actions now that close
                  lives elsewhere (X above, or the drag itself). */}
              <View pointerEvents="none" className="absolute left-0 right-0 items-center">
                <Text className="text-lg font-medium text-ink">Product Details</Text>
              </View>

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
            </View>
          </Animated.View>

          <Animated.ScrollView
            bounces
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            onScrollEndDrag={handleScrollEndDrag}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: FOOTER_SPACER }}
          >
            {/* Real product photo (product.imageUrl), same neutral #FAFAFA
                backdrop always — no bgColor pastel tint here (that's this
                sheet's own explicit opt-out; ProductCardView.tsx still uses
                it on the card this was opened from). */}
            {/* pt-14 clears the floating header row (close/title/bookmark/
                share, absolutely positioned on top of this ScrollView) —
                without it the image's own top edge sits directly under the
                header with no breathing room. */}
            <View className="relative h-80 w-full items-center justify-center pt-14" style={{ backgroundColor: '#FAFAFA' }}>
              <Image source={{ uri: product.imageUrl || PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="contain" />
              <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-ink' : 'bg-ink/25'}`} />
                ))}
              </View>
            </View>

            <ProductDetailInfo product={product} relatedProducts={relatedProducts} />
          </Animated.ScrollView>

          {/* CartBar (same floating "View cart" pill Home's BottomNavBar
              shows) lives outside the overflow-hidden footer below — that
              container clips to draw the blur's rounded corners, which
              would also clip CartBar's own shadow. Plain flow stacking
              (not a computed absolute offset) puts it directly above the
              footer regardless of which footer state (button vs stepper)
              is currently taller. */}
          <View className="absolute bottom-0 left-0 right-0">
            {cartTotalQuantity > 0 && (
              <View className="items-center pb-3">
                <CartBar />
              </View>
            )}
            <Animated.View style={{ paddingBottom: footerPaddingBottom }} className="overflow-hidden">
              {/* Same NativeWind-blind-spot as the modal backdrop above —
                  BlurView needs its sizing/positioning on style, not className. */}
              <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
              <View className="absolute inset-0 bg-white/40" />
              <ProductDetailFooter product={product} />
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

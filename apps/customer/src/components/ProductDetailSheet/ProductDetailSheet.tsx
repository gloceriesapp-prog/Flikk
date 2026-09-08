// "Quick view" modal opened by tapping a product card
// (screens/home/products/ProductCard.tsx owns the open/close state — this
// component is just the presentation).
//
// Swipeable between products: the sheet shows the tapped product centered,
// with up to two random "you may also like" products (drawn from the same
// relatedProducts/similar-products pool ProductDetailInfo already shows at
// the bottom of the card) peeking in from the left/right edges. Each page
// is a fully independent Card — its own grow-to-fullscreen, drag-to-dismiss,
// bookmark state — so swiping to a neighbor and interacting with it works
// exactly like opening that product directly, per an explicit ask ("add
// next card... random items... card in right and left side").
//
// While floating (resting state, before scrolling grows it) the card pulls
// in from all four edges — top, both sides (CARD_SIDE_MARGIN), and bottom
// (CARD_BOTTOM_MARGIN, all four corners rounded) — so the blurred backdrop
// shows all the way around it. Dragging the content (the ScrollView
// holding the hero image + ProductDetailInfo) UP past GROW_TRIGGER_DISTANCE
// crosses a threshold that animates every margin to 0 too (full screen);
// scrolling back near the top crosses it the other way and animates back
// to the floating margins. Top corners stay rounded the whole time, even at
// full screen; only the bottom corners square off once grown.
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
// Closing works four ways: the floating X above whichever card is
// centered, dragging that card's header row down (PanResponder, dragY),
// dragging the content DOWN while already scrolled to the very top
// (bounces enabled — the resulting negative contentOffset.y mirrors 1:1
// into that same dragY, see handleScroll/handleScrollEndDrag's own notes),
// or tapping the backdrop. This coexists with the grow-on-scroll-up
// behavior above because they key off opposite signs of the same
// contentOffset.y: positive (scrolling up) grows the card, negative
// (overscrolling down at the top) drives the dismiss — a single scroll
// gesture is only ever one or the other, never both.
//
// Close/bookmark/share float in a fixed header layered on top of each
// card's own Animated.ScrollView, so they stay pinned to that card's top
// edge rather than scrolling away with the image. Footer stays outside the
// ScrollView too, pinned to the card's bottom edge. The floating X lives
// inside each Card too (not hoisted to a shared layer) — that's what lets
// it track that specific card's own grow value with no cross-page state.
//
// Backdrop is a real glassmorphism blur (BlurView, same convention as
// BottomNavBar.tsx's own glass pill), rendered once behind the whole
// horizontal pager.

import { Bookmark01Icon, Cancel01Icon, Share03Icon } from '@hugeicons/core-free-icons';
import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../AppIcon';
import { AppImage as Image } from '../AppImage';
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
// Resting top margin as a fraction of screen height, not a fixed px — the
// card should open sitting lower (roughly a quarter down the screen), with
// the blurred backdrop actually visible above it. Fraction, not a
// hardcoded px, so this scales correctly across small and large phones.
const REST_MARGIN_FRACTION = 0.24;
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
// the backdrop itself. Tracks the card's top edge (cardMarginTop) so it
// stays glued just above it as the card grows, and fades out once grown to
// full screen — there's no backdrop left above the card at that point for
// it to sit on.
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
// Sibling peek pager — each page is narrower than the screen so the next/
// previous card's edge peeks in (PEEK_WIDTH visible on each side), with
// PAGE_GAP of breathing room between pages so they don't visually touch.
const PEEK_WIDTH = 22;
const PAGE_GAP = 12;

// djb2 — a plain pure hash, used to deterministically pick this product's
// two peek-pager neighbors (see the sibling-picking useMemo below) without
// calling Math.random() during render.
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) hash = (hash * 33 + value.charCodeAt(i)) >>> 0;
  return hash;
}

interface Props {
  product: Product;
  visible: boolean;
  onClose: () => void;
}

export function ProductDetailSheet({ product, visible, onClose }: Props) {
  const { width: screenWidth } = useWindowDimensions();

  // Mock products (still used by several data.ts files) set their own
  // relatedProducts inline — real backend products never do (api/products.ts
  // has no such field to set), so this only fires for those, and only once
  // the sheet is actually open.
  const needsSimilar = visible && !product.relatedProducts;
  const similar = useSimilarProducts(needsSimilar ? product.categoryLabel : undefined, product.id);
  const relatedProducts = product.relatedProducts ?? similar.data ?? [];

  // Two distinct neighbors from the related pool, picked by hashing
  // product.id rather than Math.random() — this repo's react-compiler lint
  // rule forbids calling an impure function (Math.random included) during
  // render, useMemo's body counted, and a hash is a pure function of its
  // input anyway: same product always picks the same two neighbors (no
  // flicker between different ones as unrelated state elsewhere in the
  // tree re-renders this component), while different products still land
  // on different, effectively-arbitrary pairs.
  const [leftSibling, rightSibling] = useMemo(() => {
    if (relatedProducts.length === 0) return [undefined, undefined] as const;
    const seed = hashString(product.id);
    const left = relatedProducts[seed % relatedProducts.length];
    const right = relatedProducts.length > 1 ? relatedProducts[(seed + 1) % relatedProducts.length] : undefined;
    return [left, right] as const;
  }, [product.id, relatedProducts.length]); // eslint-disable-line react-hooks/exhaustive-deps -- relatedProducts is a fresh array reference every render (`?? []`); length is what actually changes

  const pages = [leftSibling, product, rightSibling].filter((p): p is Product => Boolean(p));
  const centerIndex = pages.indexOf(product);
  const pageWidth = screenWidth - 2 * PEEK_WIDTH - PAGE_GAP;
  const sideInset = (screenWidth - pageWidth) / 2;
  const initialScrollX = centerIndex * (pageWidth + PAGE_GAP);

  // One grow value per page, created lazily and kept keyed by product id
  // (not array index) so it survives leftSibling/rightSibling being
  // re-picked — see this file's own note on why grow lives here now, not
  // inside Card: a grown page needs to escape its narrow peek-pager slot
  // and cover the full screen, which means the *pager* has to read that
  // page's grow value to widen its slot, not just Card itself.
  // A Map in useState (not useRef) — this repo's react-compiler lint rule
  // flags reading `.current` during render, which pages.map below needs to
  // do on every render to look up (or lazily create) each page's grow
  // value. A useState value read during render is fine; only `ref.current`
  // access is what the rule targets — same reasoning as the lazy
  // useState(() => new Animated.Value(0)) pattern already used for `grow`/
  // `dragY` elsewhere in this file, just keyed by id instead of being a
  // single value.
  const [growValues] = useState(() => new Map<string, Animated.Value>());
  function getGrowValue(id: string) {
    let value = growValues.get(id);
    if (!value) {
      value = new Animated.Value(0);
      growValues.set(id, value);
    }
    return value;
  }
  // Tracks continuous horizontal scroll offset (not native-driver, same as
  // `grow` below — `left` isn't a native-drivable prop either) so a grown
  // page's `left` can be driven to exactly cancel the pager's own scroll
  // transform (screenX = contentX - scrollX, so contentX must equal
  // scrollX for screenX to land at 0, i.e. flush with the real screen
  // edge) regardless of where the user had scrolled to when they grew it.
  const [scrollX] = useState(() => new Animated.Value(initialScrollX));
  const [handlePagerScroll] = useState(() =>
    Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false }),
  );
  const pagerRef = useRef<ScrollView>(null);
  // Only one page can be grown at a time; while any is, the pager itself
  // stops scrolling (a half-visible neighbor sliding under a fullscreen
  // card would look broken) and re-enables once that page shrinks back.
  const [grownProductId, setGrownProductId] = useState<string | null>(null);

  // + sideInset slack: the rightmost page, once grown, sits at
  // `left: scrollX` (≈ its own restLeft) with `width: screenWidth` — that
  // span runs exactly `sideInset` px past this content width without the
  // extra room below. RN's horizontal ScrollView clips absolutely-
  // positioned children to the declared contentContainerStyle width
  // (strictly enforced on Android), so without this the last product's
  // grown card got its right edge sheared off — the actual bug behind
  // "card doesn't fill the screen when dragged up". Only the last index
  // can ever overflow (the math is symmetric the other direction), so a
  // flat sideInset of slack at the end covers every case.
  const contentWidth = pages.length * pageWidth + (pages.length - 1) * PAGE_GAP + 2 * sideInset + sideInset;

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
        <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
        <View className="absolute inset-0 bg-black/5" />
        <Pressable className="absolute inset-0" onPress={onClose} />

        {pages.length > 1 ? (
          <ScrollView
            ref={pagerRef}
            horizontal
            decelerationRate="fast"
            snapToInterval={pageWidth + PAGE_GAP}
            snapToAlignment="start"
            showsHorizontalScrollIndicator={false}
            scrollEnabled={grownProductId === null}
            onScroll={handlePagerScroll}
            scrollEventThrottle={16}
            contentOffset={{ x: initialScrollX, y: 0 }}
            contentContainerStyle={{ width: contentWidth, height: '100%' }}
            style={{ flex: 1 }}
          >
            {pages.map((p, i) => {
              const grow = getGrowValue(p.id);
              const restLeft = sideInset + i * (pageWidth + PAGE_GAP);
              const left = Animated.add(
                Animated.multiply(grow.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), restLeft),
                Animated.multiply(grow, scrollX),
              );
              const width = grow.interpolate({ inputRange: [0, 1], outputRange: [pageWidth, screenWidth] });
              const zIndex = grow.interpolate({ inputRange: [0, 1], outputRange: [i + 1, 100] });

              return (
                <Animated.View key={p.id} style={{ position: 'absolute', top: 0, height: '100%', left, width, zIndex }}>
                  <Card
                    product={p}
                    onClose={onClose}
                    grow={grow}
                    onGrowChange={(isGrown) => {
                      // Snap the REAL ScrollView to this page's exact known
                      // SCROLL OFFSET the instant it starts growing — the
                      // live tracked scrollX can be a few px off if
                      // momentum from a horizontal swipe hadn't fully
                      // settled when the vertical grow-drag registered.
                      // i * (pageWidth + PAGE_GAP), NOT restLeft — restLeft
                      // is this page's position in CONTENT space (it
                      // includes sideInset, the resting-state gutter that
                      // scrolling reveals); the scroll OFFSET that brings
                      // page i to rest is initialScrollX's own formula,
                      // which never includes sideInset. Using restLeft
                      // here (an earlier version of this fix) was off by
                      // exactly sideInset on both grow (shifted the whole
                      // fullscreen card sideways) and shrink (left the
                      // ScrollView's real position permanently off by that
                      // same amount once scrolling re-enabled, corrupting
                      // the peek layout afterward — the actual "not proper
                      // size when closed" bug).
                      if (isGrown) pagerRef.current?.scrollTo({ x: i * (pageWidth + PAGE_GAP), y: 0, animated: false });
                      setGrownProductId(isGrown ? p.id : (prev) => (prev === p.id ? null : prev));
                    }}
                  />
                </Animated.View>
              );
            })}
          </ScrollView>
        ) : (
          <Card product={product} onClose={onClose} grow={getGrowValue(product.id)} onGrowChange={() => {}} />
        )}
      </View>
    </Modal>
  );
}

interface CardProps {
  product: Product;
  onClose: () => void;
  grow: Animated.Value;
  onGrowChange: (isGrown: boolean) => void;
}

function Card({ product, onClose, grow, onGrowChange }: CardProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [isBookmarked, setIsBookmarked] = useState(false);

  const needsSimilar = !product.relatedProducts;
  const similar = useSimilarProducts(needsSimilar ? product.categoryLabel : undefined, product.id);
  const relatedProducts = product.relatedProducts ?? similar.data ?? [];
  const cartTotalQuantity = useCartStore(selectCartTotalQuantity);

  const isGrownRef = useRef(false);
  // Drag-to-dismiss offset — 0 at rest, animates toward screenHeight on a
  // successful drag-down dismissal. Separate Animated.Value from `grow`
  // (that one drives the resting-vs-full-screen margins/radii) since this
  // is a transform offset layered on top of whatever `grow` state the card
  // is already in, not a replacement for it.
  const [dragY] = useState(() => new Animated.Value(0));
  const [panResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: Animated.event([null, { dy: dragY }], { useNativeDriver: true }),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DRAG_DISMISS_DISTANCE || gesture.vy > DRAG_DISMISS_VELOCITY) {
          Animated.timing(dragY, { toValue: screenHeight, duration: DISMISS_ANIMATION_MS, useNativeDriver: true }).start(() => {
            onClose();
            dragY.setValue(0);
          });
        } else {
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  );

  const isOverscrollDismissingRef = useRef(false);
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    if (offsetY > GROW_TRIGGER_DISTANCE && !isGrownRef.current) {
      isGrownRef.current = true;
      onGrowChange(true);
      Animated.timing(grow, { toValue: 1, duration: GROW_ANIMATION_MS, useNativeDriver: false }).start();
    } else if (offsetY <= SHRINK_TRIGGER_DISTANCE && isGrownRef.current) {
      isGrownRef.current = false;
      onGrowChange(false);
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
  const closeButtonTop = grow.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight * REST_MARGIN_FRACTION - CLOSE_BUTTON_SIZE - CLOSE_BUTTON_GAP, -CLOSE_BUTTON_SIZE],
  });
  const closeButtonOpacity = grow.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const cardMarginBottom = grow.interpolate({ inputRange: [0, 1], outputRange: [CARD_BOTTOM_MARGIN, 0] });
  const cardBottomRadius = grow.interpolate({ inputRange: [0, 1], outputRange: [CARD_BOTTOM_RADIUS, 0] });
  const headerTop = grow.interpolate({ inputRange: [0, 1], outputRange: [14, insets.top + 14] });
  const footerPaddingBottom = grow.interpolate({ inputRange: [0, 1], outputRange: [FOOTER_REST_PADDING, insets.bottom] });

  return (
    <View style={{ flex: 1 }} pointerEvents="box-none">
      {/* Floating close (X), centered above this card's own top edge. */}
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
          marginBottom: cardMarginBottom,
          borderTopLeftRadius: CARD_RADIUS,
          borderTopRightRadius: CARD_RADIUS,
          borderBottomLeftRadius: cardBottomRadius,
          borderBottomRightRadius: cardBottomRadius,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          transform: [{ translateY: dragY }],
        }}
        className="shadow-lg shadow-black/30"
      >
        <Animated.View
          {...panResponder.panHandlers}
          style={{ top: headerTop }}
          className="absolute left-4 right-4 z-10 items-center gap-2.5"
        >
          <View pointerEvents="none" className="h-1 w-9 rounded-full bg-ink/15" />

          <View className="w-full flex-row items-center justify-between">
            <Text className="text-lg font-medium text-ink">Product Details</Text>

            <View className="flex-row gap-2">
           
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
          <View className="relative h-80 w-full pt-14" style={{ backgroundColor: '#FAFAFA' }}>
            {/* Same convention as ProductCardView.tsx: a real photo (imageUrl
                set) is "contain" so it isn't cropped; the placeholder graphic
                has a lot of baked-in transparent padding of its own, so
                "contain"-ing THAT on top doubles up as a mostly-empty box —
                "cover" fills the frame instead. */}
            <Image
              source={{ uri: product.imageUrl || PLACEHOLDER_IMAGE_URI }}
              className="h-full w-full"
              resizeMode={product.imageUrl ? 'contain' : 'cover'}
            />

            {/* Dots are purely decorative — this product has only one real
                photo (Product['imageUrl'], types.ts has no gallery array). */}
            <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5">
              <View className="h-1.5 w-1.5 rounded-full bg-ink" />
              <View className="h-1.5 w-1.5 rounded-full bg-ink/25" />
              <View className="h-1.5 w-1.5 rounded-full bg-ink/25" />
              <View className="h-1.5 w-1.5 rounded-full bg-ink/25" />
            </View>
          </View>

          <ProductDetailInfo product={product} relatedProducts={relatedProducts} />
        </Animated.ScrollView>

        <View className="absolute bottom-0 left-0 right-0">
          {cartTotalQuantity > 0 && (
            <View className="items-center pb-3">
              <CartBar />
            </View>
          )}
          <Animated.View style={{ paddingBottom: footerPaddingBottom }} className="overflow-hidden">
            <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
            <View className="absolute inset-0 bg-white/40" />
            <ProductDetailFooter product={product} />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

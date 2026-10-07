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
// While floating (resting state, before scrolling grows it) the card is
// TOP-anchored — it opens just below the status bar and pulls in from both
// sides (CARD_SIDE_MARGIN); the blurred backdrop shows as empty space BELOW
// it (REST_BOTTOM_MARGIN_FRACTION), where the floating close (X) sits. All
// four corners are rounded while floating. Dragging the content (the
// ScrollView
// holding the hero image + ProductDetailInfo) UP past GROW_TRIGGER_DISTANCE
// crosses a threshold that animates every margin to 0 too (full screen);
// scrolling back near the top crosses it the other way and animates back
// to the floating margins. Top corners stay rounded the whole time, even at
// full screen; only the bottom corners square off once grown.
//
// This is a threshold *crossing* (tracked in a shared value, flipped inside
// the scroll worklet, animated once per crossing) rather than scrollY
// driving the margins directly via 1:1 interpolation — that direct
// approach has a feedback loop: growing the card enlarges the ScrollView's
// own visible height, which shrinks how far there is left to scroll, which
// caps scrollY below the distance needed to finish growing, leaving the
// card stuck part-grown. Decoupling "grown" from continuous scroll
// position (it only changes on a discrete crossing) breaks that loop.
//
// PERFORMANCE: this used to run on RN's classic Animated API with
// useNativeDriver: false throughout (margin/borderRadius/width/left aren't
// transforms/opacity — the only props the classic native driver supports),
// which meant every frame of the grow animation, and all scroll-driven
// gesture math, ran on the JS thread — exactly what read as "laggy" when
// scrolling or dragging. Reanimated's shared values + worklets commit
// straight to the shadow tree from the UI thread regardless of which
// style properties are involved, and react-native-gesture-handler's Pan
// gesture recognizes touches on the UI thread instead of round-tripping
// through the JS thread the way PanResponder does — this file now uses
// both for exactly that reason, not just to add a dependency.
//
// Closing works four ways: the floating X above whichever card is
// centered, dragging that card's header row down (Gesture.Pan, translationY),
// dragging the content DOWN while already scrolled to the very top
// (bounces enabled — the resulting negative contentOffset.y mirrors 1:1
// into that same dragY shared value, see the scroll handler's own notes),
// or tapping the backdrop. This coexists with the grow-on-scroll-up
// behavior above because they key off opposite signs of the same
// contentOffset.y: positive (scrolling up) grows the card, negative
// (overscrolling down at the top) drives the dismiss — a single scroll
// gesture is only ever one or the other, never both.
//
// Close/bookmark/share float in a fixed header layered on top of each
// card's own Animated.ScrollView, so they stay pinned to that card's top
// edge rather than scrolling away with the image. Footer stays outside the
// ScrollView too, pinned to the card's bottom edge. Close is the chevron-
// down pill floating top-left over the hero (with bookmark + share top-
// right); it tracks that specific card's own grow value with no cross-page
// state.
//
// Backdrop is a real glassmorphism blur (BlurView, same convention as
// BottomNavBar.tsx's own glass pill), rendered once behind the whole
// horizontal pager.
//
// No FlashList here, deliberately — FlashList virtualizes long, repeated-
// item lists (that's what it's for), and this pager never renders more
// than 3 items (the product + up to 2 siblings), each a fully distinct,
// non-repeating layout. There's nothing here for virtualization to help
// with; the jank this file actually had was animation/gesture-thread work,
// which is what the Reanimated/gesture-handler rewrite above addresses.

import { ArrowDown01Icon, Bookmark01Icon, Share03Icon, StarIcon } from '@hugeicons/core-free-icons';
import { useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  makeMutable,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../AppIcon';
import { AppImage as Image } from '../AppImage';
import { CartBar } from '../CartBar/CartBar';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { colors } from '../../theme/tokens';
import { selectCartTotalQuantity, useCartStore } from '../../store/useCartStore';
import { useEverydayEssentials } from '../../screens/home/everyday-essentials/useEverydayEssentials';
import { ProductDetailInfo } from './ProductDetailInfo';
import { ProductDetailFooter } from './ProductDetailFooter';
import { useSimilarProducts } from './useSimilarProducts';
import type { Product } from '../../screens/home/products/types';

const GROW_TRIGGER_DISTANCE = 24;
const SHRINK_TRIGGER_DISTANCE = 4;
// Bumped from 220ms + default (linear) easing — per an explicit ask
// ("make it even smooth"), an ease-out curve (fast start, gentle landing)
// reads as a real physical settle rather than a mechanical linear resize,
// and the extra ~70ms gives it room to actually be felt rather than
// snapping through the curve almost as fast as linear did.
const GROW_ANIMATION_MS = 290;
const GROW_EASING = Easing.out(Easing.cubic);
const CARD_RADIUS = 38;
const FOOTER_SPACER = 96;
// Card is TOP-anchored at rest (per an explicit ask): it opens just below
// the status bar, and the blurred backdrop is visible BELOW it instead of
// above. Small fixed top gap (added to insets.top in the worklet); the
// bottom space is a fraction of screen height so it scales across phones.
const REST_BOTTOM_MARGIN = 8;
const REST_TOP_MARGIN_FRACTION = 0.18;
const CARD_BOTTOM_RADIUS = 28;
// Footer's own bottom padding while floating — small fixed gap, not the
// full safe-area inset, since the card's bottom margin already clears the
// home indicator at rest. Animates up to the real insets.bottom once grown
// (card is flush against the physical edge again then).
const FOOTER_REST_PADDING = 22;
// Drag-to-dismiss (the header row's own grab handle, not the ScrollView
// content — dragging content itself is already spoken for by the grow/
// shrink gesture above). Past DRAG_DISMISS_DISTANCE, or a fast enough
// downward flick (DRAG_DISMISS_VELOCITY_PX_S) even if short, closes the
// sheet; otherwise it springs back to resting position. Real screen
// height, not a fixed px, for the slide-away distance so the card fully
// clears the screen on every device size.
const DRAG_DISMISS_DISTANCE = 120;
// gesture-handler reports velocity in px/second (RN's old PanResponder
// reported px/ms) — 1.1 px/ms scaled up to that same unit is 1100 px/s,
// the same real flick speed the original threshold meant.
const DRAG_DISMISS_VELOCITY_PX_S = 1100;
const DISMISS_ANIMATION_MS = 200;
// Sibling peek pager — each page is narrower than the screen so the next/
// previous card's edge peeks in (PEEK_WIDTH visible on each side), with
// PAGE_GAP of breathing room between pages so they don't visually touch.
const PEEK_WIDTH = 22;
const PAGE_GAP = 12;
// SimilarProductsRow's own grid cap (that file's own MAX_PRODUCTS) — the
// number Card's own relatedProducts padding below fills up to.
const SIMILAR_PRODUCTS_TARGET = 9;

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

export function ProductDetailSheet(props: Props) {
  if (!props.visible) return null;
  return Platform.OS === 'android'
    ? <AndroidProductDetailContent key={props.product.id} {...props} />
    : <ProductDetailSheetContent key={props.product.id} {...props} />;
}

// Android opens one product immediately at full screen. It reuses the card's
// product, variant and cart logic without the iOS sibling pager/backdrop.
function AndroidProductDetailContent({ product, visible, onClose }: Props) {
  const grow = useSharedValue(1);
  return (
    <Modal visible={visible} animationType="none" transparent={false}
      statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <StatusBar barStyle="dark-content" />
        <Card product={product} onClose={onClose} grow={grow} onGrowChange={() => { }} fullScreen />
      </GestureHandlerRootView>
    </Modal>
  );
}

const EMPTY_PRODUCTS: Product[] = [];
function ProductDetailSheetContent({ product, visible, onClose }: Props) {
  const { width: screenWidth } = useWindowDimensions();

  // Mock products (still used by several data.ts files) set their own
  // relatedProducts inline — real backend products never do (api/products.ts
  // has no such field to set), so this only fires for those, and only once
  // the sheet is actually open.
  const needsSimilar = visible && !product.relatedProducts;
  const similar = useSimilarProducts(needsSimilar ? product.categoryLabel : undefined, product.id, product.storeId);
  const relatedProducts = product.relatedProducts ?? similar.data ?? EMPTY_PRODUCTS;

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
  }, [product.id, relatedProducts]);

  const pages = [leftSibling, product, rightSibling].filter((p): p is Product => Boolean(p));
  const centerIndex = pages.indexOf(product);
  const pageWidth = screenWidth - 2 * PEEK_WIDTH - PAGE_GAP;
  const sideInset = (screenWidth - pageWidth) / 2;
  const initialScrollX = centerIndex * (pageWidth + PAGE_GAP);
  // Track identity rather than index: asynchronously loaded neighbours can
  // shift the root product's index while the customer is viewing it.
  const [activeProductId, setActiveProductId] = useState(product.id);
  const selectedIndex = pages.findIndex(page => page.id === activeProductId);
  const activePageIndex = selectedIndex < 0 ? centerIndex : selectedIndex;
  const setActivePageIndex = (index: number) => setActiveProductId(pages[index]?.id ?? product.id);

  const activePage =
    pages[activePageIndex] ?? product;

  const previousPage =
    activePageIndex > 0
      ? pages[activePageIndex - 1]
      : undefined;

  const nextPage =
    activePageIndex < pages.length - 1
      ? pages[activePageIndex + 1]
      : undefined;

  // One grow shared value per page, created lazily and kept keyed by
  // product id (not array index) so it survives leftSibling/rightSibling
  // being re-picked — see this file's own note on why grow lives here now,
  // not inside Card: a grown page needs to escape its narrow peek-pager
  // slot and cover the full screen, which means the *pager* has to read
  // that page's grow value to widen its slot, not just Card itself.
  // makeMutable, not the useSharedValue hook — this Map is read/populated
  // during render (pages.map below), which the useSharedValue hook can't
  // be called conditionally/in a loop for; makeMutable creates the same
  // kind of shared value imperatively, exactly like the previous
  // `new Animated.Value(0)` this replaced.
  const [growValues] = useState(() => new Map<string, SharedValue<number>>());
  function getGrowValue(id: string) {
    let value = growValues.get(id);
    if (!value) {
      value = makeMutable(0);
      growValues.set(id, value);
    }
    return value;
  }
  const pagerRef = useRef<ScrollView>(null);
  const goToPage = (index: number) => {
    pagerRef.current?.scrollTo({
      x: index * (pageWidth + PAGE_GAP),
      y: 0,
      animated: true,
    });

    setActivePageIndex(index);
  };
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
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
        <View className="absolute inset-0 bg-black/5" />
        <Pressable accessibilityRole="button" accessibilityLabel="Close product details"
          className="absolute inset-0"
          onPress={onClose}
        />


        {/* ADD THIS HERE */}
        {grownProductId === null && pages.length > 1 && (
          <View
            pointerEvents="box-none"
            className="
      absolute
      left-0
      right-0
      top-0
      z-20
      h-[18.5%]
justify-end
pb-0.5
    "
          >
            <View className="flex-row items-end justify-center gap-3">

              {/* LEFT */}
              <View className="h-[58px] w-[58px]">
                {previousPage && (
                  <Pressable accessibilityRole="button" accessibilityLabel="Previous product"
                    onPress={() =>
                      goToPage(activePageIndex - 1)
                    }
                    className="
              h-[58px]
              w-[58px]
              overflow-hidden
              rounded-2xl
              border
              border-white/20
              bg-white/10
              opacity-60
              active:scale-95
            "
                  >
                    <Image
                      source={{
                        uri:
                          previousPage.imageUrl ||
                          PLACEHOLDER_IMAGE_URI,
                      }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  </Pressable>
                )}
              </View>


              {/* ACTIVE CENTER */}
              <View
                className="
          h-[72px]
          w-[72px]
          overflow-hidden
          rounded-2xl
          border-2
          border-white
          bg-white
        "
              >
                <Image
                  source={{
                    uri:
                      activePage.imageUrl ||
                      PLACEHOLDER_IMAGE_URI,
                  }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              </View>


              {/* RIGHT */}
              <View className="h-[58px] w-[58px]">
                {nextPage && (
                  <Pressable accessibilityRole="button" accessibilityLabel="Next product"
                    onPress={() =>
                      goToPage(activePageIndex + 1)
                    }
                    className="
              h-[58px]
              w-[58px]
              overflow-hidden
              rounded-2xl
              border
              border-white/20
              bg-white/10
              opacity-60
              active:scale-95
            "
                  >
                    <Image
                      source={{
                        uri:
                          nextPage.imageUrl ||
                          PLACEHOLDER_IMAGE_URI,
                      }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  </Pressable>
                )}
              </View>

            </View>
          </View>
        )}


        {/* EXISTING PAGER CONTINUES */}


        {pages.length > 1 ? (
          <ScrollView
            ref={pagerRef}
            horizontal
            decelerationRate="fast"
            snapToInterval={pageWidth + PAGE_GAP}
            snapToAlignment="start"
            showsHorizontalScrollIndicator={false}
            scrollEnabled={grownProductId === null}
            contentOffset={{
              x: initialScrollX,
              y: 0,
            }}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x /
                (pageWidth + PAGE_GAP),
              );

              const safeIndex = Math.max(
                0,
                Math.min(index, pages.length - 1),
              );

              setActivePageIndex(safeIndex);
            }}
            contentContainerStyle={{
              width: contentWidth,
              height: '100%',
            }}
            style={{ flex: 1 }}
          >
            {pages.map((p, i) => {
              const grow = getGrowValue(p.id);
              // restOffset is the exact scroll offset onGrowChange below
              // imperatively scrollTo's the pager to the instant this page
              // starts growing — using that same constant here (rather than
              // a live-tracked scroll position) means "flush with the real
              // screen edge" (screenX = contentLeft - actualScrollOffset = 0)
              // holds by construction, not by hoping a separately-tracked
              // value stays in sync with the native scroll position.
              const restLeft = sideInset + i * (pageWidth + PAGE_GAP);
              const restOffset = i * (pageWidth + PAGE_GAP);

              return (
                <PagerPage
                  key={p.id}
                  grow={grow}
                  restLeft={restLeft}
                  restOffset={restOffset}
                  pageWidth={pageWidth}
                  screenWidth={screenWidth}
                  zIndexBase={i + 1}
                >
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
                      if (isGrown) pagerRef.current?.scrollTo({ x: restOffset, y: 0, animated: false });
                      setGrownProductId(isGrown ? p.id : (prev) => (prev === p.id ? null : prev));
                    }}
                  />
                </PagerPage>
              );
            })}
          </ScrollView>
        ) : (
          <Card product={product} onClose={onClose} grow={getGrowValue(product.id)} onGrowChange={() => { }} />
        )}
      </View>
    </Modal>
  );
}

interface PagerPageProps {
  grow: SharedValue<number>;
  // Rest state (grow=0): this page's position in CONTENT space, includes
  // sideInset — the resting-state gutter around every page. Grown state
  // (grow=1): the real scroll OFFSET that brings this page flush to the
  // screen edge, which never includes sideInset. Conflating these two
  // (using one value for both ends of the interpolation) is exactly the
  // "off by sideInset on grow/shrink" bug this file's own header comment
  // documents having already fixed once — restLeft and restOffset must
  // stay two distinct numbers here.
  restLeft: number;
  restOffset: number;
  pageWidth: number;
  screenWidth: number;
  zIndexBase: number;
  children: React.ReactNode;
}

// One useAnimatedStyle per page, in its OWN component instance — pulled
// out of the pager's own pages.map() specifically because a hook can't be
// called inside a .map() callback (the count would change if
// leftSibling/rightSibling load in asynchronously after first render,
// which is a real rules-of-hooks violation, not just a lint nag). Keying
// each PagerPage by product.id (in the parent's pages.map) gives each one
// its own stable component instance instead.
function PagerPage({ grow, restLeft, restOffset, pageWidth, screenWidth, zIndexBase, children }: PagerPageProps) {
  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    top: 0,
    height: '100%',
    left: interpolate(grow.value, [0, 1], [restLeft, restOffset]),
    width: interpolate(grow.value, [0, 1], [pageWidth, screenWidth]),
    zIndex: interpolate(grow.value, [0, 1], [zIndexBase, 100]),
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

interface CardProps {
  product: Product;
  onClose: () => void;
  grow: SharedValue<number>;
  onGrowChange: (isGrown: boolean) => void;
  fullScreen?: boolean;
}

function Card({ product, onClose, grow, onGrowChange, fullScreen = false }: CardProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [isBookmarked, setIsBookmarked] = useState(false);

  const needsSimilar = !product.relatedProducts;
  const similar = useSimilarProducts(needsSimilar ? product.categoryLabel : undefined, product.id, product.storeId);
  // /stores/products/similar (useSimilarProducts) often comes back short of
  // SimilarProductsRow's own 9-card cap — a category/store just doesn't
  // always have 9 real matches. Padded here with real products from the
  // full zone-wide catalog (useEverydayEssentials — same cross-store feed
  // Home's own rows already trust) rather than leaving the grid half-empty,
  // per an explicit ask ("add total 9 cards ... randomly"). Picked via
  // hashString (already used above for the peek-pager siblings), not
  // Math.random — same reasoning: this repo's react-compiler lint rule
  // forbids an impure function during render/useMemo, and a hash of
  // (product.id + candidate.id) is "random-looking" per product without
  // being impure or reshuffling on every unrelated re-render.
  const { data: catalog = [] } = useEverydayEssentials();
  const relatedProducts = useMemo(() => {
    const base = product.relatedProducts ?? similar.data ?? EMPTY_PRODUCTS;
    const need = SIMILAR_PRODUCTS_TARGET - base.length;
    if (need <= 0) return base;
    const usedIds = new Set([product.id, ...base.map((p) => p.id)]);
    const filler = catalog
      .filter((p) => !usedIds.has(p.id))
      .sort((a, b) => hashString(product.id + a.id) - hashString(product.id + b.id))
      .slice(0, need);
    return [...base, ...filler];
  }, [product.id, product.relatedProducts, similar.data, catalog]);
  const cartTotalQuantity = useCartStore(selectCartTotalQuantity);

  // Lifted here (not local to ProductDetailInfo) — ProductDetailFooter is
  // this component's own sibling, not a child of ProductDetailInfo, and
  // needs to know which real variant is selected to add the CORRECT
  // price/weight to the cart, not always the base product's default one.
  // Defaults to the real default variant (product_variants.is_default —
  // variants[0], per api/products.ts's own sort) when the product has
  // more than one; undefined when it doesn't, which is exactly the
  // "if there is no options" fallback signal both children already read.
  const [selectedVariantId, setSelectedVariantId] = useState(product.defaultVariantId ?? product.variants?.[0]?.id);
  const selectedVariant = product.variants?.find((v) => v.id === selectedVariantId);

  // Drag-to-dismiss offset — 0 at rest, animates toward screenHeight on a
  // successful drag-down dismissal. Separate shared value from `grow`
  // (that one drives the resting-vs-full-screen margins/radii) since this
  // is a transform offset layered on top of whatever `grow` state the card
  // is already in, not a replacement for it.
  const dragY = useSharedValue(0);
  // isGrown/isOverscrollDismissing used to be plain refs — now shared
  // values, since the scroll worklet below runs on the UI thread and can't
  // reliably read/write a React ref's `.current` across threads. 0/1
  // stand in for boolean (Reanimated shared values are fine with booleans
  // too, but keeping this numeric matches `grow`'s own 0..1 range for
  // consistency).
  const isGrown = useSharedValue(0);
  const isOverscrollDismissing = useSharedValue(0);

  // Header row's own grab handle — dragging DOWN dismisses; dragging UP is
  // left alone (activeOffsetY(6) with no negative bound only activates on
  // downward movement past 6px, same as the original PanResponder's own
  // `gesture.dy > 6` check), and a big horizontal move fails this gesture
  // outright so it doesn't fight the horizontal sibling pager underneath.
  const panGesture = Gesture.Pan()
    .enabled(!fullScreen)
    .activeOffsetY(6)
    .failOffsetX([-15, 15])
    .onUpdate((event) => {
      dragY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY > DRAG_DISMISS_DISTANCE || event.velocityY > DRAG_DISMISS_VELOCITY_PX_S) {
        dragY.value = withTiming(screenHeight, { duration: DISMISS_ANIMATION_MS }, (finished) => {
          if (finished) {
            runOnJS(onClose)();
            dragY.value = 0;
          }
        });
      } else {
        dragY.value = withSpring(0);
      }
    });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (fullScreen) return;
      const offsetY = event.contentOffset.y;

      // `grow` is a Reanimated SharedValue passed down as a prop so the
      // pager (one level up) can read the same value for its own
      // page-width/left interpolation — mutating `.value` on both grow
      // branches below is the actual Reanimated API contract for a shared
      // value, not the accidental prop mutation this lint rule is meant
      // to catch, hence the disable on each assignment.
      if (offsetY > GROW_TRIGGER_DISTANCE && isGrown.value === 0) {
        isGrown.value = 1;
        // eslint-disable-next-line react-hooks/immutability
        grow.value = withTiming(1, { duration: GROW_ANIMATION_MS, easing: GROW_EASING });
        runOnJS(onGrowChange)(true);
      } else if (offsetY <= SHRINK_TRIGGER_DISTANCE && isGrown.value === 1) {
        isGrown.value = 0;
        grow.value = withTiming(0, { duration: GROW_ANIMATION_MS, easing: GROW_EASING });
        runOnJS(onGrowChange)(false);
      }

      if (isOverscrollDismissing.value === 1) return;
      dragY.value = offsetY < 0 ? -offsetY : 0;
    },
    onEndDrag: (event) => {
      if (fullScreen) return;
      const offsetY = event.contentOffset.y;
      if (offsetY > -DRAG_DISMISS_DISTANCE) return;
      isOverscrollDismissing.value = 1;
      dragY.value = withTiming(screenHeight, { duration: DISMISS_ANIMATION_MS }, (finished) => {
        if (finished) {
          runOnJS(onClose)();
          dragY.value = 0;
          isOverscrollDismissing.value = 0;
        }
      });
    },
  });

  const cardAnimatedStyle = useAnimatedStyle(() => fullScreen ? {
    marginTop: 0, marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
    transform: [{ translateY: 0 }],
  } : ({
    // Keep exactly the same resting card height.
    // We only move the large empty space from bottom -> top.
    marginTop: interpolate(
      grow.value,
      [0, 1],
      [
        screenHeight * REST_TOP_MARGIN_FRACTION +
        insets.top -
        insets.bottom,
        0,
      ],
    ),

    marginBottom: interpolate(
      grow.value,
      [0, 1],
      [insets.bottom + REST_BOTTOM_MARGIN, 0],
    ),

    borderBottomLeftRadius: interpolate(
      grow.value,
      [0, 1],
      [CARD_BOTTOM_RADIUS, 0],
    ),

    borderBottomRightRadius: interpolate(
      grow.value,
      [0, 1],
      [CARD_BOTTOM_RADIUS, 0],
    ),

    transform: [{ translateY: dragY.value }],
  }));

 const scrollHeaderStyle = useAnimatedStyle(() => ({
  opacity: grow.value,

  transform: [
    {
      translateY: interpolate(
        grow.value,
        [0, 1],
        [-8, 0],
      ),
    },
  ],
}));

const headerTitleStyle = useAnimatedStyle(() => ({
  opacity: interpolate(
    grow.value,
    [0, 0.45, 1],
    [0, 0, 1],
  ),

  transform: [
    {
      translateY: interpolate(
        grow.value,
        [0, 1],
        [4, 0],
      ),
    },
  ],
}));
  const headerRowStyle = useAnimatedStyle(() => ({
    top: interpolate(grow.value, [0, 1], [14, insets.top + 14]),
  }));

  const footerStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(grow.value, [0, 1], [FOOTER_REST_PADDING, insets.bottom]),
  }));

  return (
    <View style={{ flex: 1 }} pointerEvents="box-none">
      <Animated.View
        style={[
          {
            flex: 1,
            borderTopLeftRadius: fullScreen ? 0 : CARD_RADIUS,
            borderTopRightRadius: fullScreen ? 0 : CARD_RADIUS,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
          },
          cardAnimatedStyle,
        ]}
        className={fullScreen ? undefined : 'shadow-lg shadow-black/30'}
      >
        {/* Status-bar blur — only reachable once grown to full screen (the
            floating card's own top margin already clears the status bar,
            so this stays invisible until then); fades in with `grow`. Also
            doubles as a frosted backing for the header row's title/icons,
            which otherwise float directly on the scrolling hero image with
            nothing behind them once grown — per an explicit ask for a
            "premium" top treatment near the status bar. */}
       {/* SOLID HEADER — ONLY APPEARS WHEN CARD GROWS */}
<Animated.View
  pointerEvents="none"
  style={[
    {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: insets.top + 64,

      backgroundColor: '#FFFFFF',

      borderBottomWidth: 1,
      borderBottomColor: '#F0F1F3',

      zIndex: 5,
    },
    scrollHeaderStyle,
  ]}
/>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[{ position: 'absolute' }, headerRowStyle]} className="left-4 right-4 z-10">
            {/* Floating controls over the full-bleed hero (ref #106/#107):
                close (chevron-down) top-left, bookmark + share top-right.
                Translucent DARK pills + white icons rather than the ref's
                light pills — the hero photo can be light (milk carton) or
                dark (ice cream), and dark/25 stays legible on both where a
                light pill would vanish on a white product.
                ponytail: fixed tint; swap to a per-button BlurView glass pill
                if a truly adaptive frost is wanted. */}
            <View className="w-full flex-row items-center justify-between">
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10} className="h-10 w-10 items-center justify-center rounded-full bg-black/25">
                <AppIcon icon={ArrowDown01Icon} size={20} color="#FFFFFF" strokeWidth={2} />
              </Pressable>

              <View className="flex-row gap-2.5">
                <Pressable accessibilityRole="button" accessibilityLabel="Toggle wishlist"
                  hitSlop={10}
                  onPress={() => setIsBookmarked((v) => !v)}
                  className="h-10 w-10 items-center justify-center rounded-full bg-black/25"
                >
                  <AppIcon
                    icon={Bookmark01Icon}
                    size={18}
                    color="#FFFFFF"
                    fill={isBookmarked ? '#FFFFFF' : undefined}
                    strokeWidth={2}
                  />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Share product" hitSlop={10} className="h-10 w-10 items-center justify-center rounded-full bg-black/25">
                  <AppIcon icon={Share03Icon} size={18} color="#FFFFFF" strokeWidth={2} />
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </GestureDetector>

        <Animated.ScrollView
          bounces={!fullScreen}
          overScrollMode={fullScreen ? 'never' : 'auto'}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: fullScreen ? insets.top + 64 : 0,
            paddingBottom: FOOTER_SPACER + (fullScreen ? insets.bottom : 0) }}
        >
          <View className="relative h-80 w-full" style={{ backgroundColor: '#FAFAFA' }}>
            {/* Full-bleed hero (per an explicit ask, ref #107): image fills
                the entire frame edge-to-edge — 'cover', not the old
                'contain'. Real photos may crop slightly at the edges; that's
                the intended tradeoff for the full-occupy look. Clipped to the
                card's rounded top corners by the card's own overflow:hidden. */}
            <Image
              source={{ uri: product.imageUrl || PLACEHOLDER_IMAGE_URI }}
              className="h-full w-full"
              resizeMode="cover"
            />

            {/* Dots are purely decorative — this product has only one real
                photo (Product['imageUrl'], types.ts has no gallery array). */}
            <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5">
              <View className="h-1.5 w-1.5 rounded-full bg-white" />
              <View className="h-1.5 w-1.5 rounded-full bg-white/50" />
              <View className="h-1.5 w-1.5 rounded-full bg-white/50" />
              <View className="h-1.5 w-1.5 rounded-full bg-white/50" />
            </View>

            {/* Rating badge, bottom-right on the hero (ref #107). Light pill
                backing so it stays legible on both light and dark photos —
                the reference floats bare text, but the catalog's photos vary
                too much for that to read everywhere. */}
            <View className="absolute bottom-2.5 right-3 flex-row items-center gap-1 rounded-full bg-white/85 px-2 py-1">
              <AppIcon icon={StarIcon} size={12} color={colors.success} fill={colors.success} strokeWidth={0} />
              <Text className="text-[12px] font-bold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
                {product.rating.toFixed(1)} ({product.ratingCount})
              </Text>
            </View>
          </View>

          <ProductDetailInfo
            product={product}
            relatedProducts={relatedProducts}
            selectedVariantId={selectedVariantId}
            onSelectVariant={setSelectedVariantId}
          />
        </Animated.ScrollView>

        {/* Footer pinned INSIDE the card at its bottom edge (reverted to the
            earlier in-card layout per an explicit ask). CartBar floats above
            it; the footer itself is a frosted glass strip. */}
        <View className="absolute bottom-0 left-0 right-0">
          {cartTotalQuantity > 0 && (
            <View className="items-center pb-3">
              <CartBar onBeforeNavigate={onClose} />
            </View>
          )}
          <Animated.View style={[{ overflow: 'hidden' }, footerStyle]}>
            {fullScreen
              ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }]} />
              : <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />}
            <View className="absolute inset-0 bg-white/40" />
            <ProductDetailFooter product={product} selectedVariant={selectedVariant} />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

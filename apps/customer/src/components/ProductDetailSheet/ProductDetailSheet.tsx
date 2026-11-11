// Full-screen product details, same layout on iOS and Android: a navigation
// header fades in (with the product title) as the title scrolls up to it.
// Only the backing differs: frosted blur on iOS, near-solid white on Android,
// where expo-blur has no live blur and the content would show through.
import { StarIcon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { Modal, Platform, Pressable, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/types';
import { useWishlistStore } from '../../store/useWishlistStore';
import { AppIcon } from '../AppIcon';
import { IconlyArrowLeft, IconlySearch, IconlyUpload } from '../icons/iconly';
import { IconlyBookmark, IconlyBookmarkFilled } from '../icons/IconlyBookmark';
import { ProductImageGallery } from '../ProductImageGallery';
import { CartBar } from '../CartBar/CartBar';
import { colors } from '../../theme/tokens';
import { selectCartTotalQuantity, useCartStore } from '../../store/useCartStore';
import { shareProduct } from '../../utils/shareProduct';
import { ProductDetailInfo } from './ProductDetailInfo';
import { ProductDetailFooter } from './ProductDetailFooter';
import type { CutSize, Serving } from '../../store/cartIdentity';
import type { CartPreorder } from '../../store/preorder';
import type { Product } from '../../screens/home/products/types';

interface Props { product: Product; visible: boolean; onClose: () => void }

export function ProductDetailSheet(props: Props) {
  if (!props.visible) return null;
  return <ProductDetailContent key={props.product.id} {...props} />;
}

function ProductDetailContent({ product, visible, onClose }: Props) {
  // Tapping a similar product opens it in this same page; back steps through
  // the products opened here before closing the page.
  const [stack, setStack] = useState([product]);
  const current = stack[stack.length - 1]!;
  const back = () => (stack.length > 1 ? setStack((s) => s.slice(0, -1)) : onClose());
  const openProduct = (next: Product) => setStack((s) => [...s, next]);
  return (
    <Modal visible={visible} animationType="none" transparent={false}
      statusBarTranslucent navigationBarTranslucent onRequestClose={back}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <StatusBar barStyle="dark-content" />
        {/* Keyed per opened product: fresh scroll position and selections. */}
        <ProductDetailCard key={`${current.id}:${stack.length}`} product={current}
          onClose={onClose} onBack={back} onOpenProduct={openProduct} />
      </GestureHandlerRootView>
    </Modal>
  );
}

interface CardProps extends Pick<Props, 'product' | 'onClose'> {
  onBack: () => void;
  onOpenProduct: (product: Product) => void;
}

function ProductDetailCard({ product, onClose, onBack, onOpenProduct }: CardProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isIOS = Platform.OS === 'ios';
  // Controls (40pt, 6pt below the status bar) plus a small gap before the photo.
  const headerHeight = insets.top + 54;
  const [footerHeight, setFooterHeight] = useState(140 + insets.bottom);
  const scrollY = useSharedValue(0);
  // The header title appears once ~30% of the photo has scrolled away.
  const titleShowAt = (width * 810 / 720) * 0.3;
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = Math.max(0, event.contentOffset.y);
  });
  // Use the actual content position, so rotation and different image widths
  // keep the navigation title aligned with the title leaving the content.
  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 72], [0, 1], Extrapolation.CLAMP),
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [titleShowAt - 24, titleShowAt + 16], [0, 1], Extrapolation.CLAMP),
  }));
  const hasRatings = Number.isFinite(product.rating) && product.rating > 0 && product.rating <= 5
    && Number.parseFloat(product.ratingCount) > 0;

  const cartTotalQuantity = useCartStore(selectCartTotalQuantity);
  // Header bookmark = the wishlist (Profile → Wishlist); red-filled when saved.
  const isSaved = useWishlistStore((state) => state.isWishlisted(product.id));
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  // Close the sheet first so Search opens on top, not behind the modal.
  const openSearch = () => { onClose(); navigation.navigate('Search'); };

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
  const [selectedCut, setSelectedCut] = useState<CutSize>('medium');
  // First in-stock flavour preselected; its photo leads the hero.
  const [selectedOptionId, setSelectedOptionId] = useState(product.options?.find((o) => o.isAvailable)?.id);
  const selectedOption = product.options?.find((o) => o.id === selectedOptionId);
  // Chilled preselected when both are offered; one offered needs no choice.
  const [selectedServing, setSelectedServing] = useState<Serving | undefined>(product.servingOptions?.[0]);
  const lineServing = (product.servingOptions?.length ?? 0) > 1 ? selectedServing : undefined;
  // Pre-order day + slot: starts at the cart's own, and moves the cart with it.
  const cartSlot = useCartStore((s) => s.preorder);
  const [preorder, setPreorder] = useState<CartPreorder | undefined>(product.preorder ? cartSlot ?? undefined : undefined);
  const selectPreorder = (next: CartPreorder | undefined) => {
    setPreorder(next);
    if (next) useCartStore.getState().setPreorder(next);
  };
  const productPhotos = product.imageUrls ?? (product.imageUrl ? [product.imageUrl] : []);
  const heroPhotos = selectedOption?.imageUrls?.length
    ? selectedOption.imageUrls
    : selectedOption?.imageUrl ? [selectedOption.imageUrl] : productPhotos;


  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Animated.ScrollView
        bounces
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: headerHeight,
          paddingBottom: footerHeight }}
      >
        <View style={{ width: '100%', aspectRatio: 720 / 810, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
          <ProductImageGallery key={selectedOption?.id ?? product.id} variant="hero" images={heroPhotos} />
          {hasRatings && (
            <View className="absolute bottom-2.5 right-3 flex-row items-center gap-1 rounded-full bg-white/85 px-2 py-1">
              <AppIcon icon={StarIcon} size={12} color={colors.success} fill={colors.success} strokeWidth={0} />
              <Text className="text-[12px] font-bold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
                {product.rating.toFixed(1)} ({product.ratingCount})
              </Text>
            </View>
          )}
        </View>
        <View>
          <ProductDetailInfo
            product={product}
            selectedVariantId={selectedVariantId}
            selectedCut={product.cutOptions ? selectedCut : undefined}
            onSelectCut={setSelectedCut}
            selectedOptionId={selectedOptionId}
            onSelectOption={setSelectedOptionId}
            selectedServing={selectedServing}
            onSelectServing={setSelectedServing}
            preorder={preorder}
            onSelectPreorder={selectPreorder}
            onSelectVariant={setSelectedVariantId}
            onSelectProduct={onOpenProduct}
          />
        </View>
      </Animated.ScrollView>

      {/* Fixed controls remain tappable while the content scrolls underneath. */}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: headerHeight }}>
        {/* iOS: frosted backing fades in on scroll. Android: always solid white. */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, isIOS ? headerStyle : { opacity: 1 }]}>
          {isIOS && <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isIOS ? 'rgba(255,255,255,0.55)' : '#FFFFFF' }]} />
        </Animated.View>
        <View style={{ position: 'absolute', top: insets.top + 6, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} hitSlop={10}
            className="h-10 w-10 items-center justify-center rounded-full bg-white" style={styles.control}>
            <IconlyArrowLeft size={22} color={colors.ink} />
          </Pressable>
          <Animated.View style={[{ flex: 1 }, titleStyle]} pointerEvents="none">
            <Text numberOfLines={1} className="text-[17px] font-semibold text-ink">{product.name}</Text>
          </Animated.View>
          <Pressable accessibilityRole="button"
            accessibilityLabel={isSaved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            accessibilityState={{ selected: isSaved }}
            onPress={() => toggleWishlist(product)} hitSlop={6}
            className="h-10 w-10 items-center justify-center rounded-full bg-white" style={styles.control}>
            {isSaved ? <IconlyBookmarkFilled size={21} color={colors.danger} />
              : <IconlyBookmark size={21} color={colors.ink} />}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Search products"
            onPress={openSearch} hitSlop={6}
            className="h-10 w-10 items-center justify-center rounded-full bg-white" style={styles.control}>
            <IconlySearch size={20} color={colors.ink} />
          </Pressable>
          <Pressable accessibilityRole="button"
            accessibilityLabel={`Share ${product.name}`}
            onPress={() => shareProduct(product)} hitSlop={6}
            className="h-10 w-10 items-center justify-center rounded-full bg-white" style={styles.control}>
            <IconlyUpload size={20} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      <View className="absolute bottom-0 left-0 right-0" onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}>
        {cartTotalQuantity > 0 && <View className="items-center pb-3"><CartBar onBeforeNavigate={onClose} /></View>}
        {/* Square bar flush with the screen edges; a hairline separates it from
            the content. Bottom padding only clears the system navigation bar. */}
        <View style={{ overflow: 'hidden', paddingBottom: Math.max(insets.bottom - 6, 6),
          borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' }}>
          {isIOS && <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: isIOS ? 'rgba(255,255,255,0.88)' : '#FFFFFF' }]} />
          <ProductDetailFooter product={product} selectedVariant={selectedVariant} cutSize={product.cutOptions ? selectedCut : undefined} option={selectedOption} serving={lineServing} preorder={preorder} />
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  control: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
});

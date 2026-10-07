// Full-screen "You might also like" grid — opened by ForgotToAddSection's
// own "See all" bar. Same real catalog feed and cart-exclusion rule that
// section already uses (useEverydayEssentials, filtered against
// cartItemIds), just the FULL 15-card list instead of that section's own
// 6-card preview, per an explicit ask/reference image.
//
// Deduped by product id via a Map (not just `.slice(0, 15)` off the raw
// catalog) — guarantees no card ever repeats even if the catalog response
// itself ever carried a duplicate row, per an explicit ask ("there should
// not be any duplicate").
//
// Cancel01Icon (Hugeicons) floating close button, same circular white/90
// + shadow treatment ProductDetailSheet.tsx's own close button uses — per
// an explicit ask ("use hugeicons only").
//
// Top strip is a real blur, not a white bg — per an explicit ask, `Modal`
// is `transparent` (Cart stays mounted and visible behind it, same
// convention ProductDetailSheet.tsx's own backdrop already uses) with a
// BlurView over a fixed-height TOP_STRIP_HEIGHT band, so the close button
// floats over the actual blurred Cart screen rather than a flat color. The
// grid content below that strip is still a plain white sheet (rounded top
// corners) — only the header band above it is blurred-through.

import { BlurView } from 'expo-blur';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../components/AppIcon';
import { ProductCard } from '../../home/products/ProductCard';
import { useEverydayEssentials } from '../../home/everyday-essentials/useEverydayEssentials';
import type { Product } from '../../home/products/types';

const GRID_SIZE = 15;
const CARD_WIDTH = 'w-[31%]';
// Safe-area top inset + room for the close button row — tall enough that a
// real slice of the blurred Cart screen behind it reads clearly, short
// enough that the actual product grid still owns most of the screen.
const TOP_STRIP_EXTRA_HEIGHT = 96;

interface Props {
  visible: boolean;
  cartItemIds: string[];
  onClose: () => void;
}

function dedupeById(products: Product[]): Product[] {
  const seen = new Map<string, Product>();
  for (const product of products) {
    if (!seen.has(product.id)) seen.set(product.id, product);
  }
  return [...seen.values()];
}

export function ForgotToAddModal({ visible, cartItemIds, onClose }: Props) {
  const { data: catalog = [] } = useEverydayEssentials();
  const candidates = dedupeById(catalog.filter((product) => !cartItemIds.includes(product.id))).slice(0, GRID_SIZE);
  const insets = useSafeAreaInsets();
  const topStripHeight = insets.top + TOP_STRIP_EXTRA_HEIGHT;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1">
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height: topStripHeight }]}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View className="absolute inset-0 bg-black/10" />
        </View>

        <View style={{ height: topStripHeight }} className="items-center justify-end pb-3">
          <Pressable accessibilityRole="button" accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={10}
            className="h-11 w-11 items-center justify-center rounded-full bg-black/70"
          >
            <AppIcon icon={Cancel01Icon} size={20} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        </View>

        <View className="flex-1 bg-white">
          <ScrollView contentContainerClassName="px-5 pb-10 pt-5">
            <Text className="mb-4 pt-6 pb-3 text-[17px] font-semibold text-ink">You might also need</Text>

            <View className="flex-row flex-wrap gap-x-2.5 gap-y-5">
              {candidates.map((product) => (
                <ProductCard key={product.id} product={product} widthClassName={CARD_WIDTH} showDiscountBadge />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

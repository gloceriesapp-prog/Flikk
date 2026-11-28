import { Pressable, Text, View } from 'react-native';
import { Add01Icon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../AppIcon';
import { AppImage } from '../AppImage';
import { RupeePrice } from '../RupeePrice';
import { MAIN_PRODUCT_CHOICE } from '../ProductDetailSheet/flavourSelection';
import { flavourPacks, flavourPrice } from './flavourPricing';
import { flavourAvailableQuantity, canAddFlavourPack } from './flavourStock';
import { stockLabel } from '../stockLabel';
import { styles } from './FlavourPicker.styles';
import type { Product, ProductOption } from '../../screens/home/products/types';
import { cartLineId, type CutSize, type Serving } from '../../store/cartIdentity';
import { useCartStore } from '../../store/useCartStore';
import { addToCart } from '../../store/addToCart';
import type { CartPreorder } from '../../store/preorder';
import { actionColors } from '../../theme/tokens';
type Pack = ReturnType<typeof flavourPacks>[number];

// One pack (and flavour) in the picker's sideways row: photo with a round +
// that turns into a − qty + stepper, then the size, flavour, stock and price.
export function FlavourPickerCard({ product, option, pack, isAvailable, availabilityLabel, cut, serving, preorder, showFlavour }: {
  product: Product; option: ProductOption; pack: Pack; isAvailable: boolean; availabilityLabel?: string;
  cut?: CutSize; serving?: Serving; preorder?: CartPreorder; showFlavour?: boolean;
}) {
  const chosen = option.id === MAIN_PRODUCT_CHOICE ? undefined : option;
  const id = cartLineId(product.id, pack.id, cut, chosen?.id, serving);
  const quantity = useCartStore(state => state.items.find(item => item.id === id)?.quantity ?? 0);
  const decrement = useCartStore(state => state.decrementItem);
  const { price, originalPrice } = flavourPrice(product, chosen, pack.id ? { ...pack, id: pack.id } : undefined);
  const unavailable = !isAvailable || !option.isAvailable || pack.isAvailable === false;
  const availableCount = flavourAvailableQuantity(product, chosen, pack);
  const lowStock = stockLabel(availableCount, !unavailable);
  const atStockLimit = useCartStore(state => !canAddFlavourPack(product, chosen, pack, state.items, quantity === 0 ? product.preorder?.minQty ?? 1 : 1));
  const needsSlot = !!product.preorder && !preorder;
  // Screen-reader name: product or flavour, then the pack.
  const label = `${option.name}, ${pack.label}`;
  function add() {
    addToCart({ id, productId: product.id, category: product.categoryLabel, variantId: pack.id, optionId: chosen?.id, optionName: chosen?.name,
      cutSize: cut, serving, name: product.name, weight: pack.label, price, originalPrice,
      imageUrl: option.imageUrl ?? product.imageUrl, storeId: product.storeId ?? '', storeName: product.storeName,
      isAvailable: !unavailable, preorderMinQty: product.preorder?.minQty }, product.preorder ? preorder : undefined);
  }
  const blocked = unavailable || needsSlot || atStockLimit;
  return <View style={[styles.card, unavailable && styles.cardOff]}>
    <View style={styles.cardBody}>
    <View style={styles.imageBox}>
      <AppImage source={{ uri: option.imageUrl ?? product.imageUrl }} style={styles.image} resizeMode="contain" />
      {typeof product.isVeg === 'boolean' && <View pointerEvents="none" style={[styles.veg, { borderColor: product.isVeg ? '#00A650' : '#E23744' }]}>
        <View style={[styles.vegDot, { backgroundColor: product.isVeg ? '#00A650' : '#E23744' }]} />
      </View>}
      {quantity > 0 ? <View style={styles.stepper}>
        <Pressable onPress={() => decrement(id)} accessibilityRole="button" accessibilityLabel={`Remove ${label}`} style={styles.step} hitSlop={4}>
          <AppIcon icon={MinusSignIcon} size={17} color={actionColors.fill} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.quantity} accessibilityLiveRegion="polite">{quantity}</Text>
        <Pressable onPress={add} disabled={blocked} accessibilityRole="button" accessibilityLabel={`Add another ${label}`} style={[styles.step, blocked && { opacity: 0.4 }]} hitSlop={4}>
          <AppIcon icon={Add01Icon} size={17} color={actionColors.fill} strokeWidth={2.2} />
        </Pressable>
      </View> : <Pressable onPress={add} disabled={blocked} accessibilityRole="button"
        accessibilityLabel={`Add ${label} to cart`} style={[styles.plus, blocked && { opacity: 0.4 }]} hitSlop={6}>
        <AppIcon icon={Add01Icon} size={19} color={actionColors.fill} strokeWidth={2.2} />
      </Pressable>}
    </View>
    <View style={styles.details}>
      <Text style={styles.pack} numberOfLines={1}>{pack.label}</Text>
      {showFlavour && chosen ? <Text style={styles.flavour} numberOfLines={1}>{option.name}</Text> : null}
      {unavailable ? <Text style={styles.offLabel}>{!isAvailable ? availabilityLabel ?? 'Unavailable' : 'Out of stock'}</Text>
        : needsSlot ? <Text style={styles.offLabel}>Pick a slot above</Text> : null}
      <View style={styles.priceRow}>
        <RupeePrice amount={price} size={16} />
        {originalPrice != null && originalPrice > price ? <RupeePrice amount={originalPrice} size={13} strike color="#9AA0A8" /> : null}
      </View>
    </View>
    </View>
    {!unavailable && lowStock ? <View style={styles.stockStrip}><Text style={styles.stock}>Only {lowStock}</Text></View> : null}
  </View>;
}

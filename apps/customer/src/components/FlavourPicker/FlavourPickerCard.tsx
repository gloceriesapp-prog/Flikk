import { Pressable, Text, View } from 'react-native';
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
type Pack = ReturnType<typeof flavourPacks>[number];

export function FlavourPickerCard({ product, option, pack, isAvailable, availabilityLabel, cut, serving, preorder }: {
  product: Product; option: ProductOption; pack: Pack; isAvailable: boolean; availabilityLabel?: string;
  cut?: CutSize; serving?: Serving; preorder?: CartPreorder;
}) {
  const chosen = option.id === MAIN_PRODUCT_CHOICE ? undefined : option;
  const id = cartLineId(product.id, pack.id, cut, chosen?.id, serving);
  const quantity = useCartStore(state => state.items.find(item => item.id === id)?.quantity ?? 0);
  const decrement = useCartStore(state => state.decrementItem);
  const { price, originalPrice, unitPriceLabel } = flavourPrice(product, chosen, pack.id ? { ...pack, id: pack.id } : undefined);
  const unavailable = !isAvailable || !option.isAvailable || pack.isAvailable === false;
  const availableCount = flavourAvailableQuantity(product, chosen, pack);
  const lowStock = stockLabel(availableCount, !unavailable);
  const atStockLimit = useCartStore(state => !canAddFlavourPack(product, chosen, pack, state.items, quantity === 0 ? product.preorder?.minQty ?? 1 : 1));
  const needsSlot = !!product.preorder && !preorder;
  function add() {
    addToCart({ id, productId: product.id, variantId: pack.id, optionId: chosen?.id, optionName: chosen?.name,
      cutSize: cut, serving, name: product.name, weight: pack.label, price, originalPrice,
      imageUrl: option.imageUrl ?? product.imageUrl, storeId: product.storeId ?? '', storeName: product.storeName,
      isAvailable: !unavailable, preorderMinQty: product.preorder?.minQty }, product.preorder ? preorder : undefined);
  }
  const discount = originalPrice != null && originalPrice > price && originalPrice > 0
    ? Math.round((1 - price / originalPrice) * 100) : 0;
  return <View style={styles.card}>
    <View style={styles.imageBox}>
      <AppImage source={{ uri: option.imageUrl ?? product.imageUrl }} style={styles.image} resizeMode="contain" />
    </View>
    <View style={styles.details}>
      {chosen && option.name !== product.name ? <Text style={styles.name} numberOfLines={2}>{option.name}</Text> : null}
      <Text style={styles.pack}>{pack.label}</Text>
      {unitPriceLabel ? <Text style={styles.hint}>{unitPriceLabel}</Text> : null}
      {lowStock ? <Text style={[styles.hint, { color: '#D92D20' }]}>{lowStock}</Text> : null}
      <View style={styles.priceRow}><RupeePrice amount={price} size={17} />
        {originalPrice != null && originalPrice > price ? <RupeePrice amount={originalPrice} size={13} strike color="#868B95" /> : null}
        {discount > 0 ? <Text style={styles.discount}>{discount}% OFF</Text> : null}
      </View>
      {unavailable ? <Text style={styles.hint}>{!isAvailable ? availabilityLabel ?? 'Unavailable' : 'Out of stock'}</Text> : null}
    </View>
    <View style={styles.add}>
      {quantity > 0 ? <View style={styles.stepper}>
        <Pressable onPress={() => decrement(id)} accessibilityRole="button" accessibilityLabel={`Remove ${option.name}, ${pack.label}`} style={styles.step}><Text style={styles.actionText}>−</Text></Pressable>
        <Text style={[styles.actionText, styles.quantity]}>{quantity}</Text>
        <Pressable onPress={add} disabled={unavailable || needsSlot || atStockLimit} accessibilityRole="button" accessibilityLabel={`Add another ${option.name}, ${pack.label}`} style={[styles.step, (unavailable || needsSlot || atStockLimit) && styles.disabled]}><Text style={styles.actionText}>+</Text></Pressable>
      </View> : !unavailable ? <Pressable onPress={add} disabled={needsSlot || atStockLimit} accessibilityRole="button"
        accessibilityLabel={`Add ${option.name}, ${pack.label} to cart`} style={[styles.addButton, (needsSlot || atStockLimit) && styles.disabled]}>
        <Text style={needsSlot ? styles.slotText : styles.actionText}>{needsSlot ? 'Pick a slot' : '+'}</Text>
      </Pressable> : null}
    </View>
  </View>;
}

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
  return <View style={styles.card}>
    <View style={styles.imageBox}>
      <AppImage source={{ uri: option.imageUrl ?? product.imageUrl }} style={styles.image} resizeMode="contain" />
      <View style={styles.add}>
        {quantity > 0 ? <View style={styles.stepper}>
          <Pressable onPress={() => decrement(id)} accessibilityRole="button" accessibilityLabel={`Remove ${option.name}, ${pack.label}`} style={styles.step}><Text style={styles.actionText}>−</Text></Pressable>
          <Text style={styles.actionText}>{quantity}</Text>
          <Pressable onPress={add} disabled={unavailable || needsSlot || atStockLimit} accessibilityRole="button" accessibilityLabel={`Add another ${option.name}, ${pack.label}`} style={styles.step}><Text style={styles.actionText}>+</Text></Pressable>
        </View> : <Pressable onPress={add} disabled={unavailable || needsSlot || atStockLimit} accessibilityRole="button"
          accessibilityLabel={`Add ${option.name}, ${pack.label} to cart`} style={[styles.addButton, (unavailable || needsSlot) && styles.disabled]}>
          <Text style={styles.actionText}>{unavailable ? 'Unavailable' : needsSlot ? 'Pick a slot' : 'ADD'}</Text>
        </Pressable>}
      </View>
    </View>
    <View style={styles.details}>
      <Text style={styles.name} numberOfLines={2}>{option.name}</Text>
      {lowStock ? <Text style={[styles.hint, { color: '#D92D20' }]}>{lowStock}</Text> : null}
      <Text style={styles.pack}>{pack.label}</Text>
      <View style={styles.priceRow}><RupeePrice amount={price} size={22} />
        {originalPrice != null && originalPrice > price ? <RupeePrice amount={originalPrice} size={14} strike color="#868B95" /> : null}
      </View>
      {unitPriceLabel ? <Text style={styles.hint}>{unitPriceLabel}</Text> : null}
      {unavailable ? <Text style={styles.hint}>{!isAvailable ? availabilityLabel : 'Out of stock'}</Text> : null}
    </View>
  </View>;
}

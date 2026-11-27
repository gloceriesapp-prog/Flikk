import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../AppIcon';
import { AppImage } from '../AppImage';
import { FlavourPickerCard } from './FlavourPickerCard';
import { styles } from './FlavourPicker.styles';
import { ProductServingOptions } from '../ProductDetailSheet/ProductServingOptions';
import { ProductCutOptions } from '../ProductDetailSheet/ProductCutOptions';
import { ProductPreorderOptions } from '../ProductDetailSheet/ProductPreorderOptions';
import { MAIN_PRODUCT_CHOICE, flavourChoices } from '../ProductDetailSheet/flavourSelection';
import { CartBar } from '../CartBar/CartBar';
import { useCartStore } from '../../store/useCartStore';
import { flavourPacks } from './flavourPricing';
import type { Product } from '../../screens/home/products/types';
import { quickAddCut, type CutSize, type Serving } from '../../store/cartIdentity';
import type { CartPreorder } from '../../store/preorder';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';

interface Props {
  product: Product; visible: boolean; onClose: () => void; isAvailable: boolean; availabilityLabel?: string;
  // Opens the full product page (the header's chevron); hidden when absent.
  onOpenDetails?: () => void;
}

/** Mounted only by a card's Add action. Product-body navigation stays separate. */
export function FlavourPickerSheet(props: Props) {
  if (!props.visible) return null;
  return <FlavourPickerContent key={props.product.id} {...props} />;
}

// Quick-add tray: a floating card with the product at the top, any serving /
// cut / slot choices, then every pack (and flavour) in one sideways row.
function FlavourPickerContent({ product, onClose, isAvailable, availabilityLabel, onOpenDetails }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const cartQuantity = useCartStore(state => state.items.reduce((total, item) => total + item.quantity, 0));
  const [serving, setServing] = useState<Serving | undefined>(product.servingOptions?.[0]);
  const [cut, setCut] = useState<CutSize>(quickAddCut(product) ?? 'medium');
  const [preorder, setPreorder] = useState<CartPreorder>();
  const flavours = flavourChoices(product);
  const options = flavours.length ? flavours : [{ id: MAIN_PRODUCT_CHOICE, name: product.name,
    imageUrl: product.imageUrl, isAvailable: product.isAvailable !== false }];
  const choices = options.flatMap(option => flavourPacks(product).map(pack => ({ option, pack })));
  const hasChoices = !!product.servingOptions?.length || !!product.cutOptions || !!product.preorder;
  const openDetails = onOpenDetails ? () => { onClose(); onOpenDetails(); } : undefined;
  return <Modal transparent animationType="slide" visible statusBarTranslucent onRequestClose={onClose}>
    <View style={[styles.overlay, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close pack picker" />
      <View>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Done" style={styles.done} hitSlop={6}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
        <View style={[styles.container, { maxHeight: Math.min(height * 0.8, height - insets.top - 120) }]} accessibilityViewIsModal>
          <Pressable onPress={openDetails} disabled={!openDetails} accessibilityRole={openDetails ? 'button' : undefined}
            accessibilityLabel={openDetails ? `${product.name}, open product details` : undefined} style={styles.header}>
            <AppImage source={{ uri: product.imageUrl || PLACEHOLDER_IMAGE_URI }} style={styles.thumb} resizeMode="contain" accessible={false} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.headerName} numberOfLines={2} accessibilityRole="header">{product.name}</Text>
              {product.weight ? <Text style={styles.headerSub} numberOfLines={1}>{product.weight}</Text> : null}
            </View>
            {openDetails ? <AppIcon icon={ArrowRight01Icon} size={20} color="#151A17" strokeWidth={2} /> : null}
          </Pressable>
          {hasChoices ? <View style={styles.options}>
            {product.servingOptions?.length ? <ProductServingOptions options={product.servingOptions} selected={serving} onSelect={setServing} /> : null}
            {product.cutOptions ? <ProductCutOptions selected={cut} onSelect={setCut} bulkMinKg={product.bulkMinKg} /> : null}
            {product.preorder ? <ProductPreorderOptions minQty={product.preorder.minQty} leadDays={product.preorder.leadDays} value={preorder} onChange={setPreorder} /> : null}
          </View> : null}
          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>{flavours.length ? 'Select flavour & quantity' : 'Select quantity'}</Text>
          <FlatList data={choices} horizontal keyExtractor={({ option, pack }) => `${option.id}:${pack.id ?? 'base'}`}
            contentContainerStyle={[styles.list, { alignItems: 'flex-start' }]} showsHorizontalScrollIndicator={false} initialNumToRender={4} windowSize={3}
            renderItem={({ item }) => <FlavourPickerCard product={product} {...item} isAvailable={isAvailable}
              availabilityLabel={availabilityLabel} cut={product.cutOptions ? cut : undefined} showFlavour={flavours.length > 0}
              serving={(product.servingOptions?.length ?? 0) > 1 ? serving : undefined} preorder={preorder} />} />
          {cartQuantity > 0 && <View style={[styles.cartFooter, { paddingBottom: 12 }]}><CartBar onBeforeNavigate={onClose} /></View>}
        </View>
      </View>
    </View>
  </Modal>;
}

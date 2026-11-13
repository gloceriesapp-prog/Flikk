import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlavourPickerCard } from './FlavourPickerCard';
import { styles } from './FlavourPicker.styles';
import { IconlyClose } from '../icons/IconlyClose';
import { ProductServingOptions } from '../ProductDetailSheet/ProductServingOptions';
import { ProductCutOptions } from '../ProductDetailSheet/ProductCutOptions';
import { ProductPreorderOptions } from '../ProductDetailSheet/ProductPreorderOptions';
import { flavourChoices } from '../ProductDetailSheet/flavourSelection';
import { flavourPacks } from './flavourPricing';
import type { Product } from '../../screens/home/products/types';
import { quickAddCut, type CutSize, type Serving } from '../../store/cartIdentity';
import type { CartPreorder } from '../../store/preorder';

interface Props { product: Product; visible: boolean; onClose: () => void; isAvailable: boolean; availabilityLabel?: string }

/** Mounted only by a card's Add action. Product-body navigation stays separate. */
export function FlavourPickerSheet(props: Props) {
  if (!props.visible) return null;
  return <FlavourPickerContent key={props.product.id} {...props} />;
}
function FlavourPickerContent({ product, onClose, isAvailable, availabilityLabel }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [serving, setServing] = useState<Serving | undefined>(product.servingOptions?.[0]);
  const [cut, setCut] = useState<CutSize>(quickAddCut(product) ?? 'medium');
  const [preorder, setPreorder] = useState<CartPreorder>();
  const choices = flavourChoices(product).flatMap(option => flavourPacks(product).map(pack => ({ option, pack })));
  return <Modal transparent animationType="slide" visible statusBarTranslucent onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close flavour picker" />
      <View style={[styles.container, { maxHeight: Math.min(height * 0.84, height - insets.top - 80), paddingBottom: Math.max(insets.bottom, 16) }]} accessibilityViewIsModal>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.close} hitSlop={8}>
          <IconlyClose size={28} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">{product.name}</Text>
        <FlatList data={choices} numColumns={2} keyExtractor={({ option, pack }) => `${option.id}:${pack.id ?? 'base'}`}
          style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={styles.list} columnWrapperStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false} initialNumToRender={4} windowSize={3}
          ListHeaderComponent={<View style={{ gap: 14, marginBottom: 12 }}>
            <Text style={styles.hint}>Choose your flavour and pack</Text>
            {product.servingOptions?.length ? <ProductServingOptions options={product.servingOptions} selected={serving} onSelect={setServing} /> : null}
            {product.cutOptions ? <ProductCutOptions selected={cut} onSelect={setCut} bulkMinKg={product.bulkMinKg} /> : null}
            {product.preorder ? <ProductPreorderOptions minQty={product.preorder.minQty} leadDays={product.preorder.leadDays} value={preorder} onChange={setPreorder} /> : null}
          </View>}
          renderItem={({ item }) => <FlavourPickerCard product={product} {...item} isAvailable={isAvailable}
            availabilityLabel={availabilityLabel} cut={product.cutOptions ? cut : undefined}
            serving={(product.servingOptions?.length ?? 0) > 1 ? serving : undefined} preorder={preorder} />} />
      </View>
    </View>
  </Modal>;
}

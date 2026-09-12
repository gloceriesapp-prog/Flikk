// Product detail — reached from ProductRow's "View" trigger on the
// catalog. A real pushed screen (native-stack, same as OrderDetailScreen),
// not a bottom sheet: the old ProductManageSheet modal grew a name field,
// a variable-length list of size cards, and an expanding "add a size"
// picker on top of that — a sheet capped at 86-88% height starts fighting
// its own ScrollView at that point (double-scroll, cramped cards, a Save
// bar competing for the same few inches). Instamart/Blinkit's own seller
// tools treat "edit an item" as a full page for exactly this reason: a
// sheet is for a shallow, 2-3-field action, not an editable list. Matches
// this app's own precedent too — OrderDetailScreen (P3) is a real screen
// for the same reason, not a sheet over the order queue.
//
// Product is read live from useCatalogStore by productId (not passed as a
// route param) — same reasoning as OrderDetailScreen reading its order
// from useOrdersStore: avoids pushing a whole product object (and its
// callbacks) through navigation params.
//
// Sizes are added from a fixed picker (standardSizeOptions in
// ../catalog/data.ts), never typed free-hand — a customer ordering this
// product later picks from these exact same labels, so keeping shop
// owners off a fixed list is what makes size-matching possible at all.

import { useState } from 'react';
import { ArrowLeft01Icon, Edit02Icon, ShoppingBasketAdd01Icon } from '@hugeicons/core-free-icons';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { DismissKeyboardView } from '../../components/DismissKeyboardView';
import { colors } from '../../theme/tokens';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { useCatalogStore } from '../../store/useCatalogStore';
import { standardSizeOptions, type ProductVariant } from '../catalog/data';
import { suggestedMrp } from '../catalog/pricing';
import type { AppStackParamList } from '../../navigation/types';
import { AddSizeButton } from './components/AddSizeButton';
import { ProductVariantCard } from './components/ProductVariantCard';

type Props = NativeStackScreenProps<AppStackParamList, 'ProductDetail'>;

export function ProductDetailScreen({ route, navigation }: Props) {
  const product = useCatalogStore((state) => state.products.find((p) => p.id === route.params.productId));
  const updateProduct = useCatalogStore((state) => state.updateProduct);

  const [name, setName] = useState(product?.name ?? '');
  const [draft, setDraft] = useState<ProductVariant[]>(product?.variants ?? []);
  const [sizePickerOpen, setSizePickerOpen] = useState(false);

  if (!product) {
    navigation.navigate('Catalog');
    return null;
  }

  // Read through this instead of `product` inside the nested functions
  // below — TS narrows `product` to non-null here, but that narrowing
  // doesn't carry into a closure, so those functions would otherwise see
  // the original `PartnerProduct | undefined` type.
  const currentProduct = product;

  const addedLabels = new Set(draft.map((v) => v.label));
  const availableSizes = standardSizeOptions(currentProduct.category, currentProduct.variants).filter(
    (label) => !addedLabels.has(label)
  );

  function setVariantStock(variantId: string, isInStock: boolean) {
    Haptics.selectionAsync();
    setDraft((prev) => prev.map((v) => (v.id === variantId ? { ...v, isInStock } : v)));
  }

  function setVariantPrice(variantId: string, rawPrice: string) {
    const price = Number(rawPrice.replace(/[^0-9]/g, '')) || 0;
    setDraft((prev) =>
      prev.map((v) => {
        if (v.id !== variantId) return v;
        // Auto-fills a suggested MRP the moment a price is typed, only
        // while this variant's own MRP is still untouched.
        const originalPrice = v.originalPrice === undefined ? suggestedMrp(currentProduct.category, price) : v.originalPrice;
        return { ...v, price, originalPrice };
      }),
    );
  }

  function setVariantMrp(variantId: string, rawMrp: string) {
    const digits = rawMrp.replace(/[^0-9]/g, '');
    const originalPrice = digits ? Number(digits) : undefined;
    setDraft((prev) => prev.map((v) => (v.id === variantId ? { ...v, originalPrice } : v)));
  }

  function setVariantQuantity(variantId: string, rawQty: string) {
    const digits = rawQty.replace(/[^0-9]/g, '');
    const stockQuantity = digits === '' ? undefined : Number(digits);
    setDraft((prev) => prev.map((v) => (v.id === variantId ? { ...v, stockQuantity } : v)));
  }

  function addVariant(label: string) {
    Haptics.selectionAsync();
    setDraft((prev) => [...prev, { id: `new-${label}-${Date.now()}`, label, price: 0, isInStock: true }]);
    setSizePickerOpen(false);
  }

  function removeVariant(variantId: string) {
    // A product must always keep at least one purchasable size.
    if (draft.length <= 1) return;
    Haptics.selectionAsync();
    setDraft((prev) => prev.filter((v) => v.id !== variantId));
  }

  function handleSave() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProduct(currentProduct.id, name.trim() || currentProduct.name, draft);
    navigation.navigate('Catalog');
  }

  return (
    // Keyboard was covering the "Save changes" bar below (quantity
    // TextInputs inside the ScrollView, no keyboard-avoidance at all) —
    // same fix/reasoning as LoginScreen.tsx's own note.
    <DismissKeyboardView>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="relative flex-row items-center px-5 py-3">
        {/* navigate, not goBack — this screen is only ever reached from
            Catalog, but goBack pops whatever the stack happens to hold at
            the time, which isn't guaranteed to be Catalog. navigate makes
            "back arrow → Inventory" true regardless of navigation history. */}
        <Pressable
          onPress={() => navigation.navigate('Catalog')}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <AppIcon icon={ArrowLeft01Icon} size={18} color={colors.ink} />
        </Pressable>

        <Text className="absolute left-0 right-0 text-center text-xl font-medium tracking-tight text-ink">
          Manage product
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-6" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center gap-3">
          <View className="h-16 w-16 overflow-hidden rounded-2xl bg-gray-100">
            <Image source={{ uri: PLACEHOLDER_IMAGE_URI }} className="h-full w-full" resizeMode="cover" />
          </View>

          <View className="flex-1 gap-0.5">
            {/* Editable product name — plain TextInput styled to match the
                old static title, with a small pencil signaling it's
                tappable rather than leaving a shop owner to guess. */}
            <View className="flex-row items-center gap-1.5">
              <TextInput
                value={name}
                onChangeText={setName}
                className="flex-1 text-lg font-medium text-black tracking-tight"
                placeholder="Product name"
              />
              <AppIcon icon={Edit02Icon} size={14} color={`${colors.ink}90`} />
            </View>
            <Text className="text-sm font-medium text-ink/50 tracking-tight">
              {product.category} · {draft.length > 1 ? `${draft.length} sizes` : product.unit}
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <View className="flex-row items-center">
            <AppIcon
              icon={ShoppingBasketAdd01Icon}
              size={16}
              color={`${colors.ink}80`}
            />

            <View className="ml-2 flex-row items-center">
              <Text className="text-lg font-medium tracking-tight text-ink/70">
                {draft.length > 1 ? 'Sizes, stock & price' : 'Stock & price'}
              </Text>

              <Text className="ml-0.5 text-base font-bold text-red-500">
                *
              </Text>
            </View>
          </View>

          {draft.map((variant) => (
            <ProductVariantCard
              key={variant.id}
              variant={variant}
              canRemove={draft.length > 1}
              onToggleStock={(isInStock) => setVariantStock(variant.id, isInStock)}
              onChangePrice={(text) => setVariantPrice(variant.id, text)}
              onChangeMrp={(text) => setVariantMrp(variant.id, text)}
              onChangeQuantity={(text) => setVariantQuantity(variant.id, text)}
              onRemove={() => removeVariant(variant.id)}
            />
          ))}

          <AddSizeButton
            availableSizes={availableSizes}
            isOpen={sizePickerOpen}
            onToggleOpen={() => setSizePickerOpen((open) => !open)}
            onPickSize={addVariant}
          />
        </View>
      </ScrollView>

      {/* pb-9 (not pb-4) lifts the button well clear of the home indicator
          — matches OrderDetailScreen's own bottom-bar spacing. rounded-full
          + shadow instead of the old rounded-2xl flat fill, same pill
          language as SlideToConfirmButton elsewhere in this app. */}
      <View className="px-5 pb-9 pt-3">
        <Pressable
          onPress={handleSave}
          className="items-center justify-center rounded-full bg-black py-4 shadow-lg shadow-black/30"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          <Text className="text-lg font-medium tracking-tight text-white">Save changes</Text>
        </Pressable>
      </View>
    </SafeAreaView>
    </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}

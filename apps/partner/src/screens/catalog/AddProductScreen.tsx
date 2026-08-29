// New-product form — reached from Inventory's own "Add product" button
// (InventorySummaryCard, was "Manage stocks" with nothing wired to it).
// Field set mirrors admin's own AddProductModal (apps/admin/src/components/
// inventory/AddProductModal.tsx) on purpose, per an explicit ask: name,
// category (same fixed PRODUCT_CATEGORIES list), photo, and per-size
// price/stock — the same real input surface a founder gets, not a smaller
// stand-in. localName/description/isVeg/freshnessTag/subCategory are
// admin-only for now — a real gap, not an oversight, see this screen's own
// PR notes.
//
// Reuses ProductDetailScreen's own AddSizeButton/ProductVariantCard
// (product-detail/components) — same size-picker + price/stock card, this
// screen just starts from an empty draft instead of an existing product's.
//
// Submitting always lands as approval_status: 'pending' — see
// useCatalogStore.ts's own addProduct note and backend/src/routes/
// partner.ts's router-level note. This screen doesn't say so as a warning,
// just states it plainly on the submit button and success path, since it's
// expected behavior, not an error condition.

import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Camera01Icon, ShoppingBasketAdd01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { DismissKeyboardView } from '../../components/DismissKeyboardView';
import { colors } from '../../theme/tokens';
import { compressImageToTarget } from '../../media/compressImage';
import { uploadProductPhoto } from '../../api/catalog';
import { ApiError } from '../../api/client';
import { useCatalogStore } from '../../store/useCatalogStore';
import { standardSizeOptions, PRODUCT_CATEGORIES, type ProductVariant } from './data';
import { AddSizeButton } from '../product-detail/components/AddSizeButton';
import { ProductVariantCard } from '../product-detail/components/ProductVariantCard';
import { ProductCategoryPicker } from './components/ProductCategoryPicker';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'AddProduct'>;

export function AddProductScreen({ navigation }: Props) {
  const addProduct = useCatalogStore((state) => state.addProduct);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(PRODUCT_CATEGORIES[0]);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [sizePickerOpen, setSizePickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const addedLabels = new Set(variants.map((v) => v.label));
  const availableSizes = standardSizeOptions(category, variants).filter((label) => !addedLabels.has(label));
  const canSubmit = name.trim().length > 0 && variants.length > 0 && !submitting;

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, base64: true });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset.base64) return;

    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const compressed = await compressImageToTarget(asset.uri, asset.base64);
      const contentType = compressed.uri === asset.uri ? (asset.mimeType ?? 'image/jpeg') : 'image/jpeg';
      const { url } = await uploadProductPhoto(compressed.base64, contentType);
      setImageUrl(url);
    } catch (err) {
      setPhotoError(err instanceof ApiError ? err.message : 'Could not upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function addVariant(label: string) {
    Haptics.selectionAsync();
    setVariants((prev) => [...prev, { id: `new-${label}-${Date.now()}`, label, price: 0, isInStock: true }]);
    setSizePickerOpen(false);
  }

  function removeVariant(variantId: string) {
    setVariants((prev) => prev.filter((v) => v.id !== variantId));
  }

  function setVariantPrice(variantId: string, rawPrice: string) {
    const price = Number(rawPrice.replace(/[^0-9]/g, '')) || 0;
    setVariants((prev) => prev.map((v) => (v.id === variantId ? { ...v, price } : v)));
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const added = await addProduct({ name, category, imageUrl, variants });
      if (!added) {
        setFormError(`${name.trim()} is already listed in your store.`);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('Catalog');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not add product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DismissKeyboardView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View className="flex-1 bg-white pt-safe">
          <View className="relative flex-row items-center px-5 py-3">
            <Pressable
              onPress={() => navigation.navigate('Catalog')}
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <AppIcon icon={ArrowLeft01Icon} size={18} color={colors.ink} />
            </Pressable>
            <Text className="absolute left-0 right-0 text-center text-xl font-medium tracking-tight text-ink">
              Add product
            </Text>
          </View>

          <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-6" keyboardShouldPersistTaps="handled">
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={handlePickPhoto}
                disabled={uploadingPhoto}
                className="h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gray-100"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator color={colors.ink} />
                ) : imageUrl ? (
                  <Image source={{ uri: imageUrl }} className="h-full w-full" resizeMode="cover" />
                ) : (
                  <AppIcon icon={Camera01Icon} size={20} color={`${colors.ink}80`} />
                )}
              </Pressable>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Product name"
                placeholderTextColor={`${colors.ink}50`}
                className="flex-1 text-lg font-medium text-black tracking-tight"
              />
            </View>
            {photoError && <Text className="text-[13px] font-medium text-danger">{photoError}</Text>}

            <View className="gap-2.5">
              <Text className="text-lg font-medium tracking-tight text-ink/70">Category</Text>
              <ProductCategoryPicker selected={category} onSelect={setCategory} />
            </View>

            <View className="gap-3">
              <View className="flex-row items-center">
                <AppIcon icon={ShoppingBasketAdd01Icon} size={16} color={`${colors.ink}80`} />
                <View className="ml-2 flex-row items-center">
                  <Text className="text-lg font-medium tracking-tight text-ink/70">Sizes & price</Text>
                  <Text className="ml-0.5 text-base font-bold text-red-500">*</Text>
                </View>
              </View>

              {variants.map((variant) => (
                <ProductVariantCard
                  key={variant.id}
                  variant={variant}
                  canRemove
                  onToggleStock={() => {}}
                  onChangePrice={(text) => setVariantPrice(variant.id, text)}
                  onChangeQuantity={() => {}}
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

            {formError && <Text className="text-[13px] font-medium text-danger">{formError}</Text>}
          </ScrollView>

          <View className="px-5 pb-9 pt-3">
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              className="items-center justify-center rounded-full bg-black py-4 shadow-lg shadow-black/30"
              style={({ pressed }) => ({ opacity: !canSubmit ? 0.4 : pressed ? 0.85 : 1 })}
            >
              <Text className="text-lg font-medium tracking-tight text-white">
                {submitting ? 'Submitting…' : 'Submit for approval'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}

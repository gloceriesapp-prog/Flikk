import { BackIcon } from '../../components/PartnerIcons';
import { parseMoneyInput, validVariantPrices } from '../../utils/moneyInput';
import { AppImage as Image } from '../../components/AppImage';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { AppIcon } from '../../components/AppIcon';
import { DismissKeyboardView } from '../../components/DismissKeyboardView';
import { colors } from '../../theme/tokens';
import { compressImageToTarget } from '../../media/compressImage';
import {
  getCatalogueCategories,
  searchCatalogueSuggestions,
  uploadProductPhoto,
  type CatalogueCategory,
  type CatalogueSuggestion,
} from '../../api/catalog';
import { ApiError } from '../../api/client';
import { getSessionEpoch, isCurrentSession } from '../../store/sessionScope';
import { useCatalogStore } from '../../store/useCatalogStore';
import {
  hasUncountedVariant,
  standardSizeOptions,
  withStockCount,
  withStockToggle,
  type ProductVariant,
} from './data';
import { suggestedMrp } from './pricing';
import { AddSizeButton } from '../product-detail/components/AddSizeButton';
import { ProductVariantCard } from '../product-detail/components/ProductVariantCard';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'AddProduct'>;

const MAX_PHOTOS = 5;
type Photo = Pick<ImagePicker.ImagePickerAsset, 'uri' | 'width'>;

function CatalogueChoice({ label, options, selected, open, onToggle, onSelect }: {
  label: string;
  options: { id: string; name: string }[];
  selected: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-base font-medium text-ink">{label}</Text>
      <Pressable
        onPress={onToggle}
        disabled={!options.length}
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled: !options.length }}
        className="rounded-2xl border border-black/10 px-4 py-3"
      >
        <Text className="text-base text-ink">{options.find((option) => option.id === selected)?.name ?? `Select ${label.toLowerCase()}`}</Text>
      </Pressable>
      {open && options.map((option) => (
        <Pressable key={option.id} onPress={() => onSelect(option.id)} accessibilityRole="button"
          accessibilityState={{ selected: option.id === selected }} className="rounded-xl bg-gray-100 px-4 py-3">
          <Text className="text-sm text-ink">{option.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function AddProductScreen({ navigation }: Props) {
  const addProduct = useCatalogStore((state) => state.addProduct);

  const [name, setName] = useState('');
  const [categories, setCategories] = useState<CatalogueCategory[] | null>(null);
  const [categoryError, setCategoryError] = useState(false);
  const [categoryAttempt, setCategoryAttempt] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [openPicker, setOpenPicker] = useState<'category' | 'subcategory' | null>(null);
  const [catalogueItemId, setCatalogueItemId] = useState<string>();
  const [suggestions, setSuggestions] = useState<CatalogueSuggestion[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const uploadedPhotos = useRef(new Map<string, string>());
  const captureInProgress = useRef(false);
  const submitInProgress = useRef(false);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [sizePickerOpen, setSizePickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedCategory = categories?.find((item) => item.id === categoryId);
  const category = selectedCategory?.name ?? '';
  const addedLabels = new Set(variants.map((v) => v.label));
  const availableSizes = standardSizeOptions(category, variants).filter((label) => !addedLabels.has(label));
  const canSubmit = !!(name.trim() && subCategoryId && variants.length && photos.length && !submitting && !takingPhoto);

  useEffect(() => {
    const controller = new AbortController();
    getCatalogueCategories(controller.signal)
      .then((items) => { if (!controller.signal.aborted) setCategories(items); })
      .catch(() => { if (!controller.signal.aborted) setCategoryError(true); });
    return () => controller.abort();
  }, [categoryAttempt]);

  useEffect(() => {
    const query = name.trim();
    if (catalogueItemId || query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchCatalogueSuggestions(query, controller.signal)
        .then((items) => { if (!controller.signal.aborted) setSuggestions(items); })
        .catch(() => { /* A manually entered name is still valid. */ });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [name, catalogueItemId]);

  function selectSuggestion(item: CatalogueSuggestion) {
    setName(item.name);
    setCategoryId(item.categoryId);
    setSubCategoryId(item.subCategoryId);
    setCatalogueItemId(item.id);
    setSuggestions([]);
    setOpenPicker(null);
  }

  async function handleTakePhoto() {
    if (captureInProgress.current || submitInProgress.current || photos.length >= MAX_PHOTOS) return;
    const epoch = getSessionEpoch();
    captureInProgress.current = true;
    setTakingPhoto(true);
    setPhotoError(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setPhotoError('Allow camera access in Settings to take product photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
      if (result.canceled || !isCurrentSession(epoch)) return;
      const asset = result.assets[0];
      if (!asset?.uri) return;
      setPhotos((previous) => [...previous, { uri: asset.uri, width: asset.width }]);
    } catch (err) {
      setPhotoError(err instanceof ApiError ? err.message : 'Could not take the photo. Please try again.');
    } finally {
      captureInProgress.current = false;
      setTakingPhoto(false);
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
    const price = rawPrice === '' || rawPrice === '.' ? 0 : parseMoneyInput(rawPrice);
    if (price === null) return;
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id !== variantId) return v;
        // Auto-fills a suggested MRP the moment a price is typed, only
        // while this variant's own MRP is still untouched — never
        // overwrites a real value the shop owner already entered.
        const originalPrice = v.originalPrice === undefined ? suggestedMrp(category, price) : v.originalPrice;
        return { ...v, price, originalPrice };
      }),
    );
  }

  function setVariantMrp(variantId: string, rawMrp: string) {
    const originalPrice = rawMrp === '' || rawMrp === '.' ? undefined : parseMoneyInput(rawMrp);
    if (originalPrice === null) return;
    setVariants((prev) => prev.map((v) => (v.id === variantId ? { ...v, originalPrice } : v)));
  }

  function setVariantStock(variantId: string, isInStock: boolean) {
    Haptics.selectionAsync();
    setVariants((prev) => prev.map((v) => (v.id === variantId ? withStockToggle(v, isInStock) : v)));
  }

  function setVariantQuantity(variantId: string, rawQty: string) {
    setVariants((prev) => prev.map((v) => (v.id === variantId ? withStockCount(v, rawQty) : v)));
  }

  async function handleSubmit() {
    if (!canSubmit || submitInProgress.current || captureInProgress.current) return;
    if (!validVariantPrices(variants)) { setFormError("Enter a positive price for every size. MRP must be at least the selling price."); return; }
    // Checkout only sells counted packs — without a count this product
    // could be approved yet never orderable.
    if (hasUncountedVariant(variants)) {
      setFormError('Enter how many packs you have for every size (0 if none).');
      return;
    }
    setFormError(null);
    const epoch = getSessionEpoch();
    submitInProgress.current = true;
    setSubmitting(true);
    try {
      const photoAssetIds: string[] = [];
      // Only upload photos kept in the submission. A retry reuses any images
      // already uploaded successfully, in the same order.
      for (const photo of photos) {
        let assetId = uploadedPhotos.current.get(photo.uri);
        if (!assetId) {
          const compressed = await compressImageToTarget(photo.uri, photo.width);
          if (!isCurrentSession(epoch)) return;
          ({ assetId } = await uploadProductPhoto(compressed.base64, 'image/jpeg'));
          uploadedPhotos.current.set(photo.uri, assetId);
        }
        if (!isCurrentSession(epoch)) return;
        photoAssetIds.push(assetId);
      }
      const added = await addProduct({ name, subCategoryId, catalogueItemId, photoAssetIds, variants });
      if (!added) {
        setFormError(`${name.trim()} is already listed in your store.`);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('Catalog');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not add product. Please try again.');
    } finally {
      submitInProgress.current = false;
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
              <BackIcon size={18} color={colors.ink} />
            </Pressable>
            <Text className="absolute left-0 right-0 text-center text-xl font-medium tracking-tight text-ink">
              Add product
            </Text>
          </View>

          <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-6" keyboardShouldPersistTaps="handled">
            <View className="gap-2">
              <Text className="text-base font-medium text-ink">Product name</Text>
              <TextInput
                value={name}
                onChangeText={(text) => { setName(text); setCatalogueItemId(undefined); setSuggestions([]); }}
                maxLength={200}
                placeholder="Type a name to see suggestions"
                placeholderTextColor={`${colors.ink}50`}
                className="rounded-2xl border border-black/10 px-4 py-3 text-base text-ink"
              />
              {suggestions.map((item) => {
                const match = categories?.find((entry) => entry.id === item.categoryId);
                const sub = match?.subCategories.find((entry) => entry.id === item.subCategoryId);
                if (!match || !sub) return null;
                return (
                  <Pressable key={item.id} onPress={() => selectSuggestion(item)} accessibilityRole="button"
                    className="rounded-xl bg-gray-100 px-4 py-2.5">
                    <Text className="text-base font-medium text-ink">{item.name}</Text>
                    <Text className="text-xs text-ink/70">{match.name} · {sub.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            {categoryError ? (
              <Pressable accessibilityRole="button" onPress={() => {
                setCategoryError(false);
                setCategoryAttempt((attempt) => attempt + 1);
              }}>
                <Text className="text-danger">Could not load categories. Tap to retry.</Text>
              </Pressable>
            ) : categories === null ? (
              <ActivityIndicator accessibilityLabel="Loading categories" color={colors.ink} />
            ) : categories.length === 0 ? (
              <Text className="text-sm text-danger">No categories are available. Contact support.</Text>
            ) : (
              <>
                <CatalogueChoice label="Category" options={categories} selected={categoryId} open={openPicker === 'category'}
                  onToggle={() => setOpenPicker(openPicker === 'category' ? null : 'category')}
                  onSelect={(id) => {
                    if (id !== categoryId) {
                      setCategoryId(id);
                      setSubCategoryId('');
                      setCatalogueItemId(undefined);
                    }
                    setOpenPicker(null);
                  }} />
                <CatalogueChoice label="Subcategory" options={selectedCategory?.subCategories ?? []}
                  selected={subCategoryId} open={openPicker === 'subcategory'}
                  onToggle={() => setOpenPicker(openPicker === 'subcategory' ? null : 'subcategory')}
                  onSelect={(id) => {
                    if (id !== subCategoryId) {
                      setSubCategoryId(id);
                      setCatalogueItemId(undefined);
                    }
                    setOpenPicker(null);
                  }} />
              </>
            )}

            <View className="gap-3">
              <View className="flex-row items-center">
                <AppIcon icon={ShoppingBasketAdd01Icon} size={16} color={`${colors.ink}80`} />
                <View className="ml-2 flex-row items-center">
                  <Text className="text-lg font-medium tracking-tight text-ink/70">Sizes</Text>
                  <Text className="ml-0.5 text-base font-bold text-red-500">*</Text>
                </View>
              </View>

              {variants.map((variant) => (
                <ProductVariantCard
                  key={variant.id}
                  variant={variant}
                  canRemove
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

            <View className="gap-2">
              <Text className="text-base font-medium text-ink">Product photos ({photos.length}/{MAX_PHOTOS})</Text>
              <Text className="text-sm text-ink/70">Take at least one photo. The first photo is the cover.</Text>
              <View className="flex-row flex-wrap gap-2.5">
                {photos.map((photo, index) => (
                  <View key={photo.uri} className="items-center gap-1">
                    <Image source={{ uri: photo.uri }} className="h-16 w-16 rounded-xl bg-gray-100" resizeMode="contain" cachePolicy="memory" />
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove photo ${index + 1}`}
                      disabled={submitting || takingPhoto}
                      onPress={() => setPhotos((previous) => previous.filter((item) => item.uri !== photo.uri))}>
                      <Text className="text-xs text-danger">Remove</Text>
                    </Pressable>
                  </View>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <Pressable onPress={handleTakePhoto} disabled={takingPhoto || submitting}
                    accessibilityRole="button" accessibilityLabel="Take product photo"
                    className="h-16 w-16 items-center justify-center rounded-xl bg-gray-100">
                    {takingPhoto
                      ? <ActivityIndicator color={colors.ink} />
                      : <AppIcon icon={Camera01Icon} size={22} color={colors.ink} />}
                  </Pressable>
                )}
              </View>
              {photoError && <Text className="text-[13px] font-medium text-danger">{photoError}</Text>}
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

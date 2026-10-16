import { BackIcon, CheckmarkIcon } from '../../components/PartnerIcons';
import { AppImage as Image } from '../../components/AppImage';
import { normalizeStoreHour } from '../../utils/storeHours';
import { validateStoreSettings } from '../../utils/storeSettingsValidation';
// Store settings (P6) — reached from the header's profile icon.
// Full-screen, not a sheet — same reasoning as ProductDetailScreen's own
// note: a multi-section editable form belongs on a real screen, not
// squeezed into a modal. This is the one place a shop owner has complete
// access to how their store presents itself: name, category, photo,
// hours, prep time, plus the account/support rows every settings screen
// carries.
//
// Reads/writes useStoreProfileStore, not local state — StoreProfileHeader
// (Orders tab) needs to see the same edits immediately, same reasoning as
// useOrdersStore/useCatalogStore. Draft state here is local until "Save
// changes" commits it, same pattern as ProductDetailScreen: backing out
// (the back arrow) never half-applies an edit.
//
// No `PATCH` on the store record exists yet (specs/02-partner-app/api.md's
// own note on P6) — Save only ever writes to the local store, standing in
// for that call.

import { useEffect, useState } from 'react';
import { Call02Icon, Clock01Icon, Delete02Icon, Edit02Icon, File01Icon, InformationCircleIcon, Logout01Icon, SquareLock01Icon, Store01Icon, TagsIcon } from '@hugeicons/core-free-icons';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { useChangeStoreLocation } from '../../hooks/useChangeStoreLocation';
import { BrandFooter } from '../../components/BrandFooter';
import { colors } from '../../theme/tokens';
import { getAvatarImageUri } from '../../theme/placeholderImage';
import { storePinPresentation } from '../../location/storePin';
import { uploadStorePhoto } from '../../api/auth';
import { API_BASE_URL } from '../../api/baseUrl';
import { compressImageToTarget } from '../../media/compressImage';
import { useAuthStore } from '../../store/useAuthStore';
import { useStoreProfileStore } from '../../store/useStoreProfileStore';
import { formatPhone } from '../../utils/formatPhone';
import { isValidFssaiFormat, isValidPanFormat } from '../../utils/documentValidation';
import type { AppStackParamList } from '../../navigation/types';
import { PayoutAccountCard } from './components/PayoutAccountCard';
import { PrepTimeStepper } from './components/PrepTimeStepper';
import { SettingsCard } from './components/SettingsCard';
import { SettingsLinkRow } from './components/SettingsLinkRow';
import { categoryNeedsDrugLicense, StoreCategoryPicker, useStoreCategories } from './components/StoreCategoryPicker';
import { TimeDigitsInput } from './components/TimeDigitsInput';

type Props = NativeStackScreenProps<AppStackParamList, 'StoreSettings'>;

const CHANGE_LABELS: Record<string, string> = {
  name: 'store name',
  category: 'category',
  district: 'area',
  address_line: 'address',
  manual_address: 'address description',
  lat: 'map pin',
  lng: 'map pin',
  drug_license_number: 'drug licence',
  pan_number: 'PAN',
  gst_number: 'GST',
  fssai_number: 'FSSAI',
  shop_establishment_number: 'Shop & Establishment',
};

function describeChange(changes: Record<string, unknown>): string {
  return [...new Set(Object.keys(changes).map((key) => CHANGE_LABELS[key] ?? key))].join(', ');
}

// Same flat gray Payouts/Orders/Catalog already use (PayoutsScreen.tsx's
// own PAGE_BG, itself matching apps/customer's checkout flow,
// CheckoutScreen.tsx's `#F1F2F4`) — cards stay solid white on top of it,
// per an explicit ask to match it here too.
const PAGE_BG = '#F1F2F4';

// The three "My documents" photos below come from the authenticated
// decrypt-proxy (GET /partner/documents/:id) — the bytes are decrypted
// server-side per request, so every fetch must carry the owner's bearer
// token. A relative "/partner/documents/:id" is resolved against the API
// base; an absolute URL is used as-is. Mirrors the rider pattern
// (RiderDocumentsScreen's own authSource).
function authSource(uri: string, token: string | null) {
  return {
    uri: uri.startsWith('/') ? `${API_BASE_URL}${uri}` : uri,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}

export function StoreSettingsScreen({ navigation }: Props) {
  const profile = useStoreProfileStore((state) => state.profile);
  const updateProfile = useStoreProfileStore((state) => state.updateProfile);
  const clearSession = useAuthStore((state) => state.clear);
  // Read the token reactively so a silent refresh (api/client.ts) re-renders
  // the private doc images with the new bearer instead of leaving a stale 401.
  const accessToken = useAuthStore((state) => state.accessToken);
  // Which private doc (raw url) is open in the full-screen viewer, or null.
  const [enlargedDoc, setEnlargedDoc] = useState<string | null>(null);

  // Reviewed fields start from the pending request (if any), so saving again
  // keeps it instead of reverting it to the live values.
  const location = storePinPresentation(profile);
  const pendingValues = profile.pendingChange?.changes ?? {};
  const pendingText = (key: string, live: string) => (typeof pendingValues[key] === 'string' ? (pendingValues[key] as string) : key in pendingValues ? '' : live);
  const [name, setName] = useState(pendingText('name', profile.storeName));
  const [category, setCategory] = useState(pendingText('category', profile.category));
  const [openTime, setOpenTime] = useState(profile.openTime);
  const [closeTime, setCloseTime] = useState(profile.closeTime);
  const [avgPrepMinutes, setAvgPrepMinutes] = useState(profile.avgPrepMinutes);
  const [manualAddress, setManualAddress] = useState(pendingText('manual_address', profile.manualAddress));
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [gstNumber, setGstNumber] = useState(profile.gstNumber);
  const [shopLicenseNumber, setShopLicenseNumber] = useState(profile.shopLicenseNumber);
  const [fssaiLicenseNumber, setFssaiLicenseNumber] = useState(profile.fssaiNumber);
  const [panNumber, setPanNumber] = useState(profile.panNumber);
  const [drugLicenseNumber, setDrugLicenseNumber] = useState(pendingText('drug_license_number', profile.drugLicenseNumber));
  const categories = useStoreCategories();
  const needsDrugLicense = categoryNeedsDrugLicense(categories, category);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  // These fields' useState above only captures `profile` at the FIRST
  // render — if this screen is reached before OrdersScreen's own
  // loadProfile() call has resolved (a real possibility, they're
  // independent async calls), every field here would otherwise stay
  // blank/stale forever even once the real profile does load, since
  // useState's initializer never re-runs on its own. This effect is what
  // actually keeps them in sync the moment real data arrives — the same
  // class of bug that broke the Orders header (see useStoreProfileStore's
  // own note on loadProfile), fixed here too rather than left as the same
  // debt.
  useEffect(() => {
    if (!profile.id) return;
    // Syncing local form state from the external store once it loads (see
    // the note above) — the case this rule's own docs allow.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(pendingText('name', profile.storeName));
    setCategory(pendingText('category', profile.category));
    setOpenTime(profile.openTime);
    setCloseTime(profile.closeTime);
    setAvgPrepMinutes(profile.avgPrepMinutes);
    setManualAddress(pendingText('manual_address', profile.manualAddress));
    setOwnerName(profile.ownerName);
    setGstNumber(profile.gstNumber);
    setShopLicenseNumber(profile.shopLicenseNumber);
    setFssaiLicenseNumber(profile.fssaiNumber);
    setPanNumber(profile.panNumber);
    setDrugLicenseNumber(pendingText('drug_license_number', profile.drugLicenseNumber));
    // Only re-syncs when the loaded store's identity changes (a real new
    // load), not on every keystroke into these same fields — profile.id
    // is stable across an in-progress edit, so this won't fight typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  // Real photo upload, same flow as onboarding's own StoreDetailsScreen
  // (compress -> POST /partner/store-photo -> hosted URL) — uploads and
  // saves immediately on pick rather than waiting for "Save changes", so a
  // shop owner backing out with the arrow still keeps the new photo (same
  // "photo is live the moment it's hosted" reasoning as that screen).
  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    // No base64 at pick time (#23) — resize/re-encode first, base64 only from
    // the small output. Keeps compressImageToTarget's single signature.
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset.uri) return;

    setUploadingPhoto(true);
    try {
      const compressed = await compressImageToTarget(asset.uri, asset.width);
      const { url } = await uploadStorePhoto(compressed.base64, 'image/jpeg', compressed.uri);
      const saved = await updateProfile({ photoUrl: url });
      if (!saved.ok) throw new Error(saved.error);
      Alert.alert('Store photo updated', 'Your new photo has been saved.');
    } catch (err) {
      Alert.alert('Could not save store photo', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  const fssaiValid = fssaiLicenseNumber.trim().length === 0 || isValidFssaiFormat(fssaiLicenseNumber);
  const panValid = isValidPanFormat(panNumber);

  // Write-once from this screen — once a document field holds a real
  // value (set here or copied in from onboarding at approval), it renders
  // read-only below and the server rejects a differing PATCH anyway
  // (routes/partner.ts's own DOCUMENT_LOCKED guard). An empty field stays
  // editable so an owner who skipped one can still add it once.
  const gstLocked = profile.gstNumber.trim().length > 0;
  const shopLicenseLocked = profile.shopLicenseNumber.trim().length > 0;
  const fssaiLocked = profile.fssaiNumber.trim().length > 0;
  const panLocked = profile.panNumber.trim().length > 0;

  async function handleSave() {
    const hoursChanged = openTime !== profile.openTime || closeTime !== profile.closeTime;
    const normalizedOpen = normalizeStoreHour(openTime);
    const normalizedClose = normalizeStoreHour(closeTime);
    if (saving) return;
    const validationError = validateStoreSettings({
      name, category, openTime, closeTime, avgPrepMinutes, manualAddress, ownerName,
      panNumber, fssaiLicenseNumber, drugLicenseNumber, needsDrugLicense,
      hasLocation: !!location.coordinates && !!location.district.trim(),
    });
    if (validationError) {
      Alert.alert('Check required details', validationError);
      return;
    }

    setSaving(true);
    const result = await updateProfile({
      storeName: name.trim(),
      category,
      ...(hoursChanged && normalizedOpen !== null && normalizedClose !== null ? { openTime: normalizedOpen, closeTime: normalizedClose } : {}),
      avgPrepMinutes,
      manualAddress: manualAddress.trim(),
      ownerName: ownerName.trim(),
      gstNumber: gstNumber.trim(),
      shopLicenseNumber: shopLicenseNumber.trim(),
      fssaiNumber: fssaiLicenseNumber.trim(),
      panNumber: panNumber.trim().toUpperCase(),
      ...(needsDrugLicense ? { drugLicenseNumber: drugLicenseNumber.trim() } : {}),
    });
    setSaving(false);

    if (!result.ok) {
      Alert.alert('Could not save', result.error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (result.pendingReview) {
      Alert.alert(
        'Sent for review',
        'Store details go live after approval. Other changes are saved.',
      );
    }
    // Explicit navigate, not goBack() — this screen is only ever reached
    // from the Orders tab (OrdersScreen's own gear icon / ProfileSetupBanner),
    // so this always lands there regardless of what's actually on the
    // native stack under it.
    navigation.navigate('Orders');
  }

  // Shared with StoreProfileHeader's own tappable address row
  // (useChangeStoreLocation.ts) — same real map pin, same instant-apply
  // onConfirm, one real implementation instead of two copies.
  const changeStoreLocation = useChangeStoreLocation();

  if (profile.accessRole === 'manager') return (
    <View className="flex-1 bg-white px-6 pb-safe pt-safe">
      <Text className="mt-6 text-xl font-semibold text-ink">Store settings</Text>
      <Text className="mt-3 text-base text-ink/70">Manage orders, products and reviews. Store and payout details are owner-only.</Text>
      <Pressable onPress={() => navigation.navigate('Reviews')} className="mt-6 rounded-xl bg-ink px-4 py-3">
        <Text className="text-center font-semibold text-white">Customer reviews</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Orders')} className="mt-6 rounded-xl bg-ink px-4 py-3">
        <Text className="text-center font-semibold text-white">Back</Text>
      </Pressable>
      <View className="mt-6"><SettingsLinkRow icon={Delete02Icon} label="Delete account" destructive onPress={() => navigation.navigate('DeleteAccount')} /></View>
    </View>
  );

  return (
    // Keyboard was covering the "Save changes" bar below (name TextInput
    // in the scrollable content, no keyboard-avoidance at all) — same
    // fix/reasoning as LoginScreen.tsx's own note. Dismissing the keyboard
    // is handled by the ScrollView's own keyboardDismissMode="on-drag"
    // below now, not a TouchableWithoutFeedback wrapping the whole screen
    // — that wrapper was what made scrolling feel stuck/janky (a known RN
    // gotcha: a Touchable ancestor competes with a nested ScrollView for
    // the touch responder on every scroll gesture, not just genuine taps).
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: PAGE_BG }} edges={['top']}>
        {/* Checkmark on the right is the real Save now — replaces the
            fixed bottom "Save changes" bar entirely (per an explicit ask),
            same handleSave call, just triggered from the header instead of
            a bar that sat below the scroll content. */}
        <View className="relative flex-row items-center justify-between px-5 py-3">
          <Pressable
            onPress={() => navigation.navigate('Orders')}
            className="h-10 w-10 items-center justify-center rounded-full bg-white"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <BackIcon size={22} color={colors.ink} />
          </Pressable>
          <Text className="absolute left-0 right-0 text-center text-[17px] font-semibold text-ink">Store settings</Text>
          <Pressable
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Save store settings"
            accessibilityState={{ disabled: saving, busy: saving }}
            disabled={saving}
            className="h-10 w-10 items-center justify-center rounded-full bg-white active:opacity-60"
            hitSlop={8}
          >
            {saving ? <ActivityIndicator size="small" color={colors.ink} /> : <CheckmarkIcon size={24} />}
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-5 pb-6"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Photo + name sit outside a SettingsCard, up top — this is the
            identity a customer sees on the storefront listing, worth
            more visual weight than a form row buried in a card. One
            horizontal white pill (avatar left, name inline beside it),
            not a stacked centered avatar-over-name layout — per an
            explicit reference sketch. */}
          <View className="flex-row items-center gap-4 rounded-[16px] bg-white p-3">
            {/* Avatar Container */}
            <Pressable
              onPress={handlePickPhoto}
              disabled={uploadingPhoto}
              className="relative h-16 w-16"
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              {/* Full Round Image View */}
              <View className="h-full w-full overflow-hidden rounded-full bg-slate-100">
                <Image
                  source={{ uri: profile.photoUrl ?? getAvatarImageUri(profile.id || 'partner-store') }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              </View>

              {/* Bottom-Right Floating Camera/Plus Badge */}
              <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full  bg-white">
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color={colors.ink} />
                ) : (
                  <AppIcon icon={Edit02Icon} size={13} color={colors.ink} />
                )}
              </View>
            </Pressable>

            <View className="min-w-0 flex-1 gap-1">
              <TextInput
                accessibilityLabel="Store name, required"
                value={name}
                onChangeText={setName}
                className="text-[17px] font-semibold text-ink"
                placeholder="Store name"
                placeholderTextColor="#9AA5A3"
              />
            </View>
          </View>
          <Text className="text-[12px] font-medium text-ink/60">* Required. Fields marked optional can be left blank.</Text>

          {profile.pendingChange ? (
            <View className="rounded-[16px] bg-amber-50 px-4 py-3">
              <Text className="text-[13px] font-semibold text-amber-800">Pending review</Text>
              <Text className="mt-0.5 text-[12.5px] font-medium leading-[17px] text-amber-900/70">
                {describeChange(profile.pendingChange.changes)} awaiting approval. Current details stay live.
              </Text>
            </View>
          ) : profile.lastChangeReview?.status === 'rejected' ? (
            <View className="rounded-[16px] bg-red-50 px-4 py-3">
              <Text className="text-[13px] font-semibold text-red-700">Last change not approved</Text>
              <Text className="mt-0.5 text-[12.5px] font-medium leading-[17px] text-red-900/70">
                {profile.lastChangeReview.reviewReason ?? 'Gloceries did not approve your last store change.'}
              </Text>
            </View>
          ) : null}

          <SettingsCard icon={TagsIcon} title="Category *">
            <StoreCategoryPicker selected={category} onSelect={setCategory} />
            {needsDrugLicense && (
              <View className="gap-1.5">
              <Text className="text-[13px] font-medium text-ink/40">Drug licence number *</Text>
              <TextInput
                value={drugLicenseNumber}
                onChangeText={setDrugLicenseNumber}
                placeholder="Drug licence number"
                placeholderTextColor="#9AA5A3"
                autoCapitalize="characters"
                maxLength={100}
                className="rounded-2xl border border-gray-200 bg-[#F1F2F4] px-4 py-3.5 text-[15px] font-medium text-ink"
              />
              </View>
            )}
          </SettingsCard>

          <SettingsCard icon={Clock01Icon} title="Store hours">
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1.5">
                <Text className="text-[13px] font-medium text-ink/40">Opens *</Text>
                <TimeDigitsInput value={openTime} onChangeText={setOpenTime} suffix="AM" />
              </View>
              <View className="flex-1 gap-1.5">
                <Text className="text-[13px] font-medium text-ink/40">Closes *</Text>
                <TimeDigitsInput value={closeTime} onChangeText={setCloseTime} suffix="PM" />
              </View>
            </View>

            <PrepTimeStepper minutes={avgPrepMinutes} onChange={setAvgPrepMinutes} />

            {/* The live Open/Closed switch itself lives on the Orders header
              — this card is the schedule a shop owner sets once, that's
              the moment-to-moment toggle for "right now." Said explicitly
              so the two don't read as duplicates of each other. */}
            <Text className="text-[13px] font-medium leading-[17px] text-ink/50">
              Hours use IST. Manual changes last until the next opening or closing.
            </Text>
          </SettingsCard>

          <SettingsCard icon={Store01Icon} title="Location">
            <View className="flex-row items-center justify-between">
              <Text className="text-[14px] font-medium text-ink/70">City *</Text>
              <Text className="text-[14px] font-semibold text-ink">{profile.district}</Text>
            </View>

            {/* Real live address — stores.address_line, the actual
                reverse-geocoded text from the map pin (LocationPinScreen),
                never a fake placeholder. Falls back to district for any
                store approved before this field existed. "Change on map"
                is the one way to update the real pin after approval —
                is saved separately and remains pending until admin approval. */}
            <View className="gap-1.5">
              <Text className="text-[13px] font-medium text-ink/40">Store pin on map *</Text>
              <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-black/10 bg-[#F1F2F4] px-4 py-3">
                <Text className="flex-1 text-[13px] font-medium text-ink" numberOfLines={2}>
                  {profile.addressLine || profile.district || 'Not set yet'}
                </Text>
                <Pressable onPress={changeStoreLocation} hitSlop={8}>
                  <Text className="text-[13px] font-semibold text-ink">Change</Text>
                </Pressable>
              </View>
            </View>

            {location.pending && (
              <View className="gap-1 rounded-2xl bg-blue-50 p-3">
                <Text className="text-sm font-semibold text-primary">Proposed location · Pending review</Text>
                <Text className="text-sm text-ink">{location.address || location.district || 'New map pin saved'}</Text>
                <Text className="text-xs text-ink/60">Your approved pickup location stays live.</Text>
              </View>
            )}

            {/* A genuinely separate field — the owner's own typed
                description (e.g. "Near Bus Stand, opposite Xyz store"),
                never derived from the map pin above. Saved through the
                normal Save button, same as every other text field on this
                screen. */}
            <View className="gap-1.5">
              <Text className="text-[13px] font-medium text-ink/40">Full shop address *</Text>
              <TextInput
                value={manualAddress}
                onChangeText={setManualAddress}
                placeholder="e.g. Near Bus Stand, opposite Xyz store"
                placeholderTextColor="#9AA5A3"
                multiline
                className="rounded-2xl border border-black/10 bg-[#F1F2F4] px-4 py-3 text-[14px] font-medium text-ink"
              />
            </View>
          </SettingsCard>

          <SettingsCard icon={Call02Icon} title="Account">
            <View className="gap-1.5">
              <Text className="text-[13px] font-medium text-ink/40">Owner name *</Text>
              <TextInput
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="Your full name"
                placeholderTextColor="#9AA5A3"
                className="rounded-2xl border border-black/10 bg-[#F1F2F4] px-4 py-3 text-[14px] font-medium text-ink"
              />
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] font-medium text-ink/70">Phone number *</Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-[13px] font-semibold text-ink">{profile.phone ? formatPhone(profile.phone) : '—'}</Text>
                {profile.phone.length > 0 && (
                  <View className="flex-row items-center gap-1 rounded-full bg-success/10 px-2 py-0.5">
                    <Text className="text-[12px] font-semibold text-success">Verified</Text>
                  </View>
                )}
              </View>
            </View>
            <Text className="text-[12.5px] font-medium leading-[17px] text-ink/50">
              Phone verified by OTP.
            </Text>
          </SettingsCard>

          {/* Business documents — real stores.gst_number/shop_establishment_number,
            same optional-at-signup fields onboarding's own Step 2 collects
            (StoreDetailsScreen). An owner who skipped them there can add
            them here later without redoing the wizard. */}
          <SettingsCard icon={File01Icon} title="Business documents">
            {/* PAN — the one compulsory document now (onboarding's own
                StoreDetailsScreen requires it for every new store). Write-once:
                once real, shown read-only below, same as the phone number row
                above. */}
            <DocumentField
              label="PAN number *"
              locked={panLocked}
              value={panNumber}
              onChangeText={setPanNumber}
              placeholder="e.g. ABCDE1234F"
              autoCapitalize="characters"
              maxLength={10}
              errorText={panNumber.length > 0 && !panValid ? 'Format should be ABCDE1234F.' : null}
            />

            {/* FSSAI — optional (doesn't apply to every store category, e.g.
                Hardware/Paint Shop/Steel & Vessels aren't food businesses). */}
            <DocumentField
              label="FSSAI license number (optional)"
              locked={fssaiLocked}
              value={fssaiLicenseNumber}
              onChangeText={setFssaiLicenseNumber}
              placeholder="14-digit license or registration no."
              keyboardType="number-pad"
              maxLength={14}
              errorText={fssaiLicenseNumber.length > 0 && !fssaiValid ? 'Must be exactly 14 digits.' : null}
            />

            <DocumentField
              label="GST number (optional)"
              locked={gstLocked}
              value={gstNumber}
              onChangeText={setGstNumber}
              placeholder="e.g. 29ABCDE1234F1Z5"
              autoCapitalize="characters"
              maxLength={15}
            />

            <DocumentField
              label="Shop & Establishment license (optional)"
              locked={shopLicenseLocked}
              value={shopLicenseNumber}
              onChangeText={setShopLicenseNumber}
              placeholder="License number"
              autoCapitalize="characters"
            />

            {/* Honest, not "verified" — real format checks only (14-digit FSSAI,
      ABCDE1234F PAN), never a government-database lookup — see
      utils/documentValidation.ts's own note. */}
            <View className="flex-row items-start gap-2 rounded-2xl bg-[#F9FAFB] px-3.5 py-3">
              <Text className="flex-1 text-[12.5px] font-medium leading-[17px]">
                <Text className="font-semibold text-red-500">Note: </Text>
                <Text className="text-black/60">
                  Numbers are format-checked. Replacements need approval.
                </Text>
              </Text>
            </View>

            {/* My documents — the owner's three private, encrypted KYC photos,
                fetched through the authenticated decrypt-proxy (bearer token
                attached per request via authSource). Only this owner can see
                them; the proxy enforces ownership server-side. Separate from
                the PUBLIC storefront photo up top (profile.photoUrl). */}
            <View className="gap-3 border-t border-black/5 pt-4">
              <View className="flex-row items-center gap-1.5">
                <AppIcon icon={SquareLock01Icon} size={14} color={colors.primary} />
                <Text className="text-[13px] font-semibold text-ink">My documents</Text>
              </View>
              <Text className="text-[12px] font-medium leading-[16px] text-ink/45">
                Private documents for your account.
              </Text>
              <View className="flex-row gap-3">
                <PrivateDoc label="Store photo" uri={profile.storePhotoUrl} token={accessToken} onEnlarge={setEnlargedDoc} />
                <PrivateDoc label="Owner photo" uri={profile.profilePhotoUrl} token={accessToken} onEnlarge={setEnlargedDoc} />
                <PrivateDoc label="Aadhaar" uri={profile.aadhaarPhotoUrl} token={accessToken} onEnlarge={setEnlargedDoc} />
              </View>
            </View>
          </SettingsCard>

          {/* Payout details — UPI or bank account, saved through its own
            PUT /partner/payout-account (PayoutAccountCard), not this
            screen's generic Save button. */}
          <PayoutAccountCard />

          <View className="gap-4 rounded-[16px] bg-white p-4">
            <SettingsLinkRow icon={InformationCircleIcon} label="Customer reviews" onPress={() => navigation.navigate('Reviews')} />
            <SettingsLinkRow icon={InformationCircleIcon} label="Store team" onPress={() => navigation.navigate('Staff')} />
            <SettingsLinkRow icon={File01Icon} label="Replace legal document" onPress={() => navigation.navigate('DocumentReplacement')} />
            <SettingsLinkRow icon={InformationCircleIcon} label="Help & support" onPress={() => navigation.navigate('Support')} />
            {/* No confirmation dialog — RootNavigator swaps to the auth
              stack the instant accessToken clears, same "store update
              drives navigation" pattern the rest of this auth flow uses.
              Logging out isn't destructive to any data, just the local
              session, so a confirm step would be friction without a real
              risk behind it. */}
            <SettingsLinkRow icon={Logout01Icon} label="Log out" destructive onPress={() => void clearSession()} />
            {/* Google Play: deletion must be requestable in the app. The
              screen explains what is deleted and kept before anything is sent. */}
            <SettingsLinkRow icon={Delete02Icon} label="Delete account" destructive onPress={() => navigation.navigate('DeleteAccount')} />
          </View>

          <BrandFooter />
        </ScrollView>

        {/* Full-screen viewer for a tapped private doc — an Aadhaar scan is
            unreadable as a thumbnail, so tap-to-enlarge is the point. Uses the
            same authenticated source; tap anywhere to dismiss. */}
        <Modal visible={enlargedDoc !== null} transparent animationType="fade" onRequestClose={() => setEnlargedDoc(null)}>
          <Pressable onPress={() => setEnlargedDoc(null)} className="flex-1 items-center justify-center bg-black/90 px-5">
            {enlargedDoc !== null && (
              <Image source={authSource(enlargedDoc, accessToken)} className="h-3/4 w-full rounded-2xl" resizeMode="contain" />
            )}
            <Text className="mt-4 text-[13px] font-medium text-white/70">Tap anywhere to close</Text>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// One private KYC photo in the "My documents" row: an authenticated
// thumbnail that opens the full-screen viewer on tap, or a graceful dashed
// "Not uploaded" placeholder when the owner hasn't supplied one. The byte
// fetch carries the owner's bearer token (authSource); null uri never hits
// the network.
function PrivateDoc({
  label,
  uri,
  token,
  onEnlarge,
}: {
  label: string;
  uri: string | null;
  token: string | null;
  onEnlarge: (uri: string) => void;
}) {
  return (
    <View className="flex-1 gap-1.5">
      {uri ? (
        <Pressable onPress={() => onEnlarge(uri)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <Image source={authSource(uri, token)} className="h-24 w-full rounded-xl bg-black/5" resizeMode="cover" />
        </Pressable>
      ) : (
        <View className="h-24 w-full items-center justify-center rounded-xl border border-dashed border-black/15 bg-mist">
          <Text className="px-1 text-center text-[11px] font-medium text-ink/35">Not uploaded</Text>
        </View>
      )}
      <Text className="text-center text-[11px] font-medium text-ink/50">{label}</Text>
    </View>
  );
}

interface DocumentFieldProps {
  label: string;
  locked: boolean;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoCapitalize?: 'characters' | 'none';
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
  errorText?: string | null;
}

// One real value, two real states — editable until the owner saves a real
// value, then permanently read-only (server-enforced too, routes/
// partner.ts's DOCUMENT_LOCKED guard, not just this UI). Same shape for
// all four business-document fields, so a lock behaves identically
// whether it's PAN, FSSAI, GST, or the shop license.
function DocumentField({ label, locked, value, onChangeText, placeholder, autoCapitalize, keyboardType, maxLength, errorText }: DocumentFieldProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-[13px] font-medium text-ink/40">{label}</Text>
      {locked ? (
        <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-black/10 bg-[#F1F2F4] px-4 py-3">
          <Text className="text-[14px] font-semibold text-ink">{value}</Text>
          <AppIcon icon={SquareLock01Icon} size={15} color={`${colors.ink}60`} />
        </View>
      ) : (
        <>
          <TextInput
            accessibilityLabel={label}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9AA5A3"
            autoCapitalize={autoCapitalize}
            keyboardType={keyboardType}
            maxLength={maxLength}
            className="rounded-2xl border border-black/10 bg-[#F1F2F4] px-4 py-3 text-[14px] font-medium text-ink"
          />
          {errorText && <Text className="text-[12px] font-medium text-red-500">{errorText}</Text>}
        </>
      )}
    </View>
  );
}

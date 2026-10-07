import { AppImage as Image } from '../../components/AppImage';
// Store settings (P6) — reached from StoreProfileHeader's gear icon.
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
import {
  ArrowLeft01Icon,
  Call02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Edit02Icon,
  File01Icon,
  InformationCircleIcon,
  Logout01Icon,
  SquareLock01Icon,
  Store01Icon,
  TagsIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { useChangeStoreLocation } from '../../hooks/useChangeStoreLocation';
import { BrandFooter } from '../../components/BrandFooter';
import { colors } from '../../theme/tokens';
import { getAvatarImageUri } from '../../theme/placeholderImage';
import { uploadStorePhoto } from '../../api/auth';
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
import { StoreCategoryPicker } from './components/StoreCategoryPicker';
import { TimeDigitsInput } from './components/TimeDigitsInput';

type Props = NativeStackScreenProps<AppStackParamList, 'StoreSettings'>;

// Same flat gray Payouts/Orders/Catalog already use (PayoutsScreen.tsx's
// own PAGE_BG, itself matching apps/customer's checkout flow,
// CheckoutScreen.tsx's `#F1F2F4`) — cards stay solid white on top of it,
// per an explicit ask to match it here too.
const PAGE_BG = '#F1F2F4';

export function StoreSettingsScreen({ navigation }: Props) {
  const profile = useStoreProfileStore((state) => state.profile);
  const updateProfile = useStoreProfileStore((state) => state.updateProfile);
  const clearSession = useAuthStore((state) => state.clear);

  const [name, setName] = useState(profile.storeName);
  const [category, setCategory] = useState(profile.category);
  const [openTime, setOpenTime] = useState(profile.openTime);
  const [closeTime, setCloseTime] = useState(profile.closeTime);
  const [avgPrepMinutes, setAvgPrepMinutes] = useState(profile.avgPrepMinutes);
  const [manualAddress, setManualAddress] = useState(profile.manualAddress);
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [gstNumber, setGstNumber] = useState(profile.gstNumber);
  const [shopLicenseNumber, setShopLicenseNumber] = useState(profile.shopLicenseNumber);
  const [fssaiLicenseNumber, setFssaiLicenseNumber] = useState(profile.fssaiNumber);
  const [panNumber, setPanNumber] = useState(profile.panNumber);
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
    setName(profile.storeName);
    setCategory(profile.category);
    setOpenTime(profile.openTime);
    setCloseTime(profile.closeTime);
    setAvgPrepMinutes(profile.avgPrepMinutes);
    setManualAddress(profile.manualAddress);
    setOwnerName(profile.ownerName);
    setGstNumber(profile.gstNumber);
    setShopLicenseNumber(profile.shopLicenseNumber);
    setFssaiLicenseNumber(profile.fssaiNumber);
    setPanNumber(profile.panNumber);
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

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, base64: true });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset.base64) return;

    setUploadingPhoto(true);
    try {
      const compressed = await compressImageToTarget(asset.uri, asset.base64);
      const contentType = compressed.uri === asset.uri ? (asset.mimeType ?? 'image/jpeg') : 'image/jpeg';
      const { url } = await uploadStorePhoto(compressed.base64, contentType, compressed.uri);
      updateProfile({ photoUrl: url });
    } catch {
      // Best-effort, same tolerance as this screen's other background
      // saves — the avatar just stays whatever it was before the attempt.
    } finally {
      setUploadingPhoto(false);
    }
  }

  // PAN is the one compulsory document now — enforced at onboarding submit
  // (StoreReviewScreen's own canSubmit gate, server-side in POST
  // /store-application), not here. A store approved before this feature
  // existed can still have no PAN on file; Settings is where it fills in
  // later, at its own pace — not blocked from saving unrelated changes
  // (hours, category, photo) just because a document is still missing.
  // Both fields are still format-checked whenever non-empty, same
  // reasoning as before.
  const fssaiValid = fssaiLicenseNumber.trim().length === 0 || isValidFssaiFormat(fssaiLicenseNumber);
  const panValid = panNumber.trim().length === 0 || isValidPanFormat(panNumber);

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
    if (!fssaiValid) {
      Alert.alert('FSSAI format looks wrong', 'Should be exactly 14 digits, or leave it blank.');
      return;
    }
    if (!panValid) {
      Alert.alert('PAN format looks wrong', 'PAN should look like ABCDE1234F, or leave it blank.');
      return;
    }

    setSaving(true);
    const result = await updateProfile({
      storeName: name.trim() || profile.storeName,
      category,
      openTime,
      closeTime,
      avgPrepMinutes,
      manualAddress: manualAddress.trim(),
      ownerName: ownerName.trim(),
      gstNumber: gstNumber.trim(),
      shopLicenseNumber: shopLicenseNumber.trim(),
      fssaiNumber: fssaiLicenseNumber.trim(),
      panNumber: panNumber.trim().toUpperCase(),
    });
    setSaving(false);

    if (!result.ok) {
      Alert.alert('Could not save', result.error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        {/* Tick02Icon on the right is the real Save now — replaces the
            fixed bottom "Save changes" bar entirely (per an explicit ask),
            same handleSave call, just triggered from the header instead of
            a bar that sat below the scroll content. */}
        <View className="relative flex-row items-center justify-between px-5 py-3">
          <Pressable
            onPress={() => navigation.navigate('Orders')}
            className="h-10 w-10 items-center justify-center rounded-full bg-white"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
          </Pressable>
          <Text className="absolute left-0 right-0 text-center text-[17px] font-semibold text-ink">Store settings</Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            className="h-10 w-10 items-center justify-center rounded-full bg-white active:opacity-60"
            hitSlop={8}
          >
            {saving ? <ActivityIndicator size="small" color={colors.ink} /> : <AppIcon icon={Tick02Icon} size={22} color={colors.ink} />}
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

            <TextInput
              value={name}
              onChangeText={setName}
              className="flex-1 text-[17px] font-semibold text-ink"
              placeholder="Store name"
              placeholderTextColor="#9AA5A3"
            />
          </View>

          <SettingsCard icon={TagsIcon} title="Category">
            <StoreCategoryPicker selected={category} onSelect={setCategory} />
          </SettingsCard>

          <SettingsCard icon={Clock01Icon} title="Store hours">
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1.5">
                <Text className="text-[13px] font-medium text-ink/40">Opens</Text>
                <TimeDigitsInput value={openTime} onChangeText={setOpenTime} suffix="AM" />
              </View>
              <View className="flex-1 gap-1.5">
                <Text className="text-[13px] font-medium text-ink/40">Closes</Text>
                <TimeDigitsInput value={closeTime} onChangeText={setCloseTime} suffix="PM" />
              </View>
            </View>

            <PrepTimeStepper minutes={avgPrepMinutes} onChange={setAvgPrepMinutes} />

            {/* The live Open/Closed switch itself lives on the Orders header
              — this card is the schedule a shop owner sets once, that's
              the moment-to-moment toggle for "right now." Said explicitly
              so the two don't read as duplicates of each other. */}
            <Text className="text-[13px] font-medium leading-[17px] text-ink/50">
              These are your standard operating hours. You can pause or accept live orders anytime from the{' '}
              <Text className="font-semibold text-ink/80">Orders</Text> tab.
            </Text>
          </SettingsCard>

          <SettingsCard icon={Store01Icon} title="Location">
            <View className="flex-row items-center justify-between">
              <Text className="text-[14px] font-medium text-ink/70">City</Text>
              <Text className="text-[14px] font-semibold text-ink">{profile.district}</Text>
            </View>

            {/* Real live address — stores.address_line, the actual
                reverse-geocoded text from the map pin (LocationPinScreen),
                never a fake placeholder. Falls back to district for any
                store approved before this field existed. "Change on map"
                is the one way to update the real pin after approval —
                applies instantly (useChangeStoreLocation.ts's own note), not
                gated behind Save. */}
            <View className="gap-1.5">
              <Text className="text-[13px] font-medium text-ink/40">Store pin on map</Text>
              <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
                <Text className="flex-1 text-[13px] font-medium text-ink" numberOfLines={2}>
                  {profile.addressLine || profile.district || 'Not set yet'}
                </Text>
                <Pressable onPress={changeStoreLocation} hitSlop={8}>
                  <Text className="text-[13px] font-semibold text-ink">Change</Text>
                </Pressable>
              </View>
            </View>

            {/* A genuinely separate field — the owner's own typed
                description (e.g. "Near Bus Stand, opposite Xyz store"),
                never derived from the map pin above. Saved through the
                normal Save button, same as every other text field on this
                screen. */}
            <View className="gap-1.5">
              <Text className="text-[13px] font-medium text-ink/40">Shop Complete address</Text>
              <TextInput
                value={manualAddress}
                onChangeText={setManualAddress}
                placeholder="e.g. Near Bus Stand, opposite Xyz store"
                placeholderTextColor="#9AA5A3"
                multiline
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-[14px] font-medium text-ink"
              />
            </View>
          </SettingsCard>

          <SettingsCard icon={Call02Icon} title="Account">
            <View className="gap-1.5">
              <Text className="text-[13px] font-medium text-ink/40">Owner name</Text>
              <TextInput
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="Your full name"
                placeholderTextColor="#9AA5A3"
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-[14px] font-medium text-ink"
              />
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] font-medium text-ink/70">Phone number</Text>
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
              Verified via OTP. To change your phone number, sign in with a different account.
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
              label="PAN number"
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
              placeholder="License number, if you have one"
              autoCapitalize="characters"
            />

            {/* Honest, not "verified" — real format checks only (14-digit FSSAI,
      ABCDE1234F PAN), never a government-database lookup — see
      utils/documentValidation.ts's own note. */}
            <View className="flex-row items-start gap-2 rounded-2xl bg-[#F9FAFB] px-3.5 py-3">
              <Text className="flex-1 text-[12.5px] font-medium leading-[17px]">
                <Text className="font-semibold text-red-500">Note: </Text>
                <Text className="text-black/60">
                  Formats are validated and encrypted for privacy. Once saved, contact support if you need to make changes.
                </Text>
              </Text>
            </View>
          </SettingsCard>

          {/* Payout details — UPI or bank account, saved through its own
            PUT /partner/payout-account (PayoutAccountCard), not this
            screen's generic Save button. */}
          <PayoutAccountCard />

          <View className="gap-4 rounded-[16px] bg-white p-4">
            <SettingsLinkRow icon={InformationCircleIcon} label="Help & support" onPress={() => { }} />
            {/* No confirmation dialog — RootNavigator swaps to the auth
              stack the instant accessToken clears, same "store update
              drives navigation" pattern the rest of this auth flow uses.
              Logging out isn't destructive to any data, just the local
              session, so a confirm step would be friction without a real
              risk behind it. */}
            <SettingsLinkRow icon={Logout01Icon} label="Log out" destructive onPress={() => void clearSession()} />
          </View>

          <BrandFooter />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
        <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-black/10 bg-mist px-4 py-3">
          <Text className="text-[14px] font-semibold text-ink">{value}</Text>
          <AppIcon icon={SquareLock01Icon} size={15} color={`${colors.ink}60`} />
        </View>
      ) : (
        <>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9AA5A3"
            autoCapitalize={autoCapitalize}
            keyboardType={keyboardType}
            maxLength={maxLength}
            className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-[14px] font-medium text-ink"
          />
          {errorText && <Text className="text-[12px] font-medium text-red-500">{errorText}</Text>}
        </>
      )}
    </View>
  );
}

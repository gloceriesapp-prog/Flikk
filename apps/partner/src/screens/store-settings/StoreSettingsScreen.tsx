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
  File01Icon,
  ImageAdd01Icon,
  InformationCircleIcon,
  Logout01Icon,
  Store01Icon,
  TagsIcon,
} from '@hugeicons/core-free-icons';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { getAvatarImageUri } from '../../theme/placeholderImage';
import { uploadStorePhoto } from '../../api/auth';
import { compressImageToTarget } from '../../media/compressImage';
import { useAuthStore } from '../../store/useAuthStore';
import { useStoreProfileStore } from '../../store/useStoreProfileStore';
import { formatPhone } from '../../utils/formatPhone';
import type { AppStackParamList } from '../../navigation/types';
import { PayoutAccountCard } from './components/PayoutAccountCard';
import { PrepTimeStepper } from './components/PrepTimeStepper';
import { SettingsCard } from './components/SettingsCard';
import { SettingsLinkRow } from './components/SettingsLinkRow';
import { StoreCategoryPicker } from './components/StoreCategoryPicker';
import { TimeDigitsInput } from './components/TimeDigitsInput';

type Props = NativeStackScreenProps<AppStackParamList, 'StoreSettings'>;

export function StoreSettingsScreen({ navigation }: Props) {
  const profile = useStoreProfileStore((state) => state.profile);
  const updateProfile = useStoreProfileStore((state) => state.updateProfile);
  const clearSession = useAuthStore((state) => state.clear);

  const [name, setName] = useState(profile.storeName);
  const [category, setCategory] = useState(profile.category);
  const [openTime, setOpenTime] = useState(profile.openTime);
  const [closeTime, setCloseTime] = useState(profile.closeTime);
  const [avgPrepMinutes, setAvgPrepMinutes] = useState(profile.avgPrepMinutes);
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [gstNumber, setGstNumber] = useState(profile.gstNumber);
  const [shopLicenseNumber, setShopLicenseNumber] = useState(profile.shopLicenseNumber);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
    setName(profile.storeName);
    setCategory(profile.category);
    setOpenTime(profile.openTime);
    setCloseTime(profile.closeTime);
    setAvgPrepMinutes(profile.avgPrepMinutes);
    setOwnerName(profile.ownerName);
    setGstNumber(profile.gstNumber);
    setShopLicenseNumber(profile.shopLicenseNumber);
    // Only re-syncs when the loaded store's identity changes (a real new
    // load), not on every keystroke into these same fields — profile.id
    // is stable across an in-progress edit, so this won't fight typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  // Real app version — Constants.expoConfig.version reads app.config.js's
  // own `version` field (currently 1.0.0), the same value Expo applies to
  // both the iOS Info.plist (CFBundleShortVersionString) and the Android
  // versionName at build time — one source, both platforms, never
  // hardcoded here separately.
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

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

  function handleSave() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProfile({
      storeName: name.trim() || profile.storeName,
      category,
      openTime,
      closeTime,
      avgPrepMinutes,
      ownerName: ownerName.trim(),
      gstNumber: gstNumber.trim(),
      shopLicenseNumber: shopLicenseNumber.trim(),
    });
    navigation.goBack();
  }

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
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="relative flex-row items-center px-5 py-3">
        <Pressable
          onPress={() => navigation.goBack()}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <AppIcon icon={ArrowLeft01Icon} size={18} color={colors.ink} />
        </Pressable>
        <Text className="absolute left-0 right-0 text-center text-[22px] font-bold text-ink">Store settings</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-5 pb-6"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Photo + name sit outside a SettingsCard, up top — this is the
            identity a customer sees on the storefront listing, worth
            more visual weight than a form row buried in a card. */}
        <View className="items-center gap-3 py-2">
          <Pressable
            onPress={handlePickPhoto}
            disabled={uploadingPhoto}
            className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-black/5 bg-gray-100 shadow-sm shadow-black/10"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Image source={{ uri: profile.photoUrl ?? getAvatarImageUri(profile.id || 'partner-store') }} className="h-full w-full" />
            <View className="absolute bottom-0 h-7 w-full items-center justify-center bg-black/40">
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <AppIcon icon={ImageAdd01Icon} size={14} color="#FFFFFF" />
              )}
            </View>
          </Pressable>

          <TextInput
            value={name}
            onChangeText={setName}
            className="text-center text-2xl font-bold text-ink"
            placeholder="Store name"
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
          <Text className="text-[13px] font-medium text-ink/40">
            The live Open/Closed switch on the Orders tab controls whether you&apos;re taking orders right now — these
            hours are just your usual schedule.
          </Text>
        </SettingsCard>

        <SettingsCard icon={Store01Icon} title="Location">
          <View className="flex-row items-center justify-between">
            <Text className="text-[15px] font-medium text-ink/70">City</Text>
            <Text className="text-[15px] font-semibold text-ink">{profile.district}</Text>
          </View>
          <Text className="text-[13px] font-medium text-ink/40">
            Set automatically from the Orders tab&apos;s location prompt, not editable here.
          </Text>
        </SettingsCard>

        <SettingsCard icon={Call02Icon} title="Account">
          <View className="gap-1.5">
            <Text className="text-[13px] font-medium text-ink/40">Owner name</Text>
            <TextInput
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder="Your full name"
              placeholderTextColor="#9AA5A3"
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] font-semibold text-ink"
            />
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-[15px] font-medium text-ink/70">Phone number</Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-[15px] font-semibold text-ink">{profile.phone ? formatPhone(profile.phone) : '—'}</Text>
              {profile.phone.length > 0 && (
                <View className="flex-row items-center gap-1 rounded-full bg-success/10 px-2 py-0.5">
                  <AppIcon icon={CheckmarkCircle02Icon} size={11} color={colors.success} />
                  <Text className="text-[11px] font-bold text-success">Verified</Text>
                </View>
              )}
            </View>
          </View>
          <Text className="text-[13px] font-medium text-ink/40">
            This number is verified via OTP and can&apos;t be changed here — sign in with a different number to switch
            accounts.
          </Text>
        </SettingsCard>

        {/* Business documents — real stores.gst_number/shop_establishment_number,
            same optional-at-signup fields onboarding's own Step 2 collects
            (StoreDetailsScreen). An owner who skipped them there can add
            them here later without redoing the wizard. */}
        <SettingsCard icon={File01Icon} title="Business documents">
          <View className="gap-1.5">
            <Text className="text-[13px] font-medium text-ink/40">GST number (optional)</Text>
            <TextInput
              value={gstNumber}
              onChangeText={setGstNumber}
              placeholder="e.g. 29ABCDE1234F1Z5"
              placeholderTextColor="#9AA5A3"
              autoCapitalize="characters"
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] font-semibold text-ink"
            />
          </View>
          <View className="gap-1.5">
            <Text className="text-[13px] font-medium text-ink/40">Shop & Establishment license (optional)</Text>
            <TextInput
              value={shopLicenseNumber}
              onChangeText={setShopLicenseNumber}
              placeholder="License number, if you have one"
              placeholderTextColor="#9AA5A3"
              autoCapitalize="characters"
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] font-semibold text-ink"
            />
          </View>
        </SettingsCard>

        {/* Payout details — real RazorpayX-verified UPI or bank account
            (PayoutAccountCard's own note has the full flow), not a plain
            text field saved through this screen's generic Save button.
            Verification persists it server-side the instant it succeeds. */}
        <PayoutAccountCard />

        <View className="gap-4 rounded-3xl bg-[#F9FAFB] p-4 shadow-sm shadow-black/5">
          <SettingsLinkRow icon={InformationCircleIcon} label="Help & support" onPress={() => {}} />
          {/* No confirmation dialog — RootNavigator swaps to the auth
              stack the instant accessToken clears, same "store update
              drives navigation" pattern the rest of this auth flow uses.
              Logging out isn't destructive to any data, just the local
              session, so a confirm step would be friction without a real
              risk behind it. */}
          <SettingsLinkRow icon={Logout01Icon} label="Log out" destructive onPress={() => void clearSession()} />

          {/* App version — Constants.expoConfig.version, real and dynamic
              (see appVersion's own note above), not a hardcoded string.
              A plain row (no chevron/onPress, nothing to tap), same
              divider-separated layout the rest of this card uses. */}
          <View className="flex-row items-center justify-between border-t border-black/5 pt-4">
            <Text className="text-[15px] font-medium text-ink/80">App version</Text>
            <Text className="text-[15px] font-semibold text-ink/40">v{appVersion}</Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-5 pb-4 pt-2">
        <Pressable
          onPress={handleSave}
          className="items-center justify-center rounded-full bg-ink py-4 shadow-lg shadow-black/20"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Text className="text-[17px] font-semibold text-white">Save changes</Text>
        </Pressable>
      </View>
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

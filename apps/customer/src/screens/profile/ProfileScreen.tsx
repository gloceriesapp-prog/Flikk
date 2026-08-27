// Reached by tapping the person icon in DeliveryModeSwitcher.tsx (Home's
// own header pill) — a real account summary + settings menu, not the "no
// feature behind it yet" stub that pill's truck icon still is.
//
// Premium treatment: a gradient account card up top (avatar initial, real
// name/phone from useProfile.ts -> GET /auth/me, not placeholder text) —
// same ink/lime-deep diagonal language as StoreListScreen's own
// FeaturedStoreBanner, so the brand's "premium" gradient card isn't a
// one-off. Below it, two grouped menu sections in the Blinkit/Instamart
// mold (My Orders, Addresses, Payment Methods, Wishlist / Notifications,
// Refer & Earn, Help & Support, About Flikk) as one shared white card per
// group with hairline row dividers, not a separately-shadowed card per row
// — reads calmer, more like a real settings screen. Logout sits alone,
// visually separated and danger-colored. Footer is the same brand sign-off
// CategoriesFooter/Home end on, plus the real app version
// (package.json/app.json, not hardcoded twice).
//
// Only "My Orders" and "Logout" are wired to something real — every other
// row has no destination screen yet (same "UI-only, not wired up" category
// as this app's other coming-soon rows, e.g. BottomNavBar's own side
// button) and is a no-op for now rather than implying a feature that
// doesn't exist.

import { useState } from 'react';
import {
  ArrowLeft01Icon,
  Call02Icon,
  CreditCardIcon,
  CustomerService01Icon,
  GiftIcon,
  HeartIcon,
  InformationCircleIcon,
  Location05Icon,
  Logout03Icon,
  Notification03Icon,
  PackageIcon,
  PencilEdit02Icon,
} from '@hugeicons/core-free-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfile } from './useProfile';
import { ProfileMenuRow } from './components/ProfileMenuRow';
import packageJson from '../../../package.json';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Profile'>;

// package.json's own version — one source of truth instead of a second
// hardcoded string that can drift from it.
const APP_VERSION = packageJson.version;

function formatPhone(phone: string): string {
  // Stored as E.164 (+91XXXXXXXXXX) — split into a readable "+91 98765
  // 43210" rather than showing the raw digit string.
  const digits = phone.replace(/^\+91/, '');
  if (digits.length !== 10) return phone;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function ProfileScreen({ navigation }: Props) {
  const { data: profile } = useProfile();
  const clearSession = useAuthStore((s) => s.clear);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayName = profile?.name?.trim() || 'Flikk Customer';
  const initial = displayName.charAt(0).toUpperCase();

  async function handleLogout() {
    setIsLoggingOut(true);
    await clearSession();
    // No explicit navigation on logout — RootNavigator branches on
    // accessToken presence and swaps to AuthNavigator on its own the
    // moment the store updates.
  }

  return (
    <View className="flex-1 bg-mist/40 pt-safe">
      {/* Same fix class as every other light-header screen's own note
          (Categories/Purchase/CategoryDetail/StoreDetail) — a prior screen
          may have left the global StatusBar set to "light". */}
      <StatusBar style="dark" />

      <View className="flex-row items-center px-5 pb-2 pt-2">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-ink">Profile</Text>
        <View className="h-11 w-11" />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-16 pt-2" showsVerticalScrollIndicator={false}>
        <View className="overflow-hidden rounded-3xl shadow-lg shadow-black/15">
          <LinearGradient colors={[colors.ink, colors.limeDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="px-5 py-6">
            <View className="flex-row items-center gap-4">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-white/15 border border-white/25">
                <Text className="text-2xl font-extrabold text-white">{initial}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-white" numberOfLines={1}>
                  {displayName}
                </Text>
                {profile?.phone && (
                  <View className="mt-1 flex-row items-center gap-1.5">
                    <AppIcon icon={Call02Icon} size={13} color="#FFFFFFB3" />
                    <Text className="text-sm font-medium text-white/70">{formatPhone(profile.phone)}</Text>
                  </View>
                )}
              </View>
              <Pressable hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <AppIcon icon={PencilEdit02Icon} size={16} color="#FFFFFF" strokeWidth={1.8} />
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        <View>
          <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink/40">Orders & Shopping</Text>
          <View className="overflow-hidden rounded-2xl bg-white shadow-sm shadow-black/5">
            <ProfileMenuRow icon={PackageIcon} label="My Orders" onPress={() => navigation.navigate('Purchase')} />
            <ProfileMenuRow icon={Location05Icon} label="Saved Addresses" onPress={() => navigation.navigate('LocationSearch')} />
            <ProfileMenuRow icon={HeartIcon} label="Wishlist" onPress={() => {}} />
            <ProfileMenuRow icon={CreditCardIcon} label="Payment Methods" onPress={() => {}} isLast />
          </View>
        </View>

        <View>
          <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink/40">More</Text>
          <View className="overflow-hidden rounded-2xl bg-white shadow-sm shadow-black/5">
            <ProfileMenuRow icon={Notification03Icon} label="Notifications" onPress={() => {}} />
            <ProfileMenuRow icon={GiftIcon} label="Refer & Earn" onPress={() => {}} />
            <ProfileMenuRow icon={CustomerService01Icon} label="Help & Support" onPress={() => {}} />
            <ProfileMenuRow icon={InformationCircleIcon} label="About Flikk" onPress={() => {}} isLast />
          </View>
        </View>

        <Pressable
          onPress={handleLogout}
          disabled={isLoggingOut}
          className="flex-row items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 shadow-sm shadow-black/5"
        >
          <AppIcon icon={Logout03Icon} size={18} color={colors.danger} strokeWidth={1.8} />
          <Text className="text-[15px] font-semibold text-danger">{isLoggingOut ? 'Logging out…' : 'Log out'}</Text>
        </Pressable>

        <View className="items-center gap-1 pb-4 pt-4">
          <View className="flex-row items-center gap-1">
            <Text className="text-xs font-medium text-ink/40">Made with</Text>
            <AppIcon icon={HeartIcon} size={11} color={colors.danger} fill={colors.danger} />
            <Text className="text-xs font-medium text-ink/40">in Udupi, India</Text>
          </View>
          <Text className="text-[11px] font-medium text-ink/25">Version {APP_VERSION}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

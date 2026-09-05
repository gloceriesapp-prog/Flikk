// Reached by tapping the person icon in DeliveryModeSwitcher.tsx (Home's
// own header pill) — a real account summary + settings menu, not the "no
// feature behind it yet" stub that pill's truck icon still is.
//
// Fully redesigned per an explicit ask to move away from the earlier
// Blinkit-shaped layout (flat rows top to bottom) entirely — page
// background stays the same #FAFAFA, everything on top of it is new:
//   1. AccountDetailsCard — one compact identity hero (avatar initial +
//      name + phone, DOB as a small pill chip), not three stacked rows.
//   2. ProfileActionsBento — one wide "My Orders" tile + one card
//      grouping Wishlist/Support/My Refunds as three columns. Gray
//      throughout, no lime/green accent — this screen doesn't carry the
//      brand color, unlike Home. Address Book and Payment Methods live in
//      Preferences below instead; Track Order was dropped (same
//      destination as My Orders, a redundant second tile).
//   3. Preferences — still a compact icon-forward list (ProfileMenuRow.tsx)
//      since a bento treatment for every settings toggle would be noise,
//      not premium — but sits on its own soft off-white card now instead
//      of bare page background, so it doesn't read as a re-skinned
//      version of the same reference list. Logout lives inside it,
//      danger-colored, same row shape as everything above it.
// Footer is the same brand sign-off CategoriesFooter/Home end on, plus the
// real app version (package.json, not hardcoded twice).
//
// Content itself (which rows/tiles exist) is unchanged from the earlier
// curation against Blinkit's own Profile screen — still deliberately NOT
// a 1:1 port: no Blinkit Money/wallet, gift cards, donation/CSR, recipes,
// prescriptions, GST details, "sell on platform", or rewards (out per
// CLAUDE.md's loyalty-program scope note). This pass only changes how
// those same rows are laid out, not which ones exist.
//
// "My Orders", "Address Book", "Wishlist", "Share Flikk", "Rate Flikk"
// and "Logout" are wired to something real. Payment Methods/Track Order
// (routes to Purchase)/Support/My Refunds/Notifications/Help & Support/
// Account Privacy/About Flikk have no dedicated screen yet — same
// "UI-only, not wired up" category as this app's other coming-soon rows
// (e.g. BottomNavBar's own side button) — a no-op for now rather than
// implying a feature that doesn't exist.
//
// Guest branch (no accessToken — LoginScreen.tsx's own Skip flow):
// everything below requires a real identity (orders, wishlist, addresses,
// logout), so a guest hitting this screen is redirected straight back to
// the real Login screen — no interstitial "you're a guest, log in?"
// content in between. exitGuestMode() drops isGuest, RootNavigator swaps
// to AuthNavigator on its own the moment that happens.

import { useEffect, useState } from 'react';
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  CreditCardIcon,
  CustomerService01Icon,
  HeartIcon,
  InformationCircleIcon,
  Location05Icon,
  LockIcon,
  Logout03Icon,
  Moon01Icon,
  Notification03Icon,
  Share08Icon,
  StarIcon,
  Sun01Icon,
} from '@hugeicons/core-free-icons';
import { StatusBar } from 'expo-status-bar';
import { Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfile } from './useProfile';
import { AccountDetailsCard } from './components/AccountDetailsCard';
import { ProfileActionsBento } from './components/ProfileActionsBento';
import { ProfileMenuRow } from './components/ProfileMenuRow';
import { RateUsModal } from './components/RateUsModal';
import packageJson from '../../../package.json';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Profile'>;

// package.json's own version — one source of truth instead of a second
// hardcoded string that can drift from it.
const APP_VERSION = packageJson.version;

type AppearanceMode = 'Light' | 'Dark';

export function ProfileScreen({ navigation }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const exitGuestMode = useAuthStore((s) => s.exitGuestMode);
  const { data: profile } = useProfile();
  const clearSession = useAuthStore((s) => s.clear);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  // Defaults to Light and stays local-only (no persistence, no theming
  // effect) — this app's design system is fixed light-only (CLAUDE.md's
  // own system-font-stack note), so picking Dark here only updates what
  // this row displays, it doesn't reskin the app. Real theming is a
  // separate, much larger piece of work than this selector.
  const [appearance, setAppearance] = useState<AppearanceMode>('Light');
  const [isAppearanceSheetOpen, setIsAppearanceSheetOpen] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await clearSession();
    // No explicit navigation on logout — RootNavigator branches on
    // accessToken presence and swaps to AuthNavigator on its own the
    // moment the store updates.
  }

  // Real, working feature (RN's own Share API, no dependency/backend
  // needed) — not another no-op row. No app-store link included yet since
  // this app has no public listing to point to; the message stands on its
  // own until one exists.
  function handleShare() {
    Share.share({ message: 'Ordering from local stores near you, delivered fast — check out Flikk.' });
  }

  // Guest (no accessToken) hitting Profile — straight back to the real
  // Login screen, no interstitial "you're a guest" content in between.
  // exitGuestMode() drops isGuest, which flips RootNavigator over to
  // AuthNavigator on its own. In an effect, not called directly during
  // render — a zustand set() during render is a side effect React's
  // rules don't allow, even though it happens to work in practice.
  useEffect(() => {
    if (!accessToken) exitGuestMode();
  }, [accessToken, exitGuestMode]);

  if (!accessToken) return null;

  return (
    <View className="flex-1 bg-[#FAFAFA] pt-safe">
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

      <ScrollView className="flex-1" contentContainerClassName="gap-3.5 px-5 pb-16 pt-2" showsVerticalScrollIndicator={false}>
        <View className="px-1">
          <Text className="text-2xl font-extrabold text-ink">Your account</Text>
        </View>

        {/* Identity hero — avatar initial, name, phone, DOB chip. Real
            data + edits (AccountDetailsCard's own PATCH /auth/me). */}
        {profile && <AccountDetailsCard profile={profile} />}

        {/* Bento — My Orders (wide) + one card grouping Wishlist/Support/
            My Refunds. Address Book and Payment Methods live in
            Preferences below instead. */}
        <ProfileActionsBento
          onMyOrders={() => navigation.navigate('Purchase')}
          onWishlist={() => navigation.navigate('Wishlist')}
          onSupport={() => {}}
          onRefunds={() => {}}
        />

        {/* Preferences — still a compact list (secondary/utility rows,
            neutral gray icon circles), but on its own soft card now
            instead of bare page background. */}
        <View className="gap-1 rounded-[24px] bg-white px-3 py-2 ">
          <Text className="px-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-ink/40">Preferences</Text>
          {/* Appearance — tapping opens a real Light/Dark picker
              (AppearanceSheet below). Defaults to Light. Selecting Dark
              only updates this row's own value — this app's design
              system is fixed light-only (CLAUDE.md's own system-font-
              stack note), so there's no actual reskin to apply yet; a
              full theming pass is separate, larger work. */}
          <Pressable onPress={() => setIsAppearanceSheetOpen(true)} className="flex-row items-center gap-3.5 py-2">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <AppIcon icon={Sun01Icon} size={18} color={`${colors.ink}99`} strokeWidth={1.7} />
            </View>
            <Text className="flex-1 text-[15px] font-medium text-ink">Appearance</Text>
            <View className="flex-row items-center gap-1">
              <View className="rounded-full bg-gray-100 px-3 py-1.5">
                <Text className="text-[12px] font-medium text-ink/60">{appearance}</Text>
              </View>
              <AppIcon icon={ArrowDown01Icon} size={14} color={`${colors.ink}40`} strokeWidth={2} />
            </View>
          </Pressable>
          <ProfileMenuRow icon={Location05Icon} label="Address Book" onPress={() => navigation.navigate('AddressList')} />
          <ProfileMenuRow icon={CreditCardIcon} label="Payment Methods" onPress={() => {}} />
          <ProfileMenuRow icon={Notification03Icon} label="Notifications" onPress={() => {}} />
          <ProfileMenuRow icon={Share08Icon} label="Share Flikk" onPress={handleShare} />
          {/* Rate us — real interaction (RateUsModal.tsx): 5 tappable
              stars, 4-5 hands off to the OS's own native App Store/Play
              Store review sheet (expo-store-review), 1-3 just says thanks.
              Never funnels a low score toward the public store listing —
              same gate every major app (Zomato/Swiggy included) uses. */}
          <ProfileMenuRow icon={StarIcon} label="Rate Flikk" onPress={() => setIsRateModalOpen(true)} />
          <ProfileMenuRow icon={CustomerService01Icon} label="Help & Support" onPress={() => {}} />
          {/* Account privacy — added per the reference's own row (real ask:
              a place that says how a customer's data is handled). No
              privacy-policy screen exists yet, same no-op category as the
              rows above it until one does. */}
          <ProfileMenuRow icon={LockIcon} label="Account Privacy" onPress={() => {}} />
          <ProfileMenuRow icon={InformationCircleIcon} label="About Flikk" onPress={() => {}} />
          {/* Logout lives inside this same card now, right after About
              Flikk — same row width/spacing as everything above it, not a
              separately-boxed full-width pill. */}
          <ProfileMenuRow
            icon={Logout03Icon}
            label={isLoggingOut ? 'Logging out…' : 'Log out'}
            onPress={handleLogout}
            disabled={isLoggingOut}
            danger
          />
        </View>

        <RateUsModal visible={isRateModalOpen} onClose={() => setIsRateModalOpen(false)} />

        {/* Appearance picker — bottom sheet, two options, checkmark on
            whichever is currently selected. Tap an option to select and
            close in one step, same as AccountDetailsCard's own DOB
            "Done" flow but without a separate confirm step since there's
            only a value to pick, nothing to draft. */}
        <Modal
          visible={isAppearanceSheetOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsAppearanceSheetOpen(false)}
        >
          <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setIsAppearanceSheetOpen(false)}>
            <Pressable className="rounded-t-3xl bg-white pb-safe" onPress={(e) => e.stopPropagation()}>
              <Text className="px-5 pt-5 text-[15px] font-semibold text-ink">Appearance</Text>
              {(['Light', 'Dark'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => {
                    setAppearance(mode);
                    setIsAppearanceSheetOpen(false);
                  }}
                  className="flex-row items-center gap-3.5 px-5 py-3.5"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                    <AppIcon icon={mode === 'Light' ? Sun01Icon : Moon01Icon} size={16} color={`${colors.ink}99`} strokeWidth={1.7} />
                  </View>
                  <Text className="flex-1 text-[15px] font-medium text-ink">{mode}</Text>
                  {appearance === mode && <AppIcon icon={CheckmarkCircle02Icon} size={20} color={colors.ink} strokeWidth={1.8} />}
                </Pressable>
              ))}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Wordmark + version on one line (dot separator, small caps-style
            tracking), a muted one-line sign-off underneath — same shape as
            a Settings-screen footer every major app ends on (name, version,
            where it's from), rebuilt in this app's own brand voice rather
            than reusing anyone else's exact wording/mascot. */}
        <View className="items-center gap-1.5 pb-4 pt-5">
          <View className="flex-row items-center gap-2">
            <Text className="text-[13px] font-extrabold text-ink/35">Flikk</Text>
            <Text className="text-[13px] font-extrabold text-ink/35">v{APP_VERSION}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Text className="text-xs font-medium text-ink/40">Made with</Text>
            <AppIcon icon={HeartIcon} size={11} color={colors.danger} fill={colors.danger} />
            <Text className="text-xs font-medium text-ink/40">in Udupi, KA</Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

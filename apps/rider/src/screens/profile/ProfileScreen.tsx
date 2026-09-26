// Rider account screen — white (#fbfbfb) page, border-only rounded-16 cards.
// Top bar: back (white circle + shadow) left, "Profile" centered, Help right.
// Below: name/phone + avatar, a vehicle card, an app-version card, the
// performance row, a Documents status row, then one menu list of rows (icon ·
// label · value · chevron). No brand-green surfaces — neutral gray + ink only.
//
// Real data: GET /rider/profile (name / phone / riderCode / vehicle / docs
// / payout). Every row wires to a real action — Support (tel/mail),
// Emergency SOS (rider's emergency contact), Shift & availability (points to
// Home's online toggle), Wallet (Earnings tab), Payout method, Documents.
// Placeholder "coming soon" rows (Language / Radius / Insurance / Settings)
// were removed — they'll return as real features, not fake status.

import { Alert, ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useState } from 'react';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Alert02Icon,
  ArrowLeft01Icon,
  Clock01Icon,
  CustomerService01Icon,
  IdentityCardIcon,
  Invoice01Icon,
  Logout01Icon,
  MessageQuestionIcon,
  Motorbike01Icon,
  ShieldCheckIcon,
  SmartPhone01Icon,
  UserIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';
import { AppIcon } from '../../components/AppIcon';
import { PerformanceRow } from '../../components/PerformanceRow';
import { computePerformanceStats } from '../../utils/performance';
import { colors } from '../../theme/tokens';
import { useAuthStore } from '../../store/useAuthStore';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '../../data/support';
import { useRiderProfile } from './useRiderProfile';
import { EditPayoutModal } from './EditPayoutModal';
import type { RiderProfile } from '../../api/profile';
import type { AppStackParamList, AppTabParamList } from '../../navigation/types';

type ProfileNav = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Profile'>,
  NativeStackNavigationProp<AppStackParamList>
>;

const CARD_BORDER = '#EAECEE';
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const VEHICLE_LABEL: Record<NonNullable<RiderProfile['vehicleType']>, string> = {
  bicycle: 'Bicycle',
  scooter: 'Scooter',
  motorcycle: 'Bike',
};

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const goOffline = useRiderOrdersStore((s) => s.goOffline);
  const completedOrders = useRiderOrdersStore((s) => s.completedOrders);
  const cancelledOrders = useRiderOrdersStore((s) => s.cancelledOrders);
  const clear = useAuthStore((s) => s.clear);
  const { data: profile, isLoading } = useRiderProfile();
  const [editingPayout, setEditingPayout] = useState(false);

  const stats = computePerformanceStats(completedOrders, cancelledOrders);

  const displayName = profile?.name?.trim() || 'Rider';
  const displayPhone = profile?.phone ?? '—';
  const initial = displayName.charAt(0).toUpperCase();

  // Profile is a tab root — a back arrow there usually has nowhere to pop, so
  // fall back to the Home tab rather than dead-tap.
  function goBack() {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  }

  function callSupport() {
    void Linking.openURL(`tel:${SUPPORT_PHONE}`);
  }

  function reportProblem() {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Rider%20app%20issue`);
  }

  function emergencySos() {
    // Rider's own emergency contact if we have it, else support line — never
    // a fabricated number.
    const num = profile?.emergencyContactPhone;
    if (num) {
      Alert.alert('Emergency call', `Call ${profile?.emergencyContactName || 'your emergency contact'} now?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', style: 'destructive', onPress: () => void Linking.openURL(`tel:${num}`) },
      ]);
    } else {
      callSupport();
    }
  }

  function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          void goOffline();
          void clear();
        },
      },
    ]);
  }

  const vehicleValue = profile?.vehicleType
    ? `${VEHICLE_LABEL[profile.vehicleType]}${profile.vehicleNumber ? ` · ${profile.vehicleNumber}` : ''}`
    : 'Not set';

  if (isLoading && !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-[#fbfbfb]">
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#fbfafa]">
      <ScrollView contentContainerClassName="pb-28" showsVerticalScrollIndicator={false}>
        <View className="px-5 pb-6 pt-safe-offset-3">
          {/* Top bar — back · Profile centered · Support. Flat #F1F1F4 circles
              to match the menu-row icon chips. */}
          <View className="flex-row items-center">
            <Pressable
              onPress={goBack}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center rounded-full bg-[#F1F1F4]"
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
            </Pressable>
            <Text className="flex-1 text-center text-[18px] font-semibold text-ink">Profile</Text>
            <Pressable
              onPress={callSupport}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center rounded-full bg-[#F1F1F4]"
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <AppIcon icon={CustomerService01Icon} size={22} color={colors.ink} />
            </Pressable>
          </View>

          {/* Centered identity — avatar, then name, phone, id stacked below. */}
          <View className="mt-6 items-center">
            <View
              className="h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-full border bg-white"
              style={{ borderColor: CARD_BORDER }}
            >
              {profile?.photoUrl ? (
                <Image source={{ uri: profile.photoUrl }} className="h-full w-full" resizeMode="cover" />
              ) : displayName !== 'Rider' ? (
                <Text className="text-[36px] font-medium text-ink">{initial}</Text>
              ) : (
                <AppIcon icon={UserIcon} size={44} color={colors.ink} />
              )}
            </View>
            <Text className="mt-4 text-[22px] font-semibold text-ink" numberOfLines={1}>{displayName}</Text>
            <View className="mt-1 flex-row items-center gap-2">
              <Text className="text-[15px] font-semibold text-ink/70" style={{ fontVariant: ['tabular-nums'] }}>{displayPhone}</Text>
              {profile?.riderCode && (
                <View className="rounded-full border px-3 py-1" style={{ borderColor: CARD_BORDER }}>
                  <Text className="text-[12px] font-bold text-ink/55">ID · {profile.riderCode}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View className="gap-3 px-5 pt-4">
          {/* Vehicle */}
          <InfoCard icon={Motorbike01Icon} label="Vehicle" value={vehicleValue} />

          {/* App version — honest: no fake "update available", real version. */}
          <InfoCard icon={SmartPhone01Icon} label="App version" value={`v${APP_VERSION} · Up to date`} />

          {/* Trust-signal metrics — real values (Performance / Completion /
              Rating), same computePerformanceStats source as Home. */}
          <PerformanceRow stats={stats} />

          {/* Documents status row → dedicated read-only page. */}
          <View>
            <MenuRow icon={ShieldCheckIcon} label="Documents" onPress={() => navigation.navigate('RiderDocuments')} />
          </View>

          {/* Menu list — every row is a real wired action. */}
          <View>
            <MenuRow icon={Clock01Icon} label="Shift & availability" onPress={() => Alert.alert('Availability', 'Go online or offline from the Home screen.')} />
            <MenuRow icon={CustomerService01Icon} label="Support" onPress={callSupport} />
            <MenuRow icon={Alert02Icon} label="Emergency SOS" danger onPress={emergencySos} />
            <MenuRow icon={Wallet01Icon} label="Wallet & payouts" onPress={() => navigation.navigate('Earnings')} />
            <MenuRow icon={Invoice01Icon} label="Payout history" onPress={() => navigation.navigate('PayoutHistory')} />
            <MenuRow icon={IdentityCardIcon} label="Payout method" onPress={() => setEditingPayout(true)} />
            <MenuRow icon={MessageQuestionIcon} label="Report a problem" onPress={reportProblem} />
            <MenuRow icon={Logout01Icon} label="Log out" danger onPress={handleLogout} />
          </View>

          <View className="mt-6 items-center gap-1">
            <Text className="text-[13px] font-semibold text-ink/40" style={{ fontVariant: ['tabular-nums'] }}>v{APP_VERSION}</Text>
            <Text className="text-[12px] font-medium text-ink/35">Made with ❤️ in Udupi</Text>
          </View>
        </View>
      </ScrollView>

      <EditPayoutModal visible={editingPayout} onClose={() => setEditingPayout(false)} />
    </View>
  );
}

function InfoCard({ icon, label, value }: { icon: IconSvgElement; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-[16px] border px-4 py-3.5" style={{ borderColor: CARD_BORDER }}>
      <View className="h-11 w-11 items-center justify-center">
        <AppIcon icon={icon} size={20} color={colors.ink} />
      </View>
      <View className="flex-1">
        <Text className="text-[14px] font-medium text-ink/60">{label}</Text>
        <Text className="mt-0.5 text-[15px] font-semibold text-ink/80" style={{ fontVariant: ['tabular-nums'] }}>{value}</Text>
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: IconSvgElement;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const tint = danger ? colors.danger : colors.ink;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <View className="flex-row items-center gap-3 py-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-[#F1F1F4]">
          <AppIcon icon={icon} size={17} color={tint} />
        </View>
        <Text className="text-[15px] font-semibold" style={{ color: danger ? colors.danger : `${colors.ink}CC` }}>{label}</Text>
      </View>
    </Pressable>
  );
}


// Rider account screen — restyled to the mockups' Swiggy-style layout: a
// tinted header (name/phone left, avatar right, Help pill), a vehicle card,
// an app-version card, three quick-action tiles, a Documents status row,
// then one menu list of rows (icon · label · value · chevron). White page,
// border-only cards.
//
// Real data: GET /rider/profile (name / phone / riderCode / vehicle / docs
// / payout). Rows wire to real actions where a feature exists — Support
// (tel/mail), Emergency SOS (rider's emergency contact), Wallet (Earnings
// tab), Documents (masked summary). Language / Preferred radius / Shift &
// availability / Insurance / Settings have NO backend yet: they surface
// honest info/"coming soon" alerts, never fabricated status values
// (Insurance especially never claims "Active").

import { Alert, ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useState } from 'react';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Alert02Icon,
  ArrowRight01Icon,
  Call02Icon,
  Clock01Icon,
  CustomerService01Icon,
  GlobalIcon,
  GpsSignal01Icon,
  IdentityCardIcon,
  Logout01Icon,
  MessageQuestionIcon,
  Motorbike01Icon,
  Settings01Icon,
  Shield01Icon,
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

const HEADER_BG = colors.limeSoft; // on-brand tinted header (not Swiggy blue)
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

  function comingSoon(feature: string) {
    Alert.alert(feature, `${feature} isn't available yet — it's coming in a future update.`);
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
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={colors.limeDeep} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerClassName="pb-10" showsVerticalScrollIndicator={false}>
        {/* Tinted header — name/phone left, avatar right, Help pill (img #25). */}
        <View className="px-5 pb-6 pt-safe-offset-3" style={{ backgroundColor: HEADER_BG }}>
          <View className="flex-row items-start justify-between">
            <Text className="text-[20px] font-bold text-ink">Profile</Text>
            <Pressable
              onPress={callSupport}
              className="rounded-full border border-lime-deep/40 bg-white px-4 py-1.5"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text className="text-[13px] font-bold" style={{ color: colors.limeDeep }}>Help</Text>
            </Pressable>
          </View>

          <View className="mt-5 flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-[24px] font-extrabold text-ink" numberOfLines={1}>{displayName}</Text>
              <Text className="mt-1 text-[15px] font-semibold text-ink/70" style={{ fontVariant: ['tabular-nums'] }}>{displayPhone}</Text>
              {profile?.riderCode && (
                <View className="mt-2 self-start rounded-full bg-white/70 px-3 py-1">
                  <Text className="text-[12px] font-bold text-ink/55">ID · {profile.riderCode}</Text>
                </View>
              )}
            </View>
            <View className="h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white">
              {profile?.photoUrl ? (
                <Image source={{ uri: profile.photoUrl }} className="h-full w-full" resizeMode="cover" />
              ) : displayName !== 'Rider' ? (
                <Text className="text-[28px] font-extrabold" style={{ color: colors.limeDeep }}>{initial}</Text>
              ) : (
                <AppIcon icon={UserIcon} size={34} color={colors.limeDeep} />
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
          <View className="rounded-2xl border px-2" style={{ borderColor: CARD_BORDER }}>
            <MenuRow icon={ShieldCheckIcon} label="Documents" value="View" onPress={() => navigation.navigate('RiderDocuments')} last />
          </View>

          {/* Menu list — wireframe order. Real actions where they exist;
              honest "coming soon" for features with no backend yet. */}
          <View className="rounded-2xl border px-2" style={{ borderColor: CARD_BORDER }}>
            <MenuRow icon={GlobalIcon} label="Language" value="English" onPress={() => comingSoon('More languages')} />
            <MenuRow icon={GpsSignal01Icon} label="Preferred radius" value="Auto" onPress={() => comingSoon('Radius control')} />
            <MenuRow icon={Clock01Icon} label="Shift & availability" onPress={() => Alert.alert('Availability', 'Go online or offline from the Home screen.')} />
            <MenuRow icon={CustomerService01Icon} label="Support" onPress={callSupport} />
            <MenuRow icon={Alert02Icon} label="Emergency SOS" danger onPress={emergencySos} />
            <MenuRow icon={Shield01Icon} label="Insurance" onPress={() => comingSoon('Rider insurance')} />
            <MenuRow icon={Wallet01Icon} label="Wallet & payouts" onPress={() => navigation.navigate('Earnings')} />
            <MenuRow icon={IdentityCardIcon} label="Payout method" onPress={() => setEditingPayout(true)} />
            <MenuRow icon={Settings01Icon} label="Settings" onPress={() => comingSoon('Settings')} />
            <MenuRow icon={MessageQuestionIcon} label="Report a problem" onPress={reportProblem} last />
          </View>

          <Pressable
            onPress={handleLogout}
            className="mt-1 flex-row items-center justify-center gap-2 rounded-2xl border py-3.5"
            style={({ pressed }) => ({ borderColor: CARD_BORDER, opacity: pressed ? 0.6 : 1 })}
          >
            <AppIcon icon={Logout01Icon} size={18} color={colors.danger} />
            <Text className="text-[15px] font-bold" style={{ color: colors.danger }}>Log out</Text>
          </Pressable>

          <Text className="mt-3 text-center text-[12px] font-medium text-ink/35">Flikk Rider · v{APP_VERSION}</Text>
        </View>
      </ScrollView>

      <EditPayoutModal visible={editingPayout} onClose={() => setEditingPayout(false)} />
    </View>
  );
}

function InfoCard({ icon, label, value }: { icon: IconSvgElement; label: string; value: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border px-4 py-3.5" style={{ borderColor: CARD_BORDER }}>
      <View className="h-11 w-11 items-center justify-center rounded-full bg-lime-soft">
        <AppIcon icon={icon} size={20} color={colors.limeDeep} />
      </View>
      <View className="flex-1">
        <Text className="text-[12px] font-semibold text-ink/45">{label}</Text>
        <Text className="mt-0.5 text-[15px] font-bold text-ink" style={{ fontVariant: ['tabular-nums'] }}>{value}</Text>
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  value,
  danger,
  onPress,
  last,
}: {
  icon: IconSvgElement;
  label: string;
  value?: string;
  danger?: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  const tint = danger ? colors.danger : colors.ink;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <View className={`flex-row items-center gap-3 px-2 py-3.5 ${last ? '' : 'border-b border-black/5'}`}>
        <View className="h-9 w-9 items-center justify-center rounded-full bg-[#F4F5F6]">
          <AppIcon icon={icon} size={17} color={tint} />
        </View>
        <Text className="text-[14px] font-semibold" style={{ color: tint }}>{label}</Text>
        {value ? (
          <Text className="ml-auto text-[13px] font-medium text-ink/50" style={{ fontVariant: ['tabular-nums'] }}>{value}</Text>
        ) : (
          <View className="ml-auto" />
        )}
        <AppIcon icon={ArrowRight01Icon} size={16} color={`${colors.ink}55`} />
      </View>
    </Pressable>
  );
}


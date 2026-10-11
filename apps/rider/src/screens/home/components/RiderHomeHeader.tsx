// Shared home header — avatar + "Hello, {first}" + a live online/offline
// status line on the left; a single go-online/go-offline TOGGLE button plus
// the settings-gear (→ Profile) on the right. Used by BOTH the offline home
// and the live dashboard so the header is visually identical across shift
// states (per the "keep the header the same" call); only the toggle's
// label/action and the status line flip with isOnline. The status line is a
// plain indicator, never pressable — the rider reads their state there and
// changes it with the button. One component = one fix point, same
// consistency rule CLAUDE.md sets for the three RN apps.

import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { AppImage as Image } from '../../../components/AppImage';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Settings02Icon, UserIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { useRiderOrdersStore } from '../../../store/useRiderOrdersStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useRiderProfile } from '../../profile/useRiderProfile';
import type { AppStackParamList, AppTabParamList } from '../../../navigation/types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Home'>,
  NativeStackNavigationProp<AppStackParamList>
>;

const CARD_BORDER = '#EAECEE';

export function RiderHomeHeader({ isOnline }: { isOnline: boolean }) {
  const navigation = useNavigation<Nav>();
  const goOnline = useRiderOrdersStore((s) => s.goOnline);
  const goOffline = useRiderOrdersStore((s) => s.goOffline);
  const { data: profile } = useRiderProfile();

  const name = profile?.name?.trim() || 'Rider';
  const first = name.split(' ')[0];
  const initial = first.charAt(0).toUpperCase();

  // Going online needs location — the store now refuses (returns false) when
  // the grant is missing rather than flipping to a silent "online" state that
  // dispatch can't see. On refusal, point the rider at Settings (the OS won't
  // re-prompt after a hard denial, so a plain retry can't fix it).
  const handleGoOnline = async () => {
    const online = await goOnline();
    // A suspension refusal swaps the whole app to RiderSuspendedScreen.
    if (!online && !useAuthStore.getState().isSuspended) {
      Alert.alert(
        'Location needed to go online',
        'Gloceries shares your location while online so you receive delivery offers nearby. Enable location access to go online.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => void Linking.openSettings() },
        ]
      );
    }
  };

  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1 flex-row items-center gap-3 pr-3">
        <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-200">
          {profile?.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} className="h-full w-full" resizeMode="cover" />
          ) : name !== 'Rider' ? (
            <Text className="text-[20px] font-medium" style={{ color: colors.ink }}>{initial}</Text>
          ) : (
            <AppIcon icon={UserIcon} size={26} color={colors.limeDeep} />
          )}
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-medium text-ink/50">Hello,</Text>
          <Text className="text-[22px] font-medium text-ink" numberOfLines={1}>{first}</Text>
          <Text className="text-xs text-ink/60" numberOfLines={1}>{profile?.zoneName ? `Serving ${profile.zoneName}` : 'Service zone not assigned'}</Text>
          {/* Status indicator — plain text + dot, not a button. Tells the
              rider what state they're in; the button on the right changes it. */}
        </View>
      </View>
      <View className="flex-row items-center gap-2.5">
        {/* Single toggle: offline → solid green "Go online" (goOnline);
            online → neutral bordered "Go offline" (goOffline). One button,
            label + action flip. */}
        {isOnline ? (
          <Pressable
            onPress={goOffline}
            hitSlop={8}
            className="h-11 items-center justify-center rounded-full bg-[#fb2c36] px-4"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <Text className="text-[14px] font-semibold text-[#FFFFFF]">Go offline</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleGoOnline}
            hitSlop={8}
            className="h-11 items-center justify-center rounded-full px-4 bg-[#00a63e]"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <Text className="text-[14px] font-semibold text-[#FFFFFF]">Go online</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => navigation.navigate('Profile')}
          hitSlop={10}
          className="h-11 w-11 items-center justify-center rounded-full border bg-white"
          style={{ borderColor: CARD_BORDER }}
        >
          <AppIcon icon={Settings02Icon} size={22} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

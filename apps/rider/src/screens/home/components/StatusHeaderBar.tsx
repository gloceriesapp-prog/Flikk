// Replaces the old plain welcome-text + big toggle-card header with a
// single realistic status row, matching real rider apps (Rapido/Uber
// driver-style): an Online/Offline pill switch on the left, HELP and SOS
// pills on the right — always reachable from Home, not buried in Profile.
// The toggle itself is IosSwitch.tsx (a real iOS-style switch, not a
// colored dot) — the surrounding pill tints red/offline vs green/online so
// the state reads at a glance even before noticing which side the knob
// sits on.

import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { HeadphonesIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { IosSwitch } from '../../../components/IosSwitch';
import { colors } from '../../../theme/tokens';
import { EMERGENCY_PHONE, SUPPORT_PHONE } from '../../../data/support';

interface Props {
  isOnline: boolean;
  onToggle: (value: boolean) => void;
}

function handleSos() {
  // A real SOS should never fire off one accidental tap — a rider's phone
  // is in a pocket or a bike mount most of the day.
  Alert.alert('Emergency SOS', `This will call India's emergency helpline (${EMERGENCY_PHONE}). Only use this in a real emergency.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Call now', style: 'destructive', onPress: () => void Linking.openURL(`tel:${EMERGENCY_PHONE}`) },
  ]);
}

export function StatusHeaderBar({ isOnline, onToggle }: Props) {
  return (
    <View className="flex-row items-center justify-between gap-2.5">
      <View
        className={`h-14 flex-row items-center gap-3 rounded-full pl-4 pr-2.5 ${isOnline ? 'bg-success/10' : 'bg-danger/10'}`}
      >
        <Text className={`text-[15px] font-bold ${isOnline ? 'text-success' : 'text-danger'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </Text>
        <IosSwitch value={isOnline} onValueChange={onToggle} />
      </View>

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => void Linking.openURL(`tel:${SUPPORT_PHONE}`)}
          className="h-12 flex-row items-center gap-1.5 rounded-3xl bg-gray-200 px-4"
        >
          <AppIcon icon={HeadphonesIcon} size={15} color={colors.ink} />
          <Text className="text-[11px] font-extrabold uppercase tracking-wide text-ink">Help</Text>
        </Pressable>

        <Pressable
          onPress={handleSos}
          className="h-12 items-center justify-center rounded-3xl bg-danger px-4"
        >
          <Text className="text-[11px] font-medium uppercase tracking-wide text-white">SOS</Text>
        </Pressable>
      </View>
    </View>
  );
}

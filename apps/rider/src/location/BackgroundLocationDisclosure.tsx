// Google Play "prominent disclosure" for background location. It must appear
// in the app, before the OS permission prompt, and say what is collected,
// that collection continues while the app is closed or not in use, and why.
// The wording below is the policy-critical part; keep its substance when
// restyling. Rendered by RiderHomeHeader via useBackgroundLocationDisclosure.

import { Location01Icon } from '@hugeicons/core-free-icons';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../components/AppIcon';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme/tokens';
import type { DisclosureAction } from './backgroundDisclosure';

interface Props {
  // 'request' → the next step is the OS prompt; 'open_settings' → the OS
  // won't prompt again, so we send the rider to Settings instead.
  action: Exclude<DisclosureAction, 'none'>;
  busy: boolean;
  onContinue: () => void;
  onDecline: () => void;
}

const POINTS: { title: string; body: string }[] = [
  {
    title: 'What we collect',
    body: 'Your precise location (GPS).',
  },
  {
    title: 'When',
    body: 'Only while you are online, including when the Gloceries Rider app is closed or not in use. It stops as soon as you go offline.',
  },
  {
    title: 'Why',
    body: 'To send you delivery offers near you, assign orders to the closest rider, and show customers and stores where their order is.',
  },
  {
    title: 'Your control',
    body: 'Go offline at any time to stop sharing. You can change this permission in your phone settings whenever you like.',
  },
];

export function BackgroundLocationDisclosure({ action, busy, onContinue, onDecline }: Props) {
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onDecline}>
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <ScrollView contentContainerClassName="px-6 pt-10 pb-6">
          <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: colors.limeSoft }}>
            <AppIcon icon={Location01Icon} size={30} color={colors.limeDeep} />
          </View>

          <Text className="mt-6 text-[26px] font-bold leading-8 text-ink">Allow location while you&apos;re online</Text>
          <Text className="mt-3 text-[15px] leading-6 text-ink/70">
            Gloceries Rider collects your location data to enable delivery offers and live order tracking,{' '}
            <Text className="font-semibold text-ink">even when the app is closed or not in use</Text>, for as long as you are online.
          </Text>

          <View className="mt-6 gap-4">
            {POINTS.map((point) => (
              <View key={point.title} className="rounded-2xl bg-mist px-4 py-3">
                <Text className="text-[14px] font-semibold text-ink">{point.title}</Text>
                <Text className="mt-1 text-[14px] leading-5 text-ink/70">{point.body}</Text>
              </View>
            ))}
          </View>

          <Text className="mt-6 text-[13px] leading-5 text-ink/55">
            {action === 'request'
              ? 'On the next screen, choose "Allow all the time".'
              : 'Location is currently limited to "While using the app". In Settings, open Permissions → Location and choose "Allow all the time".'}
          </Text>
        </ScrollView>

        <View className="gap-3 px-6 pb-4">
          <PrimaryButton label={action === 'request' ? 'Continue' : 'Open settings'} onPress={onContinue} loading={busy} />
          <Pressable onPress={onDecline} disabled={busy} accessibilityRole="button" className="h-[48px] items-center justify-center">
            <Text className="text-[15px] font-semibold text-ink/60">Not now</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

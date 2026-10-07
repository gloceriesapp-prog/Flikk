// Payout details saved — a brief celebration, then it drops the rider into the
// app shell on its own: no button. After the tick animation plays we wait a
// beat and flip payoutConfigured (which is all RootNavigator needs to swap
// surfaces). The tick is a muted mp4 (expo-video), not the static
// CheckmarkCircle02Icon — carries its own artwork, so no coloured circle.

import { useEffect } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const TICK_VIDEO =
  'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/Success%20Tick.mp4';

// How long the rider sits on "You're all set!" before we redirect. Long
// enough for the tick to play + register, short enough to feel snappy.
const REDIRECT_DELAY_MS = 2500;

export function PayoutSuccessScreen({ onContinue }: { onContinue: () => void }) {
  const player = useVideoPlayer(TICK_VIDEO, (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  // Auto-advance to the app shell after the celebration. Cleared on unmount
  // so a fast unmount can't fire onContinue against a gone screen.
  useEffect(() => {
    const t = setTimeout(onContinue, REDIRECT_DELAY_MS);
    return () => clearTimeout(t);
  }, [onContinue]);

  return (
    <View className="flex-1 bg-white px-6 pb-safe-offset-4 pt-safe-offset-8">
      <StatusBar style="dark" />
      <View className="flex-1 items-center justify-center gap-1">
        <VideoView
          player={player}
          style={{ height: 120, width: 120 }}
          contentFit="contain"
          nativeControls={false}
        />
        <View className="items-center gap-2">
          <Text className="text-3xl font-medium tracking-tight text-ink">You&rsquo;re all set!</Text>
          <Text className="text-center text-[16px] font-medium leading-[22px] text-ink/55">
            Your payout details are saved. We pay every Monday and confirm the name on your account with your first payout.
          </Text>
        </View>
      </View>
    </View>
  );
}

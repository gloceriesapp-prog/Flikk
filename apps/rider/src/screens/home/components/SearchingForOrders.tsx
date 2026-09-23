// Active-tab empty state — a looping "searching" illustration shown while the
// rider is online but has no active order in hand. Same expo-video recipe as
// PayoutSuccessScreen, only looped: it plays as long as this component is
// mounted, and HomeScreen unmounts it the moment an active order card appears
// (the lists branch replaces the empty branch), so the loop naturally stops
// when there's a real order to show.

import { useVideoPlayer, VideoView } from 'expo-video';
import { Text, View } from 'react-native';

const SEARCHING_VIDEO =
  'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/Searching%20Shipping%20Address.mp4';

export function SearchingForOrders() {
  const player = useVideoPlayer(SEARCHING_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View className="items-center gap-1 py-6">
      <VideoView
        player={player}
        style={{ height: 180, width: 180 }}
        contentFit="contain"
        nativeControls={false}
      />
      <Text className="text-center text-lg font-semibold tracking-tight text-ink">
        Finding nearby orders
      </Text>
      <Text className="text-center text-[14px] leading-5 text-ink/50 font-medium">
        Hold tight! New delivery requests will pop up right here automatically.
      </Text>
    </View>
  );
}

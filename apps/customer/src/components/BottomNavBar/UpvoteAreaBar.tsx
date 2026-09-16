// Replaces BottomNavBar entirely (same fixed bottom position) when the
// user has no real store within delivery range (HomeScreen.tsx's own
// isServiceable, from useNearestStore.ts's server-side 12km cutoff) — the
// four tabs it'd otherwise show (Home/Categories/Store/Order Again) all
// assume a browsable nearby store, which doesn't exist here. A single
// centered black pill instead: upvote to say "bring Flikk here."
//
// No backend endpoint for area upvotes exists yet — this is local-only UI
// feedback (tap -> pill swaps to a thank-you state), not a persisted vote.
// Wire to a real endpoint once one exists; nothing else here should need
// to change when it does.

import { useState } from 'react';
import { CheckmarkCircle02Icon, ThumbsUpIcon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../AppIcon';

export function UpvoteAreaBar() {
  const insets = useSafeAreaInsets();
  const [voted, setVoted] = useState(false);

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + 4 }}
      className="items-center"
    >
      <Pressable
        onPress={() => setVoted(true)}
        disabled={voted}
        className="flex-row items-center gap-2 rounded-full bg-ink px-6 py-5 shadow-lg shadow-black/20"
      >
        <AppIcon icon={voted ? CheckmarkCircle02Icon : ThumbsUpIcon} size={18} color="#FFFFFF" />
        <Text className="text-[14px] font-medium text-white">
          {voted ? "Thanks! We'll get to you soon" : 'Upvote, bring Gloceries app to your area'}
        </Text>
      </Pressable>
    </View>
  );
}

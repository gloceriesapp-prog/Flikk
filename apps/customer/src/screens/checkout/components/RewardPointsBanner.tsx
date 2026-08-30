// Sits directly under CheckoutHeader, edge-to-edge — a soft green wash
// (not a hard-bordered card) so it reads as a friendly nudge rather than
// another list item competing with the payment options below it. Points
// math: 1 point per ₹10 spent, same ratio the old footer used to show —
// no real loyalty backend exists yet (out of MVP scope, CLAUDE.md), this
// is purely a "you're getting something back" cue at the moment someone's
// about to pay.

import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

interface Props {
  totalPrice: number;
}

export function RewardPointsBanner({ totalPrice }: Props) {
  const points = Math.max(1, Math.round(totalPrice / 10));

  return (
    <LinearGradient
      colors={['#FFFFFF', '#EAF6DA', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ width: '100%' }}
      className="items-center py-3"
    >
      <Text className="text-center text-[13px] font-medium text-ink/70">
        🎉 Congrats! You're earning <Text className="font-bold text-[#4C7A16]">{points} points</Text>
      </Text>
    </LinearGradient>
  );
}

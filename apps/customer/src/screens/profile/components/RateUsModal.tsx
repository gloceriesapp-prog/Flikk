// "Rate us" — real interaction, not a static row: 5 tappable stars, each
// with its own spring-bounce + haptic pop on tap, then branches on the
// score exactly like Zomato/Swiggy's own rating gate: 4-5 stars hands off
// to the OS's native App Store/Play Store review sheet (expo-store-review
// — the actual mechanism that produces real public store ratings, not a
// custom form pretending to be one); 1-3 stars just says thanks and closes
// — never funnels a low score toward the public store listing, same
// pattern every major app uses. No backend/local persistence of the score
// itself (no ratings table exists, and this isn't asking to build one) —
// this is the entry point + the interaction, not a feedback-analytics
// pipeline.

import { useState } from 'react';
import { StarIcon } from '@hugeicons/core-free-icons';
import * as Haptics from 'expo-haptics';
import * as StoreReview from 'expo-store-review';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const STAR_INDICES = [1, 2, 3, 4, 5];

function Star({ filled, onPress, bounce }: { filled: boolean; onPress: () => void; bounce: ReturnType<typeof useSharedValue<number>> }) {
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: bounce.value }] }));
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Animated.View style={animatedStyle}>
        <AppIcon
          icon={StarIcon}
          size={38}
          color={filled ? colors.gold : `${colors.ink}33`}
          fill={filled ? colors.gold : undefined}
          strokeWidth={filled ? 0 : 1.6}
        />
      </Animated.View>
    </Pressable>
  );
}

export function RateUsModal({ visible, onClose }: Props) {
  const [rating, setRating] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // One shared scale value per star — indices below map 1:1 to STAR_INDICES.
  const bounce1 = useSharedValue(1);
  const bounce2 = useSharedValue(1);
  const bounce3 = useSharedValue(1);
  const bounce4 = useSharedValue(1);
  const bounce5 = useSharedValue(1);
  const bounces = [bounce1, bounce2, bounce3, bounce4, bounce5];

  function reset() {
    setRating(0);
    setHasSubmitted(false);
  }

  function handleDismiss() {
    onClose();
    reset();
  }

  async function handleSelect(score: number) {
    setRating(score);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Every star up to and including the tapped one pops — reads as one
    // continuous "fill up" gesture instead of only the last star reacting.
    bounces.forEach((bounce, i) => {
      if (i < score) bounce.value = withSequence(withSpring(1.35, { damping: 6 }), withSpring(1, { damping: 8 }));
    });

    setTimeout(async () => {
      setHasSubmitted(true);
      if (score >= 4 && (await StoreReview.isAvailableAsync())) {
        void StoreReview.requestReview();
      }
      setTimeout(() => {
        onClose();
        reset();
      }, 1400);
    }, 350);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="items-center rounded-t-[32px] bg-white px-6 pb-safe pt-7">
          {!hasSubmitted ? (
            <>
              <Text className="text-[19px] font-bold text-ink">Enjoying Gloceries?</Text>
              <Text className="mt-1 text-center text-[13px] font-normal text-ink/50">Tap a star to rate your experience</Text>

              <View className="mt-6 flex-row gap-2 pb-2">
                {STAR_INDICES.map((score, i) => (
                  <Star key={score} filled={score <= rating} onPress={() => handleSelect(score)} bounce={bounces[i]} />
                ))}
              </View>
            </>
          ) : (
            <View className="items-center py-4">
              <Text className="text-[19px] font-bold text-ink">
                {rating >= 4 ? 'Thank you! 🎉' : 'Thanks for the feedback'}
              </Text>
              <Text className="mt-1 text-center text-[13px] font-normal text-ink/50">
                {rating >= 4 ? "We're so glad you're loving Gloceries." : "We'll use this to keep improving."}
              </Text>
            </View>
          )}

          {!hasSubmitted && (
            <Pressable onPress={handleDismiss} hitSlop={8} className="mt-5 pb-2">
              <Text className="text-[14px] font-normal text-ink/40">Maybe later</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

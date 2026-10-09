import { useEffect, useRef, useState } from 'react';
import { StarIcon } from '@hugeicons/core-free-icons';
import * as Haptics from 'expo-haptics';
import * as StoreReview from 'expo-store-review';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { useAuthStore } from '../../../store/useAuthStore';
import { apiRequest } from '../../../api/client';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const STAR_INDICES = [1, 2, 3, 4, 5];

function Star({ filled, onPress, bounce }: { filled: boolean; onPress: () => void; bounce: ReturnType<typeof useSharedValue<number>> }) {
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: bounce.value }] }));
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={filled ? "Selected star" : "Rate star"} onPress={onPress} hitSlop={6}>
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
  const sessionEpoch = useAuthStore(state => state.sessionEpoch);
  // Each visible account session starts with fresh feedback state. Closing
  // unmounts the body and invalidates pending acknowledgements.
  return visible ? <RateUsContent key={sessionEpoch} onClose={onClose} /> : null;
}

function RateUsContent({ onClose }: Omit<Props, 'visible'>) {
  const [rating, setRating] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const current = generation.current;
    return () => { generation.current = current + 1; };
  }, []);

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
    generation.current++;
    sending.current = false;
    onClose();
    reset();
  }

  async function handleSelect(score: number) {
    if (sending.current) return;
    setRating(score);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Every star up to and including the tapped one pops — reads as one
    // continuous "fill up" gesture instead of only the last star reacting.
    bounces.forEach((bounce, i) => {
      if (i < score) bounce.value = withSequence(withSpring(1.35, { damping: 6 }), withSpring(1, { damping: 8 }));
    });

    sending.current = true;
    setError(null);
    const current = generation.current;
    try {
      await apiRequest('/reviews/app', { method: 'POST', body: { rating: score } });
      if (current !== generation.current) return;
      setHasSubmitted(true);
    } catch { if (current === generation.current) setError('Could not save your rating. Tap a star to retry.'); }
    finally { if (current === generation.current) sending.current = false; }

  }

  async function handleStoreReview() {
    const current = generation.current;
    try {
      if (!await StoreReview.isAvailableAsync()) {
        if (current === generation.current) setError('Store reviews are unavailable right now.');
        return;
      }
      if (current === generation.current) await StoreReview.requestReview();
    } catch {
      if (current === generation.current) setError('Store reviews are unavailable right now.');
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={handleDismiss}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="items-center rounded-t-[32px] bg-white px-6 pb-safe pt-7">
          {!hasSubmitted ? (
            <>
              <Text className="text-[19px] font-bold text-ink">Enjoying Gloceries?</Text>
              <Text className="mt-1 text-center text-[13px] font-normal text-ink/50">Tap a star to rate your experience</Text>

              {!!error && <Text className="mt-2 text-center text-red-600">{error}</Text>}
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

          {hasSubmitted && <><Pressable className="mt-3" onPress={() => void handleStoreReview()}><Text className="text-sm font-semibold text-blue-600">Review us on the app store</Text></Pressable><Pressable className="py-4" onPress={handleDismiss}><Text>Done</Text></Pressable>{!!error && <Text className="text-red-600">{error}</Text>}</>}
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

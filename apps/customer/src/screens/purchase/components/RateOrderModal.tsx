// Real submission behind OrderRow's "Rate your order" prompt — previously
// decorative only (that component's own updated note). One review per
// delivered order (POST /reviews, backend/src/routes/reviews.ts) —
// 1-5 stars, an optional comment.

import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { StarIcon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { submitReview } from '../../../api/reviews';

interface Props {
  visible: boolean;
  orderId: string;
  storeName: string;
  onClose: () => void;
  onSubmitted: (rating: number) => void;
}

export function RateOrderModal({ visible, orderId, storeName, onClose, onSubmitted }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setRating(0);
    setComment('');
    setError(null);
  }

  async function handleSubmit() {
    if (rating === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await submitReview(orderId, rating, comment.trim() || undefined);
      onSubmitted(rating);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your rating.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 px-6">
        <View className="w-full gap-4 rounded-3xl bg-white p-6">
          <View>
            <Text className="text-lg font-bold text-ink">Rate your order</Text>
            <Text className="mt-0.5 text-sm text-ink/50">How was your experience with {storeName}?</Text>
          </View>

          <View className="flex-row justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable accessibilityRole="button" accessibilityLabel={`Rate ${value} out of 5`} key={value} onPress={() => setRating(value)} hitSlop={8}>
                <AppIcon
                  icon={StarIcon}
                  size={32}
                  color={colors.gold}
                  fill={value <= rating ? colors.gold : 'transparent'}
                  strokeWidth={1.5}
                />
              </Pressable>
            ))}
          </View>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Add a comment (optional)"
            placeholderTextColor={`${colors.ink}55`}
            multiline
            className="min-h-[80px] rounded-2xl bg-[#F5F5F5] px-4 py-3 text-sm text-ink"
            textAlignVertical="top"
          />

          {error && <Text className="text-sm text-danger">{error}</Text>}

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => {
                reset();
                onClose();
              }}
              className="flex-1 items-center rounded-full border border-ink/10 py-3.5"
            >
              <Text className="text-sm font-semibold text-ink">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              className="flex-1 items-center rounded-full bg-ink py-3.5 disabled:opacity-40"
            >
              <Text className="text-sm font-semibold text-white">{isSubmitting ? 'Submitting…' : 'Submit'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

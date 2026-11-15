import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { IconlyDeliveryBox } from '../../../components/icons/IconlyDeliveryBox';
import { useOrderRating } from '../../../features/order-rating/useOrderRating';
import { OrderRatingStars } from './OrderRatingStars';

interface Props {
  orderId: string;
  storeName: string;
  onClose: () => void;
}

export function RateOrderModal({ orderId, storeName, onClose }: Props) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const rating = useOrderRating(orderId, true);
  if (!rating.visible) return null;

  function dismiss() {
    if (!rating.isSaving) onClose();
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={dismiss}>
      <KeyboardAvoidingView
        className="flex-1 justify-center bg-black/40 px-5"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="max-h-[85%] w-full max-w-[420px] self-center rounded-[28px] bg-white" accessibilityViewIsModal>
          <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 p-6">
            <View className="items-center">
              <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF3FF]">
                <IconlyDeliveryBox size={26} color="#155DFC" active />
              </View>
              <Text accessibilityRole="header" className="text-center text-[23px] font-bold tracking-tight text-ink">
                How was your delivery?
              </Text>
              <Text className="mt-1.5 text-center text-sm leading-5 text-ink/65">
                Rate your order from {storeName}.
              </Text>
            </View>

            <OrderRatingStars rating={score} onChange={setScore} disabled={rating.isSaving} />

            <TextInput
              value={comment}
              onChangeText={setComment}
              accessibilityLabel="Add an optional comment"
              placeholder="Add a comment (optional)"
              placeholderTextColor="#68707B"
              editable={!rating.isSaving}
              maxLength={2000}
              multiline
              className="min-h-[72px] rounded-2xl bg-[#F3F4F6] px-3.5 py-3 text-sm text-ink"
              textAlignVertical="top"
            />

            {rating.error && <Text accessibilityRole="alert" className="text-sm text-danger">{rating.error}</Text>}

            <View className="flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                onPress={dismiss}
                disabled={rating.isSaving}
                className="flex-1 items-center rounded-2xl bg-[#F3F4F6] px-2 py-3.5"
              >
                <Text className="text-center text-sm font-semibold text-ink">Later</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void rating.rate(score, comment.trim())}
                disabled={score === 0 || rating.isSaving}
                className="flex-1 items-center rounded-2xl bg-primary px-2 py-3.5 disabled:opacity-40"
              >
                <Text className="text-center text-sm font-semibold text-white">{rating.isSaving ? 'Sending…' : 'Submit rating'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

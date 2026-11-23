// Bottom sheet for "Request product": the shopper types what they could not
// find and submits it to POST /product-requests (admin → Product requests).

import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { apiRequest, ApiError } from '../../../api/client';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

const MAX = 500;

export function RequestProductSheet({ visible, onClose, city, storeName }: {
  visible: boolean;
  onClose: () => void;
  city?: string;
  storeName?: string;
}) {
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = message.trim().length >= 3 && state === 'idle';

  async function submit() {
    if (!canSubmit) return;
    setState('sending');
    setError(null);
    try {
      await apiRequest('/product-requests', { method: 'POST', auth: false, body: { message: message.trim(), city, storeName } });
      setState('sent');
    } catch (err) {
      setState('idle');
      setError(err instanceof ApiError ? err.message : 'Could not send your request. Please try again.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <Pressable className="flex-1 justify-end bg-black/45" onPress={onClose} accessibilityLabel="Close">
          <Pressable className="rounded-t-[28px] bg-white px-5 pb-safe pt-3" onPress={(event) => event.stopPropagation()}>
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-[#E3E6EB]" />
            {state === 'sent' ? (
              <View className="items-center pb-6 pt-2">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-[#EEF3FF]">
                  <AppIcon icon={CheckmarkCircle02Icon} size={34} color={colors.primary} />
                </View>
                <Text className="mt-4 text-[20px] font-bold text-ink">Request sent</Text>
                <Text className="mt-1.5 text-center text-[14px] leading-5 text-ink/65">Thanks! We’ll ask the stores near you to stock it.</Text>
                <Pressable accessibilityRole="button" onPress={onClose} className="mt-6 h-[52px] w-full items-center justify-center rounded-2xl bg-[#155DFC] active:opacity-80">
                  <Text className="text-[16px] font-bold text-white">Done</Text>
                </Pressable>
              </View>
            ) : (
              <View className="pb-4">
                <Text accessibilityRole="header" className="text-[20px] font-bold text-ink">Request a product</Text>
                <Text className="mt-1 text-[14px] leading-5 text-ink/65">Tell us what you were looking for — name, brand and size help.</Text>
                <View className="mt-4 rounded-2xl border border-[#E3E6EB] bg-[#F7F8FA] px-4 pb-2 pt-3">
                  <TextInput
                    value={message}
                    onChangeText={(text) => { setMessage(text); setError(null); }}
                    placeholder="e.g. Amul Gold milk 1 L"
                    placeholderTextColor="#9AA1AC"
                    multiline
                    maxLength={MAX}
                    autoFocus
                    textAlignVertical="top"
                    accessibilityLabel="Product you want"
                    className="min-h-[96px] text-[16px] leading-[22px] text-ink"
                  />
                  <Text className="self-end text-[12px] text-ink/45">{message.length}/{MAX}</Text>
                </View>
                {error && <Text className="mt-2 text-[13px] font-medium text-[#D64545]">{error}</Text>}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canSubmit }}
                  disabled={!canSubmit}
                  onPress={() => void submit()}
                  className={`mt-5 h-[52px] items-center justify-center rounded-2xl ${canSubmit || state === 'sending' ? 'bg-[#155DFC]' : 'bg-[#155DFC]/40'} active:opacity-80`}
                >
                  {state === 'sending' ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-[16px] font-bold text-white">Submit request</Text>}
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

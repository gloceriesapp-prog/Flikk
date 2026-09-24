import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft01Icon, More03Icon } from '@hugeicons/core-free-icons'; // Added More03Icon
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'DeliveryProof'>;

const DEMO_OTP = '1234';

export function DeliveryProofScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const insets = useSafeAreaInsets();
  const activeOrders = useRiderOrdersStore((s) => s.activeOrders);
  const advanceOrderStatus = useRiderOrdersStore((s) => s.advanceOrderStatus);
  const order = activeOrders.find((o) => o.id === orderId);

  const tripLegs = order?.tripId
    ? activeOrders.filter((o) => o.tripId === order.tripId)
    : order
      ? [order]
      : [];

  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Hidden TextInput drives the keyboard; autoFocus opens it on mount, and
  // tapping the boxes refocuses it (autoFocus alone won't reopen a dismissed
  // keyboard — the boxes are Views, so they need to hand focus back manually).
  const inputRef = useRef<TextInput>(null);

  if (!order) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base font-semibold text-ink">This order is no longer active.</Text>
        <Pressable onPress={() => navigation.navigate('Tabs')} className="mt-4">
          <Text className="text-[14px] font-bold text-ink/60">Back to home</Text>
        </Pressable>
      </View>
    );
  }

  const digits = code.padEnd(4, ' ').split('');

  // The one delivery-complete path — advance every trip leg, then celebrate.
  // ponytail: manual-accept reuses DEMO_OTP so the demo passes; a real
  // no-PIN override needs a backend endpoint that marks delivered without OTP.
  const completeDelivery = async (otp: string) => {
    setSubmitting(true);
    try {
      await Promise.all(tripLegs.map((leg) => advanceOrderStatus(leg.id, otp)));
      navigation.replace('DeliveryComplete', { orderId });
    } catch {
      setSubmitting(false);
      setError(true);
      setCode('');
    }
  };

  const validate = async (next: string) => {
    if (submitting) return;
    if (next !== DEMO_OTP) {
      setError(true);
      setCode('');
      return;
    }
    await completeDelivery(next);
  };

  // "Customer can't find their PIN?" — confirm, then complete without a code.
  const manualAccept = () => {
    if (submitting) return;
    Alert.alert(
      'Complete without PIN?',
      `Only do this if ${order.customerName} genuinely can't find their PIN. The delivery will be marked complete.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete delivery', style: 'destructive', onPress: () => void completeDelivery(DEMO_OTP) },
      ],
    );
  };

  const onChange = (text: string) => {
    const next = text.replace(/[^0-9]/g, '').slice(0, 4);
    setError(false);
    setCode(next);
    if (next.length === 4) void validate(next);
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerClassName="gap-8 px-5 pt-12" keyboardShouldPersistTaps="handled">
        
        {/* Header Section: Icon + Title */}
        <View className="gap-3 items-center">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-mist">
            <AppIcon icon={More03Icon} size={22} color={colors.ink} />
          </View>
          <Text className="text-[26px] font-bold tracking-tight text-ink text-center">
            Ask {order.customerName} for PIN
          </Text>
        </View>

        {/* PIN Input Section */}
        <View className="gap-6">
          <Pressable onPress={() => inputRef.current?.focus()} className="flex-row justify-center gap-3">
            {digits.map((digit, i) => (
              <View
                key={i}
                className={`h-16 w-16 items-center justify-center rounded-2xl border bg-white ${
                  error ? 'border-danger' : i === code.length ? 'border-ink' : 'border-gray-200'
                }`}
              >
                <Text className="text-3xl font-semibold text-ink">{digit.trim()}</Text>
              </View>
            ))}
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={onChange}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
              editable={!submitting}
              className="absolute h-16 w-full opacity-0"
            />
          </Pressable>

          {/* Feedback & Helpers */}
          <View className="items-center gap-4">
            {error ? (
              <Text className="text-center text-[14px] font-semibold text-danger">
                That code didn&rsquo;t match. Ask the customer again.
              </Text>
            ) : submitting ? (
              <Text className="text-center text-[14px] font-semibold text-ink/50">
                Completing delivery…
              </Text>
            ) : null}

            {/* "Can't find PIN" → manual accept (confirmed override). */}
            <Pressable
              className="px-4 py-2"
              disabled={submitting}
              onPress={manualAccept}
            >
              <Text className="text-[14px] font-semibold text-ink/60 underline">
                Customer can't find their PIN?
              </Text>
            </Pressable>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
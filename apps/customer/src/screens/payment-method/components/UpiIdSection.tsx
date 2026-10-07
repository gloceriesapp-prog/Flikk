// "Pay with UPI ID": live format check → Verify (POST /payments/upi/validate)
// → registered name shown → only a verified ID can be selected. The ID is
// sent only to our backend; "remember" is device-only and opt-in.
import { useReducer, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { validateVpa } from '../../../api/payments';
import { colors, minTouchTarget } from '../../../theme/tokens';
import { canPayWithVpa, initialVpaState, isVpaFormatValid, vpaReducer } from '../../../payments/vpa';

interface Props {
  initialVpa?: string;
  rememberedByDefault: boolean;
  selected: boolean;
  onUse: (vpa: string, remember: boolean) => void;
}

export function UpiIdSection({ initialVpa, rememberedByDefault, selected, onUse }: Props) {
  const [state, dispatch] = useReducer(vpaReducer, initialVpaState(initialVpa ?? ''));
  // Props are read once: the screen mounts this only after SecureStore loaded.
  const [remember, setRemember] = useState(rememberedByDefault);

  const formatOk = isVpaFormatValid(state.vpa);
  async function verify() {
    if (state.status === 'verifying' || !formatOk) { dispatch({ type: 'verify' }); return; }
    dispatch({ type: 'verify' });
    const vpa = state.vpa.trim().toLowerCase();
    try {
      const result = await validateVpa(vpa);
      dispatch({ type: 'result', vpa, valid: result.valid, name: result.name });
    } catch (err) {
      dispatch({ type: 'error', vpa, message: err instanceof Error ? err.message : 'Could not verify this UPI ID. Try again.' });
    }
  }

  return (
    <View>
      <Text className="mb-2 px-1 text-[17px] font-semibold text-ink/90">Pay with UPI ID</Text>
      <View className="gap-3 bg-white p-4" style={{ borderRadius: 12 }}>
        <View className="flex-row items-center gap-2">
          <TextInput
            value={state.vpa}
            onChangeText={(vpa) => dispatch({ type: 'edit', vpa })}
            onSubmitEditing={() => void verify()}
            placeholder="yourname@bank"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="none"
            accessibilityLabel="UPI ID"
            accessibilityHint="Enter your UPI ID, then verify it"
            className="flex-1 rounded-xl border border-gray-200 px-3 text-[15px] text-ink"
            style={{ minHeight: minTouchTarget }}
          />
          <Pressable
            onPress={() => void verify()}
            disabled={state.status === 'verifying' || state.status === 'verified' || !formatOk}
            accessibilityRole="button"
            accessibilityLabel="Verify UPI ID"
            accessibilityState={{ disabled: state.status === 'verifying' || state.status === 'verified' || !formatOk, busy: state.status === 'verifying' }}
            className="items-center justify-center rounded-xl border border-ink/15 px-4"
            style={{ minHeight: minTouchTarget, minWidth: 80, opacity: formatOk && state.status !== 'verified' ? 1 : 0.5 }}
          >
            {state.status === 'verifying' ? <ActivityIndicator color={colors.ink} /> : <Text className="text-[14px] font-semibold text-ink">{state.status === 'verified' ? 'Verified' : 'Verify'}</Text>}
          </Pressable>
        </View>

        {state.vpa.length > 0 && !formatOk && state.status === 'editing' ? (
          <Text className="text-[12.5px] font-medium text-ink/55">Format: name@bank (for example, ravi@okaxis)</Text>
        ) : null}
        {state.status === 'invalid' ? (
          <Text accessibilityLiveRegion="polite" className="text-[13px] font-medium" style={{ color: colors.danger }}>{state.error}</Text>
        ) : null}
        {canPayWithVpa(state) ? (
          <Text accessibilityLiveRegion="polite" className="text-[13px] font-medium" style={{ color: colors.success }}>
            {state.name ? `Paying to ${state.name}` : 'UPI ID verified'}
          </Text>
        ) : null}

        <View className="flex-row items-center justify-between" style={{ minHeight: minTouchTarget }}>
          <Text className="flex-1 text-[13.5px] font-medium text-ink/70">Remember this UPI ID on this device</Text>
          <Switch value={remember} onValueChange={setRemember} accessibilityLabel="Remember this UPI ID on this device"
            trackColor={{ true: colors.limeDeep, false: '#D1D5DB' }} />
        </View>

        <Pressable
          onPress={() => { if (canPayWithVpa(state)) onUse(state.vpa, remember); }}
          disabled={!canPayWithVpa(state)}
          accessibilityRole="button"
          accessibilityLabel="Use this UPI ID"
          accessibilityState={{ disabled: !canPayWithVpa(state), selected }}
          className="items-center justify-center rounded-xl bg-coral"
          style={{ minHeight: minTouchTarget, opacity: canPayWithVpa(state) ? 1 : 0.45 }}
        >
          <Text className="text-[15px] font-bold text-ink">Use this UPI ID</Text>
        </Pressable>
      </View>
    </View>
  );
}

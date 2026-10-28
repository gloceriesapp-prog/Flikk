import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { fetchPaymentContact, savePaymentContact } from '../api/payments';
import { useAuthStore } from '../store/useAuthStore';

// The real receipt email is separate from the synthetic identity used by OTP
// sign-in. Ask before order creation; never invent a provider contact address.
export function usePaymentReceiptEmail() {
  const [epoch] = useState(() => useAuthStore.getState().sessionEpoch);
  const sessionEpoch = useAuthStore(state => state.sessionEpoch);
  const mounted = useRef(true);
  const pending = useRef<((value: string | null) => void) | null>(null);
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const stillOwner = () => mounted.current && useAuthStore.getState().sessionEpoch === epoch;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; pending.current?.(null); pending.current = null; }; }, []);
  useEffect(() => {
    if (sessionEpoch !== epoch) { pending.current?.(null); pending.current = null; }
  }, [epoch, sessionEpoch]);
  function finish(value: string | null) {
    const resolve = pending.current; pending.current = null;
    setVisible(false); setEmail(''); resolve?.(value);
  }
  async function requestEmail(): Promise<string | null> {
    const contact = await fetchPaymentContact();
    if (!stillOwner()) return null;
    if (contact.email) return contact.email;
    setEmail(''); setError(''); setVisible(true);
    return new Promise(resolve => { pending.current = resolve; });
  }
  const normalized = email.trim().toLowerCase();
  const valid = normalized.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    && !/^login\+.*@gloceries\.com$/i.test(normalized);
  async function save() {
    if (saving || !valid || !stillOwner()) return;
    setSaving(true); setError('');
    try {
      const contact = await savePaymentContact(normalized);
      if (stillOwner()) finish(contact.email);
    } catch { if (stillOwner()) setError('Could not save your email. Please try again.'); }
    finally { if (stillOwner()) setSaving(false); }
  }
  const emailForm = <Modal visible={visible && sessionEpoch === epoch} transparent animationType="fade" onRequestClose={() => { if (!saving) finish(null); }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-center bg-black/40 px-5">
      <View className="w-full max-w-[480px] self-center rounded-3xl bg-white p-6">
        <Text accessibilityRole="header" className="text-[21px] font-semibold text-ink">Email for your receipt</Text>
        <Text className="mb-5 mt-2 text-[14px] leading-5 text-ink/60">Enter your email to continue with UPI. It is used for payment receipts and shared with our payment provider.</Text>
        <TextInput accessibilityLabel="Payment receipt email" value={sessionEpoch === epoch ? email : ''} onChangeText={setEmail} autoFocus
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress"
          placeholder="Your email address" maxLength={254} editable={!saving} returnKeyType="done" onSubmitEditing={() => void save()}
          className="rounded-2xl border border-black/20 px-4 py-3.5 text-[16px] text-ink" />
        {!!error && <Text accessibilityLiveRegion="polite" className="mt-3 text-sm text-red-600">{error}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel="Save receipt email and continue" disabled={!valid || saving}
          onPress={() => void save()} className="mt-5 min-h-12 items-center justify-center rounded-2xl bg-primary py-3.5" style={{ opacity: valid && !saving ? 1 : 0.45 }}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-[16px] font-semibold text-white">Continue</Text>}
        </Pressable>
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => finish(null)} className="mt-2 items-center py-3">
          <Text className="text-[15px] font-medium text-ink/60">Not now</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
  return { requestEmail, emailForm };
}

// Payout destination — UPI or bank account + IFSC, real RazorpayX Fund
// Account Validation either way (POST /partner/verify-payout, see that
// route's own note for the full Contact -> Fund Account -> Validation
// flow). Tapping "Verify" sends a real ~₹1 penny-drop; Razorpay's own
// bank/PSP response comes back with the actual account-holder name, bank
// name, account type, and (for bank account) a masked account number,
// shown in a details card the instant it succeeds — none of it typed or
// guessed.
//
// Two top-level states:
// - Editing: a method toggle (UPI / Bank account) plus that method's own
//   fields, with "Verify" as a pill inside the UPI input's own right edge
//   (the explicit ask) or as its own button below the two bank fields
//   (a pill inside either bank field individually doesn't make sense —
//   both account number AND IFSC are needed before there's anything to
//   verify). While verifying, the button/pill shows a spinner.
// - Locked: whichever method was last verified, shown as plain rows
//   (masked account number + IFSC for bank, the VPA for UPI) plus the
//   real bank name and account holder name, a green "Verified" badge,
//   and a "Change" link (same collapse-with-Change pattern as
//   StoreCategoryPicker) to re-open editing. Locking happens the moment
//   verification succeeds — POST /verify-payout already persists it
//   server-side the instant Razorpay confirms it, so this isn't waiting
//   on the screen's separate "Save changes" button.
//
// Editing again after being locked starts blank, not prefilled with the
// old value — every saved payout destination has gone through a real
// verification; prefilling and letting "Verify" go unpressed again would
// silently reintroduce an unverified value.

import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { ArrowRight01Icon, BankIcon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { verifyPayoutBankAccount, verifyPayoutUpi } from '../../../api/auth';
import { ApiError } from '../../../api/client';
import { useStoreProfileStore } from '../../../store/useStoreProfileStore';
import { SettingsCard } from './SettingsCard';

const ACCENT = '#1754cf';

type Method = 'upi' | 'bank_account';

export function PayoutAccountCard() {
  const profile = useStoreProfileStore((state) => state.profile);
  const setPayoutVerification = useStoreProfileStore((state) => state.setPayoutVerification);

  const [editing, setEditing] = useState(!profile.payoutMethod || !profile.payoutUpiVerifiedName);
  const [method, setMethod] = useState<Method>(profile.payoutMethod === 'bank_account' ? 'bank_account' : 'upi');
  const [vpaInput, setVpaInput] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountHolderName, setAccountHolderName] = useState(profile.ownerName);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canVerifyUpi = vpaInput.trim().length > 0;
  const canVerifyBank = accountNumber.trim().length > 0 && ifsc.trim().length === 11 && accountHolderName.trim().length > 0;

  async function handleVerify() {
    setError(null);
    setVerifying(true);
    try {
      const result =
        method === 'upi'
          ? await verifyPayoutUpi(vpaInput.trim())
          : await verifyPayoutBankAccount(accountNumber.trim(), ifsc.trim().toUpperCase(), accountHolderName.trim());

      setPayoutVerification({
        method: result.method,
        vpa: result.vpa,
        maskedAccountNumber: result.maskedAccountNumber,
        ifsc: result.ifsc,
        verifiedName: result.accountHolderName,
        bankName: result.bankName,
      });
      setEditing(false);
      setVpaInput('');
      setAccountNumber('');
      setIfsc('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not verify this payout account. Please try again.');
    } finally {
      setVerifying(false);
    }
  }

  if (!editing && profile.payoutMethod && profile.payoutUpiVerifiedName) {
    return (
      <SettingsCard icon={BankIcon} title="Payout details">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[13px] font-medium text-ink/40">
              {profile.payoutMethod === 'upi' ? 'UPI ID' : 'Bank account'}
            </Text>
            <View className="mt-0.5 flex-row items-center gap-1.5">
              <Text className="text-[15px] font-semibold text-ink">
                {profile.payoutMethod === 'upi' ? profile.payoutUpiId : `${profile.payoutBankAccountNumber} · ${profile.payoutBankIfsc}`}
              </Text>
              <View className="flex-row items-center gap-1 rounded-full bg-success/10 px-2 py-0.5">
                <AppIcon icon={CheckmarkCircle02Icon} size={11} color={colors.success} />
                <Text className="text-[11px] font-bold text-success">Verified</Text>
              </View>
            </View>
          </View>
          <Pressable onPress={() => setEditing(true)} hitSlop={10}>
            <Text className="text-[13px] font-bold" style={{ color: ACCENT }}>
              Change
            </Text>
          </Pressable>
        </View>

        <View className="gap-2 border-t border-black/5 pt-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] font-medium text-ink/50">Account holder</Text>
            <Text className="text-[13px] font-semibold text-ink">{profile.payoutUpiVerifiedName}</Text>
          </View>
          {profile.payoutBankName && (
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] font-medium text-ink/50">Bank</Text>
              <Text className="text-[13px] font-semibold text-ink">{profile.payoutBankName}</Text>
            </View>
          )}
        </View>

        <Text className="text-[13px] font-medium text-ink/40">
          Your weekly payout (see the Payouts tab) is sent here.
        </Text>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard icon={BankIcon} title="Payout details">
      {/* Method toggle — same segmented-pill convention as OrderStatusFilter. */}
      <View className="flex-row gap-2 rounded-2xl bg-gray-100 p-1">
        {(['upi', 'bank_account'] as const).map((option) => {
          const active = method === option;
          return (
            <Pressable
              key={option}
              onPress={() => {
                setMethod(option);
                setError(null);
              }}
              className="flex-1 items-center rounded-xl py-2"
              style={{ backgroundColor: active ? '#FFFFFF' : 'transparent' }}
            >
              <Text className="text-[13px] font-bold" style={{ color: active ? ACCENT : `${colors.ink}70` }}>
                {option === 'upi' ? 'UPI' : 'Bank account'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {method === 'upi' ? (
        <View className="gap-1.5">
          <Text className="text-[13px] font-medium text-ink/40">UPI ID</Text>
          <View className="flex-row items-center overflow-hidden rounded-2xl border border-black/10 bg-white pr-2">
            <TextInput
              value={vpaInput}
              onChangeText={setVpaInput}
              placeholder="yourname@upi"
              placeholderTextColor="#9AA5A3"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!verifying}
              className="flex-1 px-4 py-3 text-[15px] font-semibold text-ink"
            />
            <VerifyPill onPress={handleVerify} disabled={verifying || !canVerifyUpi} verifying={verifying} />
          </View>
        </View>
      ) : (
        <View className="gap-3">
          <View className="gap-1.5">
            <Text className="text-[13px] font-medium text-ink/40">Account holder name</Text>
            <TextInput
              value={accountHolderName}
              onChangeText={setAccountHolderName}
              placeholder="As it appears on the bank account"
              placeholderTextColor="#9AA5A3"
              editable={!verifying}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] font-semibold text-ink"
            />
          </View>
          <View className="gap-1.5">
            <Text className="text-[13px] font-medium text-ink/40">Account number</Text>
            <TextInput
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="e.g. 765432123456"
              placeholderTextColor="#9AA5A3"
              keyboardType="number-pad"
              editable={!verifying}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] font-semibold text-ink"
            />
          </View>
          <View className="gap-1.5">
            <Text className="text-[13px] font-medium text-ink/40">IFSC code</Text>
            <TextInput
              value={ifsc}
              onChangeText={(text) => setIfsc(text.toUpperCase())}
              placeholder="e.g. HDFC0000053"
              placeholderTextColor="#9AA5A3"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={11}
              editable={!verifying}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] font-semibold text-ink"
            />
          </View>

          <Pressable
            onPress={handleVerify}
            disabled={verifying || !canVerifyBank}
            className="flex-row items-center justify-center gap-1.5 rounded-2xl py-3"
            style={{ backgroundColor: verifying || !canVerifyBank ? '#E5E7EB' : ACCENT }}
          >
            {verifying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text className="text-[14px] font-bold" style={{ color: canVerifyBank ? '#FFFFFF' : '#9AA5A3' }}>
                  Verify
                </Text>
                <AppIcon icon={ArrowRight01Icon} size={14} color={canVerifyBank ? '#FFFFFF' : '#9AA5A3'} />
              </>
            )}
          </Pressable>
        </View>
      )}

      {error && <Text className="text-[13px] font-medium text-danger">{error}</Text>}

      <Text className="text-[13px] font-medium text-ink/40">
        We verify every payout destination with a real ₹1 check before saving it — your weekly payout only ever goes
        to a confirmed account.
      </Text>
    </SettingsCard>
  );
}

function VerifyPill({ onPress, disabled, verifying }: { onPress: () => void; disabled: boolean; verifying: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center gap-1 rounded-full px-3 py-1.5"
      style={{ backgroundColor: disabled && !verifying ? '#E5E7EB' : `${ACCENT}14` }}
    >
      {verifying ? (
        <ActivityIndicator size="small" color={ACCENT} />
      ) : (
        <>
          <Text className="text-[13px] font-bold" style={{ color: disabled ? '#9AA5A3' : ACCENT }}>
            Verify
          </Text>
          <AppIcon icon={ArrowRight01Icon} size={13} color={disabled ? '#9AA5A3' : ACCENT} />
        </>
      )}
    </Pressable>
  );
}

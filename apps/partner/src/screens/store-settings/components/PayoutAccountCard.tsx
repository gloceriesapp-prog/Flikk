// Payout destination — UPI or bank account + IFSC, saved through
// POST /partner/verify-payout. With a payout provider configured the account
// is bank-verified (₹1 check) before saving; while payouts are manual the
// details are saved as typed and shown as "Not verified yet" — the founder
// confirms the account before the first transfer. The badge always reflects
// the server's own `verified` answer, never an assumption.
//
// Two states: Editing (method toggle + that method's fields + Save) and
// Locked (saved details, badge, and a "Change" link). Editing again starts
// blank so an old value can't be re-saved by accident.

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

  const hasSavedDetails = !!profile.payoutMethod && !!(profile.payoutUpiId || profile.payoutBankAccountNumber);
  const [editing, setEditing] = useState(!hasSavedDetails);
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
        verifiedName: result.verified === false ? null : result.accountHolderName,
        accountHolderName: result.accountHolderName,
        bankName: result.bankName,
        verified: result.verified !== false,
      });
      setEditing(false);
      setVpaInput('');
      setAccountNumber('');
      setIfsc('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this payout account. Please try again.');
    } finally {
      setVerifying(false);
    }
  }

  if (!editing && hasSavedDetails) {
    const holderName = profile.payoutUpiVerifiedName ?? profile.payoutAccountHolderName;
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
              {profile.payoutDetailsVerified ? (
                <View className="flex-row items-center gap-1 rounded-full bg-success/10 px-2 py-0.5">
                  <AppIcon icon={CheckmarkCircle02Icon} size={11} color={colors.success} />
                  <Text className="text-[11px] font-semibold text-success">Verified</Text>
                </View>
              ) : (
                <View className="rounded-full bg-gold/15 px-2 py-0.5">
                  <Text className="text-[11px] font-semibold text-ink/70">Not verified yet</Text>
                </View>
              )}
            </View>
          </View>
          <Pressable onPress={() => setEditing(true)} hitSlop={10}>
            <Text className="text-[13px] font-semibold" style={{ color: ACCENT }}>
              Change
            </Text>
          </Pressable>
        </View>

        <View className="gap-2 border-t border-black/5 pt-3">
          {holderName && (
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] font-medium text-ink/50">Account holder</Text>
              <Text className="text-[13px] font-semibold text-ink">{holderName}</Text>
            </View>
          )}
          {profile.payoutBankName && (
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] font-medium text-ink/50">Bank</Text>
              <Text className="text-[13px] font-semibold text-ink">{profile.payoutBankName}</Text>
            </View>
          )}
        </View>

        <Text className="text-[13px] font-medium text-ink/40">
          {profile.payoutDetailsVerified
            ? 'Your weekly payout (see the Payouts tab) is sent here.'
            : 'Your weekly payout (see the Payouts tab) is sent here. Gloceries confirms this account before your first payout.'}
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
              <Text className="text-[13px] font-semibold" style={{ color: active ? ACCENT : `${colors.ink}70` }}>
                {option === 'upi' ? 'UPI' : 'Bank account'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {method === 'upi' ? (
        <View className="gap-1.5">
          <Text className="text-[13px] font-medium text-ink/50">UPI ID</Text>
          <View className="flex-row items-center overflow-hidden rounded-xl border border-black/10 bg-white pr-1.5">
            <TextInput
              value={vpaInput}
              onChangeText={setVpaInput}
              placeholder="yourname@upi"
              placeholderTextColor="#9AA5A3"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!verifying}
              className="flex-1 pl-4 pr-2 py-3 text-[14px] font-medium text-ink"
            />
            <VerifyPill onPress={handleVerify} disabled={verifying || !canVerifyUpi} verifying={verifying} />
          </View>
        </View>
      ) : (
        <View className="gap-3">
          <View className="gap-1.5">
            <Text className="text-[13px] font-medium text-ink/50">Account holder name</Text>
            <TextInput
              value={accountHolderName}
              onChangeText={setAccountHolderName}
              placeholder="As it appears on the bank account"
              placeholderTextColor="#9AA5A3"
              editable={!verifying}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-[14px] font-medium text-ink"
            />
          </View>
          <View className="gap-1.5">
            <Text className="text-[13px] font-medium text-ink/50">Account number</Text>
            <TextInput
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="e.g. 765432123456"
              placeholderTextColor="#9AA5A3"
              keyboardType="number-pad"
              editable={!verifying}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-[14px] font-medium text-ink"
            />
          </View>
          <View className="gap-1.5">
            <Text className="text-[13px] font-medium text-ink/50">IFSC code</Text>
            <TextInput
              value={ifsc}
              onChangeText={(text) => setIfsc(text.toUpperCase())}
              placeholder="e.g. HDFC0000053"
              placeholderTextColor="#9AA5A3"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={11}
              editable={!verifying}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-[14px] font-medium text-ink"
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
                <Text className="text-[14px] font-semibold" style={{ color: canVerifyBank ? '#FFFFFF' : '#9AA5A3' }}>
                  Save
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {error && <Text className="text-[13px] font-medium text-danger">{error}</Text>}

      <Text className="text-[13px] font-medium leading-normal text-ink/50">
        Double-check these details — your weekly payout is sent exactly where you enter. Gloceries confirms the account before your first payout.
      </Text>
    </SettingsCard>
  );
}

function VerifyPill({ onPress, disabled, verifying }: { onPress: () => void; disabled: boolean; verifying: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center gap-1 rounded-lg px-4 py-2.5"
      style={{ backgroundColor: disabled && !verifying ? '#E5E7EB' : `${ACCENT}14` }}
    >
      {verifying ? (
        <ActivityIndicator size="small" color={ACCENT} />
      ) : (
        <>
          <Text className="text-[13px] font-semibold" style={{ color: disabled ? '#9AA5A3' : ACCENT }}>
            Save
          </Text>

        </>
      )}
    </Pressable>
  );
}

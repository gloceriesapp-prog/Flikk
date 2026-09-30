// Invite friends — reached from Profile's own "Invite Friends" row.
// Tracking only, no credit/discount on either side (backend's routes/
// referrals.ts own note: that would be a loyalty/rewards mechanic,
// explicitly out of scope until MVP validates). Two things this screen
// does: show your own code (GET /referrals/my-code, minted on first
// visit) with a real Share sheet, and let you enter a friend's code
// (POST /referrals/redeem) if you haven't already been referred.

import { useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, TextInput, View } from 'react-native';
import { ArrowLeft01Icon, Share08Icon, UserAdd01Icon } from '@hugeicons/core-free-icons';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { fetchMyInvites, fetchMyReferralCode, redeemReferralCode } from '../../api/referrals';
import { ApiError } from '../../api/client';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Referral'>;

export function ReferralScreen({ navigation }: Props) {
  const { data: codeData, isLoading: isCodeLoading } = useQuery({
    queryKey: ['referral-code'],
    queryFn: fetchMyReferralCode,
  });
  const { data: invites } = useQuery({ queryKey: ['referral-invites'], queryFn: fetchMyInvites });
  const queryClient = useQueryClient();

  const [enteredCode, setEnteredCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemedNow, setRedeemedNow] = useState(false);

  async function handleShare() {
    if (!codeData) return;
    await Share.share({
      message: `Try Gloceries — order from local kirana stores near you. Use my invite code ${codeData.code} when you sign up.`,
    });
  }

  async function handleRedeem() {
    if (!enteredCode.trim() || isRedeeming) return;
    setIsRedeeming(true);
    setRedeemError(null);
    try {
      await redeemReferralCode(enteredCode.trim());
      setRedeemedNow(true);
      setEnteredCode('');
      await queryClient.invalidateQueries({ queryKey: ['referral-invites'] });
    } catch (err) {
      setRedeemError(err instanceof ApiError ? err.message : 'Could not redeem this code.');
    } finally {
      setIsRedeeming(false);
    }
  }

  return (
    <View className="flex-1 bg-[#FAFAFA] pt-safe">
      <StatusBar style="dark" />

      <View className="flex-row items-center px-5 pb-2 pt-2">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-ink">Invite Friends</Text>
        <View className="h-11 w-11" />
      </View>

      <View className="gap-4 px-5 pt-4">
        <View className="items-center gap-3 rounded-3xl bg-white px-6 py-8">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-lime-soft">
            <AppIcon icon={UserAdd01Icon} size={24} color={colors.ink} strokeWidth={1.6} />
          </View>
          <Text className="text-center text-base font-semibold text-ink">Share Gloceries with a friend</Text>
          <Text className="text-center text-sm text-ink/50">Send them your invite code below.</Text>

          {isCodeLoading ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <View className="rounded-2xl border border-dashed border-ink/15 bg-[#F5F5F5] px-6 py-3">
              <Text className="text-xl font-bold tracking-[4px] text-ink">{codeData?.code}</Text>
            </View>
          )}

          <Pressable
            onPress={handleShare}
            disabled={!codeData}
            className="mt-2 flex-row items-center gap-2 rounded-full bg-ink px-6 py-3.5 disabled:opacity-40"
          >
            <AppIcon icon={Share08Icon} size={15} color="#fff" />
            <Text className="text-sm font-semibold text-white">Share invite</Text>
          </Pressable>
        </View>

        {invites && invites.length > 0 && (
          <View className="rounded-3xl bg-white px-5 py-4">
            <Text className="text-sm font-semibold text-ink">
              {invites.length} friend{invites.length === 1 ? '' : 's'} joined with your code
            </Text>
          </View>
        )}

        <View className="rounded-3xl bg-white px-5 py-5">
          <Text className="text-sm font-semibold text-ink">Have an invite code?</Text>
          {redeemedNow ? (
            <Text className="mt-2 text-sm font-medium text-success">Code applied — thanks!</Text>
          ) : (
            <>
              <View className="mt-3 flex-row items-center gap-2">
                <TextInput
                  value={enteredCode}
                  onChangeText={(text) => {
                    setEnteredCode(text);
                    setRedeemError(null);
                  }}
                  placeholder="Enter code"
                  placeholderTextColor={`${colors.ink}55`}
                  autoCapitalize="characters"
                  className="flex-1 rounded-full bg-[#F5F5F5] px-4 py-3 text-sm font-medium text-ink"
                />
                <Pressable
                  onPress={handleRedeem}
                  disabled={!enteredCode.trim() || isRedeeming}
                  className="rounded-full bg-ink px-5 py-3 disabled:opacity-40"
                >
                  <Text className="text-sm font-semibold text-white">{isRedeeming ? '…' : 'Apply'}</Text>
                </Pressable>
              </View>
              {redeemError && <Text className="mt-2 text-sm text-danger">{redeemError}</Text>}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

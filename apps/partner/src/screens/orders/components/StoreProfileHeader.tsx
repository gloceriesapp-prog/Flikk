import { ProfileIcon } from '../../../components/PartnerIcons';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { StoreAvatar } from '../../../components/StoreAvatar';
import { storePinPresentation } from '../../../location/storePin';
import { useStoreProfileStore } from '../../../store/useStoreProfileStore';
import { colors } from '../../../theme/tokens';
import type { StoreProfile } from '../data';

interface Props {
  profile: StoreProfile;
  onToggleOpen: () => void;
  onPressLocation: () => void;
  onPressSettings: () => void;
  onPressNotifications: () => void;
}

export function StoreProfileHeader({ profile, onToggleOpen, onPressLocation, onPressSettings }: Props) {
  const location = storePinPresentation(profile);
  const togglingOpen = useStoreProfileStore(state => state.togglingOpen);
  const statusError = useStoreProfileStore(state => state.statusError);
  const setAvailability = useStoreProfileStore(state => state.setAvailability);
  const disabled = !profile.id || profile.adminSuspended || togglingOpen;
  // Always show the approved pickup address, never the owner's device GPS
  // or a proposed pin that customers and riders cannot use yet.
  const address = (profile.addressLine?.trim() || profile.district || 'Address not set').replace(/\s+/g, ' ');
  const pendingReview = profile.pendingChange?.status === 'pending';
  const statusLabel = togglingOpen ? 'Saving…' : profile.adminSuspended ? 'Suspended' : profile.isOpen ? 'Open' : 'Closed';
  const manualUntil = profile.availabilityOverrideUntil
    ? new Date(profile.availabilityOverrideUntil).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }) : null;

  return (
    <View className="pt-safe">
      <View className="gap-3 px-5 pb-4 pt-3">
        <View className="flex-row items-center gap-3">
          <StoreAvatar size={44} />
          <View className="min-w-0 flex-1">
            <Text className="text-[16px] font-semibold leading-[20px] tracking-tight text-ink" numberOfLines={1} ellipsizeMode="tail">
              {profile.storeName}
            </Text>
            <Pressable
              onPress={onPressLocation}
              accessibilityRole="button"
              accessibilityLabel={`Change store location: ${address}`}
              className="justify-center"
              hitSlop={{ top: 4, bottom: 10 }}
            >
              <Text className="text-[12px] font-medium leading-[17px] text-ink/75" numberOfLines={1} ellipsizeMode="tail">
                {address}
              </Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Store open for orders"
            accessibilityValue={{ text: statusLabel }}
            accessibilityState={{ checked: profile.isOpen && !profile.adminSuspended, disabled, busy: togglingOpen }}
            disabled={disabled}
            onPress={() => {
              if (disabled) return;
              void Haptics.selectionAsync().catch(() => {});
              onToggleOpen();
            }}
            className="h-11 shrink-0 flex-row items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-3"
            style={{ opacity: disabled ? 0.6 : 1 }}
          >
            <Text className="text-[13px] font-semibold" style={{ color: profile.isOpen && !profile.adminSuspended ? '#15803D' : '#6B7280' }}>
              {statusLabel}
            </Text>
            <View style={{ width: 36, height: 22, borderRadius: 11, padding: 2, justifyContent: 'center', alignItems: profile.isOpen && !profile.adminSuspended ? 'flex-end' : 'flex-start', backgroundColor: profile.isOpen && !profile.adminSuspended ? '#15803D' : '#D1D5DB' }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF' }} />
            </View>
          </Pressable>
          <Pressable
            onPress={onPressSettings}
            accessibilityRole="button"
            accessibilityLabel="Store settings"
            className="h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white"
          >
            <ProfileIcon size={24} color={colors.ink} />
          </Pressable>
        </View>
        {manualUntil && (
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <Text className="text-[11px] font-medium text-ink/60">Manual until {manualUntil} IST</Text>
            <Pressable onPress={() => void setAvailability('auto')} disabled={disabled} hitSlop={8} accessibilityRole="button" accessibilityLabel="Resume automatic store hours">
              <Text className="text-[11px] font-semibold text-primary">Use store hours</Text>
            </Pressable>
          </View>
        )}

      </View>

      {pendingReview && (
        <View accessibilityRole="alert" className="mx-5 mb-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <Text className="text-[13px] font-medium leading-[18px] text-primary">
            {location.pending ? 'Location update awaiting approval. Customers and riders still use your approved address.' : 'Store updates awaiting approval. Customers still see your approved details.'}
          </Text>
        </View>
      )}
      {statusError && <Text accessibilityRole="alert" className="mx-5 mb-3 text-sm font-medium text-red-700">{statusError}</Text>}
      {profile.adminSuspended && (
        <View className="mx-5 mb-4 rounded-2xl bg-red-50 px-4 py-3">
          <Text className="text-sm font-semibold text-red-700">
            Suspended by Gloceries{profile.suspendedReason ? `: ${profile.suspendedReason}` : ''}
          </Text>
          <Text className="mt-1 text-xs text-red-700/80 font-medium">Your store is closed to customers. Contact Gloceries support to reopen.</Text>
        </View>
      )}
    </View>
  );
}

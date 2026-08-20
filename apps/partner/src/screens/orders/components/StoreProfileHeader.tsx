// Top-of-Home identity row — avatar + store name + location on the left, a
// notification bell on the right. No background of its own — it sits on
// top of the gradient wash painted by ../components/HomeGradientBackdrop.tsx,
// which spans this row and the stat boxes below it as one continuous
// surface. Shows the store's own name, not an owner greeting — this app is
// the store's storefront, not a personal dashboard.

import { Location01Icon, Notification01Icon } from '@hugeicons/core-free-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { getAvatarImageUri } from '../../../theme/placeholderImage';
import type { StoreProfile } from '../data';

interface Props {
  profile: StoreProfile;
  onPressNotifications: () => void;
}

export function StoreProfileHeader({ profile, onPressNotifications }: Props) {
  return (
    <View className="pt-safe">
      <View className="flex-row items-center justify-between px-5 pb-5 pt-3">
        <View className="flex-1 flex-row items-center gap-3">
          <Image
            source={{ uri: getAvatarImageUri(profile.avatarSeed) }}
            className="h-12 w-12 rounded-full border-2 border-white"
          />
          <View className="flex-1">
            <Text className="text-lg font-medium text-ink" numberOfLines={1}>
              {profile.storeName}
            </Text>
            <View className="mt-0.5 flex-row items-center gap-1">
              <AppIcon icon={Location01Icon} size={13} color={`${colors.ink}80`} />
              <Text className="text-xs font-semibold text-ink/60" numberOfLines={1}>
                {profile.location}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={onPressNotifications}
          hitSlop={10}
          className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm shadow-black/10"
        >
          <AppIcon icon={Notification01Icon} size={19} color={colors.ink} />
          {profile.hasUnreadNotifications && (
            <View className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border border-white bg-coral" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

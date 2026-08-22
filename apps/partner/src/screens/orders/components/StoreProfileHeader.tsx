// Top-of-Home identity row — avatar (ringed, not a bare circle — the one
// deliberate "this app has taste" detail on the screen a store owner opens
// every single time), the store's own name as the title, then district +
// Open/Closed status together on one line — a pin, a dot separator, a
// status pill, read left to right instead of stacked. Settings +
// notification bell stay as a pair of white circular buttons on the right.
// Flat white, no gradient backdrop (see OrdersScreen.tsx).
//
// The status pill is a real toggle now, not just a read-out — tapping it
// flips the store between Open/Closed (onToggleOpen), same instant-feel
// contract as the catalog's in-stock switch: a store owner flipping this
// mid-rush needs it to respond immediately, not round-trip to a server
// first. This is the first thing rendered on the screen a store owner
// opens dozens of times a day — worth more polish per pixel than a screen
// they visit once.

import { Location04Icon, Notification01Icon, Settings02Icon } from '@hugeicons/core-free-icons';
import { Image, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { getAvatarImageUri } from '../../../theme/placeholderImage';
import type { StoreProfile } from '../data';

interface Props {
  profile: StoreProfile;
  onToggleOpen: () => void;
  onPressSettings: () => void;
  onPressNotifications: () => void;
}

export function StoreProfileHeader({ profile, onToggleOpen, onPressSettings, onPressNotifications }: Props) {
  return (
    <View className="pt-safe">
      <View className="flex-row items-center justify-between px-5 pb-5 pt-3">
        <View className="flex-1 flex-row items-center gap-3.5">
          <View className="rounded-full p-0.5 shadow-sm shadow-black/5">
            <Image source={{ uri: getAvatarImageUri(profile.avatarSeed) }} className="h-11 w-11 rounded-full" />
          </View>

          <View className="flex-1 gap-0">
            <Text className="text-xl font-medium tracking-tight text-ink" numberOfLines={1}>
              {profile.storeName}
            </Text>

            <View className="flex-row items-center gap-1.5">
              <View className="flex-row items-center gap-1">
                <AppIcon icon={Location04Icon} size={14} color={`${colors.ink}80`} />
                <Text className="text-sm font-medium text-ink/50" numberOfLines={1}>
                  {profile.district}
                </Text>
              </View>


              {/* A real toggle, not just a read-out — tap flips Open/Closed
                  instantly (see file header note). Mirrors stores.is_active. */}
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  onToggleOpen();
                }}
                hitSlop={6}
                className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 shadow-sm shadow-black/5 ${profile.isOpen ? 'border-lime-deep/20 bg-lime-soft' : 'border-black/10 bg-gray-50'
                  }`}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <View
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: profile.isOpen ? colors.limeDeep : `${colors.ink}60` }}
                />
                <Text className={`text-sm font-medium ${profile.isOpen ? 'text-lime-deep' : 'text-ink/50'}`}>
                  {profile.isOpen ? 'Open' : 'Closed'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View className="flex-row items-center gap-2.5">
          {/* No settings screen yet (P6, out of scope until later) —
              stubbed rather than silently doing nothing, same convention
              as the mic icon on apps/customer's HomeSearchBar. */}
          <Pressable
            onPress={onPressSettings}
            hitSlop={10}
            className="h-11 w-11 items-center justify-center rounded-full bg-gray-100"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <AppIcon icon={Settings02Icon} size={19} color={colors.ink} />
          </Pressable>

          <Pressable
            onPress={onPressNotifications}
            hitSlop={10}
            className="h-11 w-11 items-center justify-center rounded-full bg-gray-100"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <AppIcon icon={Notification01Icon} size={19} color={colors.ink} />
            {profile.hasUnreadNotifications && (
              <View className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border border-white bg-lime-deep" />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

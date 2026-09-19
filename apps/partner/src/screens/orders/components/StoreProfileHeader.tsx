// Top-of-Home identity row — avatar (ringed, not a bare circle — the one
// deliberate "this app has taste" detail on the screen a store owner opens
// every single time), the store's own name as the title, then the real
// full address on its own line below it. A real native Switch (Open/
// Closed), Settings, and the notification bell sit as a row of controls
// on the right — the switch to the LEFT of Settings, per an explicit ask.
// Flat white, no gradient backdrop (see OrdersScreen.tsx).
//
// The switch is a real toggle, not just a read-out — flipping it calls
// onToggleOpen, same instant-feel contract as the catalog's in-stock
// switch: a store owner flipping this mid-rush needs it to respond
// immediately, not round-trip to a server first (useStoreProfileStore.
// toggleOpen applies the flip locally right away, PATCHes /partner/store
// in the background). This is the first thing rendered on the screen a
// store owner opens dozens of times a day — worth more polish per pixel
// than a screen they visit once.

import { User02Icon } from '@hugeicons/core-free-icons';
import { Image, Pressable, Switch, Text, View } from 'react-native';
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
            <Image source={{ uri: profile.photoUrl ?? getAvatarImageUri(profile.id || 'partner-store') }} className="h-11 w-11 rounded-full" />
          </View>

          <View className="flex-1 gap-0">
            <Text className="text-[18px] font-medium tracking-tight text-ink" numberOfLines={1}>
              {profile.storeName}
            </Text>

            {/* Real full address (stores.address_line, captured during
                onboarding's LocationPinScreen reverse-geocode) — falls
                back to district for any store approved before this field
                existed, and to a real "Loading…" label before GET
                /partner/store (useStoreProfileStore.loadProfile) resolves
                at all, never silent empty text next to an orphaned pin. */}
            <View className="flex-row items-center gap-1">
              <Text className="text-sm font-medium text-ink/70">
                Located at:
              </Text>
              <Text className="flex-1 text-sm font-medium text-ink/50" numberOfLines={1}>
                {profile.addressLine || profile.district || 'Loading…'}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center gap-2.5">
          {/* Real Open/Closed switch — left of Settings, per an explicit
              ask. Same instant-feel toggle onToggleOpen already provides
              (file header note); the label next to it is what actually
              names the state, since a bare Switch alone doesn't say
              Open vs Closed the way the pill it replaced used to. */}
          <View className="flex-row items-center gap-1.5 rounded-full bg-white py-1 pl-3 pr-1">
            <Text className={`text-[13px] font-medium ${profile.isOpen ? 'text-lime-deep' : 'text-ink/50'}`}>
              {profile.isOpen ? 'Open' : 'Closed'}
            </Text>
            <Switch
              value={profile.isOpen}
              onValueChange={() => {
                Haptics.selectionAsync();
                onToggleOpen();
              }}
              trackColor={{ false: '#D1D5DB', true: colors.limeDeep }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* No settings screen yet (P6, out of scope until later) —
              stubbed rather than silently doing nothing, same convention
              as the mic icon on apps/customer's HomeSearchBar. */}
          <Pressable
            onPress={onPressSettings}
            hitSlop={10}
            className="h-11 w-11 items-center justify-center rounded-full bg-white"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <AppIcon icon={User02Icon} size={19} color={colors.ink} />
          </Pressable>

          {/* <Pressable
            onPress={onPressNotifications}
            hitSlop={10}
            className="h-11 w-11 items-center justify-center rounded-full bg-white"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <AppIcon icon={Notification01Icon} size={19} color={colors.ink} />
            {profile.hasUnreadNotifications && (
              <View className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border border-white bg-lime-deep" />
            )}
          </Pressable> */}
        </View>
      </View>
    </View>
  );
}

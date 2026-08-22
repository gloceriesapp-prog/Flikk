// Store settings (P6) — reached from StoreProfileHeader's gear icon.
// Full-screen, not a sheet — same reasoning as ProductDetailScreen's own
// note: a multi-section editable form belongs on a real screen, not
// squeezed into a modal. This is the one place a shop owner has complete
// access to how their store presents itself: name, category, photo,
// hours, prep time, plus the account/support rows every settings screen
// carries.
//
// Reads/writes useStoreProfileStore, not local state — StoreProfileHeader
// (Orders tab) needs to see the same edits immediately, same reasoning as
// useOrdersStore/useCatalogStore. Draft state here is local until "Save
// changes" commits it, same pattern as ProductDetailScreen: backing out
// (the back arrow) never half-applies an edit.
//
// No `PATCH` on the store record exists yet (specs/02-partner-app/api.md's
// own note on P6) — Save only ever writes to the local store, standing in
// for that call.

import { useState } from 'react';
import {
  ArrowLeft01Icon,
  Call02Icon,
  Clock01Icon,
  ImageAdd01Icon,
  InformationCircleIcon,
  Logout01Icon,
  Store01Icon,
  TagsIcon,
} from '@hugeicons/core-free-icons';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { getAvatarImageUri } from '../../theme/placeholderImage';
import { useAuthStore } from '../../store/useAuthStore';
import { useStoreProfileStore } from '../../store/useStoreProfileStore';
import type { AppStackParamList } from '../../navigation/types';
import { PrepTimeStepper } from './components/PrepTimeStepper';
import { SettingsCard } from './components/SettingsCard';
import { SettingsLinkRow } from './components/SettingsLinkRow';
import { StoreCategoryPicker } from './components/StoreCategoryPicker';

type Props = NativeStackScreenProps<AppStackParamList, 'StoreSettings'>;

export function StoreSettingsScreen({ navigation }: Props) {
  const profile = useStoreProfileStore((state) => state.profile);
  const updateProfile = useStoreProfileStore((state) => state.updateProfile);
  const clearSession = useAuthStore((state) => state.clear);

  const [name, setName] = useState(profile.storeName);
  const [category, setCategory] = useState(profile.category);
  const [openTime, setOpenTime] = useState(profile.openTime);
  const [closeTime, setCloseTime] = useState(profile.closeTime);
  const [avgPrepMinutes, setAvgPrepMinutes] = useState(profile.avgPrepMinutes);

  function handleSave() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProfile({
      storeName: name.trim() || profile.storeName,
      category,
      openTime,
      closeTime,
      avgPrepMinutes,
    });
    navigation.goBack();
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="relative flex-row items-center px-5 py-3">
        <Pressable
          onPress={() => navigation.goBack()}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <AppIcon icon={ArrowLeft01Icon} size={18} color={colors.ink} />
        </Pressable>
        <Text className="absolute left-0 right-0 text-center text-lg font-semibold text-ink">Store settings</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-5 pb-6" keyboardShouldPersistTaps="handled">
        {/* Photo + name sit outside a SettingsCard, up top — this is the
            identity a customer sees on the storefront listing, worth
            more visual weight than a form row buried in a card. */}
        <View className="items-center gap-3 py-2">
          <Pressable
            className="h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gray-100"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Image source={{ uri: getAvatarImageUri(profile.avatarSeed) }} className="h-full w-full" />
            <View className="absolute bottom-0 h-6 w-full items-center justify-center bg-black/40">
              <AppIcon icon={ImageAdd01Icon} size={13} color="#FFFFFF" />
            </View>
          </Pressable>

          <TextInput
            value={name}
            onChangeText={setName}
            className="text-center text-xl font-semibold text-ink"
            placeholder="Store name"
          />
        </View>

        <SettingsCard icon={TagsIcon} title="Category">
          <StoreCategoryPicker selected={category} onSelect={setCategory} />
        </SettingsCard>

        <SettingsCard icon={Clock01Icon} title="Store hours">
          <View className="flex-row gap-3">
            <View className="flex-1 gap-1.5">
              <Text className="text-xs font-medium text-ink/40">Opens</Text>
              <TextInput
                value={openTime}
                onChangeText={setOpenTime}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-ink"
              />
            </View>
            <View className="flex-1 gap-1.5">
              <Text className="text-xs font-medium text-ink/40">Closes</Text>
              <TextInput
                value={closeTime}
                onChangeText={setCloseTime}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-ink"
              />
            </View>
          </View>

          <PrepTimeStepper minutes={avgPrepMinutes} onChange={setAvgPrepMinutes} />

          {/* The live Open/Closed switch itself lives on the Orders header
              — this card is the schedule a shop owner sets once, that's
              the moment-to-moment toggle for "right now." Said explicitly
              so the two don't read as duplicates of each other. */}
          <Text className="text-xs font-medium text-ink/40">
            The live Open/Closed switch on the Orders tab controls whether you&apos;re taking orders right now — these
            hours are just your usual schedule.
          </Text>
        </SettingsCard>

        <SettingsCard icon={Store01Icon} title="Location">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-ink/70">City</Text>
            <Text className="text-sm font-semibold text-ink">{profile.district}</Text>
          </View>
          <Text className="text-xs font-medium text-ink/40">
            Set automatically from the Orders tab&apos;s location prompt, not editable here.
          </Text>
        </SettingsCard>

        <SettingsCard icon={Call02Icon} title="Account">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-ink/70">Phone number</Text>
            <Text className="text-sm font-semibold text-ink">{profile.phone}</Text>
          </View>
          <Text className="text-xs font-medium text-ink/40">Verified via OTP — change it by logging in again.</Text>
        </SettingsCard>

        <View className="gap-4 rounded-3xl bg-[#F9FAFB] p-4">
          <SettingsLinkRow icon={InformationCircleIcon} label="Help & support" onPress={() => {}} />
          <SettingsLinkRow icon={InformationCircleIcon} label="About Flikk" value="v1.0.0" onPress={() => {}} />
          {/* No confirmation dialog — RootNavigator swaps to the auth
              stack the instant accessToken clears, same "store update
              drives navigation" pattern the rest of this auth flow uses.
              Logging out isn't destructive to any data, just the local
              session, so a confirm step would be friction without a real
              risk behind it. */}
          <SettingsLinkRow icon={Logout01Icon} label="Log out" destructive onPress={() => void clearSession()} />
        </View>
      </ScrollView>

      <View className="px-5 pb-4 pt-2">
        <Pressable
          onPress={handleSave}
          className="items-center justify-center rounded-full bg-ink py-4 shadow-lg shadow-black/20"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Text className="text-base font-semibold text-white">Save changes</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

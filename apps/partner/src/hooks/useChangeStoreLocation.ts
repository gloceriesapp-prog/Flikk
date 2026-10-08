// Shared "open the real map pin, apply the confirmed pin instantly"
// logic — reused by both StoreSettingsScreen's own "Change" button and
// StoreProfileHeader's now-tappable address row (OrdersScreen), instead
// of each screen hand-rolling its own copy of the exact same navigate +
// onConfirm wiring. Same real LocationPinScreen (drag-to-confirm pin +
// reverse-geocode) onboarding already uses — this is the one post-
// approval way to reach it.

import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/types';
import { useStoreProfileStore } from '../store/useStoreProfileStore';

export function useChangeStoreLocation(): () => void {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const profile = useStoreProfileStore((state) => state.profile);
  const updateProfile = useStoreProfileStore((state) => state.updateProfile);

  return function changeStoreLocation() {
    // Seeds the map on the store's current real pin, not a blank default
    // zone center, so opening this to nudge the pin doesn't start from
    // scratch.
    navigation.navigate('LocationPin', {
      initialCoordinates: profile.lat != null && profile.lng != null ? { latitude: profile.lat, longitude: profile.lng } : null,
      onConfirm: (coordinates, district, addressLine) => {
        // Applies instantly — same "photo is live the moment it's hosted"
        // reasoning StoreSettingsScreen's own handlePickPhoto uses, since
        // LocationPinScreen already has its own explicit confirm step.
        // A new pin changes which customers the store reaches, so it goes to
        // Gloceries for review (migration 114) — the live pin stays until then.
        void updateProfile({ district, addressLine, lat: coordinates.latitude, lng: coordinates.longitude }).then((result) => {
          if (!result.ok) Alert.alert('Could not update location', result.error);
          else if (result.pendingReview) {
            Alert.alert('Location sent for review', 'Your new store location goes live once Gloceries approves it.');
          }
        });
      },
    });
  };
}

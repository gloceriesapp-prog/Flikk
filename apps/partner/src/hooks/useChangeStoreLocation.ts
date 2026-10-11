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
import { hasLocationPermission, requestLocationPermission } from '../location/geocoding';
import type { AppStackParamList } from '../navigation/types';
import { useStoreProfileStore } from '../store/useStoreProfileStore';

export function useChangeStoreLocation(): () => void {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const profile = useStoreProfileStore((state) => state.profile);
  const updateProfile = useStoreProfileStore((state) => state.updateProfile);

  return function changeStoreLocation() {
    function openMap() {
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
    }

    // Request location permission on a dedicated prompt BEFORE opening the
    // map — the same crash-avoidance sequence onboarding uses (geocoding.ts's
    // note): the OS dialog resolves while this screen is still mounted, so no
    // getCurrentPositionAsync fires against a recreating Activity. The map
    // still opens for manual pinning if permission is declined.
    void (async () => {
      if (await hasLocationPermission().catch(() => false)) {
        openMap();
        return;
      }
      Alert.alert(
        'Share your store’s location',
        'Gloceries uses your location to drop the map pin on your store so riders can find it.',
        [
          { text: 'Not now', style: 'cancel', onPress: openMap },
          { text: 'Enable', onPress: () => { void requestLocationPermission().catch(() => false).finally(openMap); } },
        ],
      );
    })();
  };
}

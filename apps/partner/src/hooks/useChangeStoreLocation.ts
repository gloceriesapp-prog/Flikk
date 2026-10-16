// Shared "open the map pin and await an admin-reviewed location save"
// logic — reused by both StoreSettingsScreen's own "Change" button and
// StoreProfileHeader's now-tappable address row (OrdersScreen), instead
// of each screen hand-rolling its own copy of the exact same navigate +
// onConfirm wiring. Same real LocationPinScreen (drag-to-confirm pin +
// reverse-geocode) onboarding already uses — this is the one post-
// approval way to reach it.

import { Alert } from 'react-native';
import { storePinPresentation } from '../location/storePin';
import { getSessionEpoch, isCurrentSession } from '../store/sessionScope';
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
    const epoch = getSessionEpoch();
    function openMap() {
      if (!isCurrentSession(epoch)) return;
      // Seeds the map on the store's current real pin, not a blank default
      // zone center, so opening this to nudge the pin doesn't start from
      // scratch.
      const location = storePinPresentation(profile);
      navigation.navigate('LocationPin', {
        initialCoordinates: location.coordinates,
        onConfirm: async (coordinates, district, addressLine) => {
          // A new pin changes which customers the store reaches, so it goes to
          // Gloceries for review (migration 114) — the live pin stays until then.
          if (!isCurrentSession(epoch) || useStoreProfileStore.getState().profile.id !== profile.id) throw new Error('Your account changed. Reopen the map.');
          const result = await updateProfile({ district, addressLine, lat: coordinates.latitude, lng: coordinates.longitude });
          if (!isCurrentSession(epoch)) throw new Error('Your account changed. Reopen the map.');
          if (!result.ok) throw new Error(result.error);
          if (result.pendingReview) {
            Alert.alert('Location sent for review', 'Your proposed pin is saved. Customers and riders keep using your approved location until Gloceries approves this change.');
          }
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

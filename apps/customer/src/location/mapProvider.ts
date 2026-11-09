import { Platform, UIManager } from 'react-native';

export function usesGoogleMaps(): boolean {
  // A Metro manifest describes the JS server's configuration. On iOS the
  // installed app's native view manager determines which provider can render.
  return Platform.OS === 'android'
    || (Platform.OS === 'ios' && UIManager.hasViewManagerConfig('AIRGoogleMap'));
}

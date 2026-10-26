import { Image } from 'react-native';
import { UPI_APP_ARTWORK } from '../../payments/upiAppArtwork';
import type { UpiApp } from '../../payments/upiApps';

export function UpiAppLogo({ app, size = 48 }: { app: UpiApp; size?: number }) {
  const source = app.iconUri ? { uri: app.iconUri } : UPI_APP_ARTWORK[app.id];
  if (!source) return null;
  return <Image source={source} testID={`upi-logo-${app.id}`} accessible={false}
    resizeMode="contain" style={{ width: size, height: size, borderRadius: size / 4 }} />;
}

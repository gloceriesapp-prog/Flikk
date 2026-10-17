// The store's own photo, wherever the app shows the store's avatar (Orders
// header, Store Settings). Never a stock or random image:
//  1. the public storefront photo (stores.photo_url) once the owner sets one;
//  2. otherwise the private storefront photo from onboarding
//     (GET /partner/store storePhotoUrl, the authenticated decrypt-proxy, so
//     the request carries the owner's bearer token and is not disk-cached);
//  3. otherwise, or if the image fails to load, a plain store icon.

import { useState } from 'react';
import { View } from 'react-native';
import { Store01Icon } from '@hugeicons/core-free-icons';
import { authenticatedPhotoSource, selectStorePhoto } from '../media/storePhoto';
import { API_BASE_URL } from '../api/baseUrl';
import { useAuthStore } from '../store/useAuthStore';
import { useStoreProfileStore } from '../store/useStoreProfileStore';
import { colors } from '../theme/tokens';
import { AppIcon } from './AppIcon';
import { AppImage } from './AppImage';

// Resolve private document URLs against this app's backend with scoped auth.
export function authSource(uri: string, token: string | null) {
  return authenticatedPhotoSource(uri, token, API_BASE_URL);
}

export function StoreAvatar({ size, className }: { size: number; className?: string }) {
  const publicPhoto = useStoreProfileStore((state) => state.profile.photoUrl);
  const privatePhoto = useStoreProfileStore((state) => state.profile.storePhotoUrl);
  const token = useAuthStore((state) => state.accessToken);
  const epoch = useAuthStore((state) => state.sessionEpoch);
  return <StorePhoto key={epoch} size={size} className={className} publicPhoto={publicPhoto} privatePhoto={privatePhoto} token={token} />;
}

function StorePhoto({ size, className, publicPhoto, privatePhoto, token }: { size: number; className?: string; publicPhoto: string | null; privatePhoto: string | null; token: string | null }) {
  const [failures, setFailures] = useState<{ uri: string; token: string | null }[]>([]);
  const failedUris = failures.filter(failure => failure.uri !== privatePhoto || failure.token === token).map(failure => failure.uri);
  const photo = selectStorePhoto(publicPhoto, privatePhoto, failedUris);

  const box = { width: size, height: size, borderRadius: size / 2 };
  if (!photo) {
    return (
      <View className={`items-center justify-center bg-slate-100 ${className ?? ''}`} style={box}>
        <AppIcon icon={Store01Icon} size={Math.round(size * 0.45)} color={colors.ink} />
      </View>
    );
  }
  const { uri, private: isPrivate } = photo;
  return (
    <AppImage
      source={isPrivate ? authSource(uri, token) : { uri }}
      cachePolicy={isPrivate ? 'memory' : 'memory-disk'}
      onError={() => setFailures(previous => [...previous, { uri, token }])}
      className={className}
      style={box}
    />
  );
}

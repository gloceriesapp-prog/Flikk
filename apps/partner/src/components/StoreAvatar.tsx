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
import { API_BASE_URL } from '../api/baseUrl';
import { useAuthStore } from '../store/useAuthStore';
import { useStoreProfileStore } from '../store/useStoreProfileStore';
import { colors } from '../theme/tokens';
import { AppIcon } from './AppIcon';
import { AppImage } from './AppImage';

// Private document URLs come back relative ("/partner/documents/:id") when
// PUBLIC_API_URL isn't set on the server; resolve them against the API base.
export function authSource(uri: string, token: string | null) {
  return {
    uri: uri.startsWith('/') ? `${API_BASE_URL}${uri}` : uri,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}

export function StoreAvatar({ size, className }: { size: number; className?: string }) {
  const publicPhoto = useStoreProfileStore((state) => state.profile.photoUrl);
  const privatePhoto = useStoreProfileStore((state) => state.profile.storePhotoUrl);
  const token = useAuthStore((state) => state.accessToken);
  // Remembers which URL failed, so a new photo gets a fresh attempt.
  const [failedUri, setFailedUri] = useState<string | null>(null);

  const uri = publicPhoto || privatePhoto || null;
  const failed = !!uri && failedUri === uri;

  const box = { width: size, height: size, borderRadius: size / 2 };
  if (!uri || failed) {
    return (
      <View className={`items-center justify-center bg-slate-100 ${className ?? ''}`} style={box}>
        <AppIcon icon={Store01Icon} size={Math.round(size * 0.45)} color={colors.ink} />
      </View>
    );
  }
  const isPrivate = !publicPhoto;
  return (
    <AppImage
      source={isPrivate ? authSource(uri, token) : { uri }}
      cachePolicy={isPrivate ? 'memory' : 'memory-disk'}
      onError={() => setFailedUri(uri)}
      className={className}
      style={box}
    />
  );
}

import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppImage as Image } from '../../../components/AppImage';
import { useCopyImage } from '../../../api/appConfig';

const PROMO_IMAGE_URI = 'https://images.gloceries.com/appsui/storev2.png';
const LEGACY_IMAGE_URIS = new Set([
  'https://images.gloceries.com/appsui/storev1.png',
  'https://images.gloceries.com/appsui/store-welcome.png',
  'https://images.gloceries.com/appsui/store-new.png',
]);
const PROMO_ASPECT_RATIO = 2048 / 682;
// Admin artwork is 16:9, the same frame as Home's welcome banner.
const ADMIN_ASPECT_RATIO = 16 / 9;
// Inset like Home's welcome card: content width, rounded corners.
const SIDE_INSET = 16;

export function StorePromoBanner() {
  const { width: screenWidth } = useWindowDimensions();
  // Retain admin overrides while replacing previously shipped default artwork.
  const configuredImageUri = useCopyImage('stores.promo.imageUrl', PROMO_IMAGE_URI);
  const imageUri = LEGACY_IMAGE_URIS.has(configuredImageUri) ? PROMO_IMAGE_URI : configuredImageUri;
  const width = screenWidth - SIDE_INSET * 2;
  const isDefault = imageUri === PROMO_IMAGE_URI;

  return (
    <View style={styles.wrap}>
      <View style={[styles.banner, {
        width,
        height: width / (isDefault ? PROMO_ASPECT_RATIO : ADMIN_ASPECT_RATIO),
      }]}>
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill}
          contentFit={isDefault ? 'contain' : 'cover'} contentPosition="center" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: SIDE_INSET, paddingTop: 12, backgroundColor: '#FFFFFF' },
  banner: { overflow: 'hidden', borderRadius: 20 },
});

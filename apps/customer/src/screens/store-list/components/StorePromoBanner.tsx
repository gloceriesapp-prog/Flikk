import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppImage as Image } from '../../../components/AppImage';
import { useCopyImage } from '../../../api/appConfig';
import { STORE_HEADER_BACKGROUND, STORE_PAGE_BACKGROUND } from '../storeAppearance';

const PROMO_IMAGE_URI = 'https://images.gloceries.com/appsui/storev2.png';
const LEGACY_IMAGE_URIS = new Set([
  'https://images.gloceries.com/appsui/storev1.png',
  'https://images.gloceries.com/appsui/store-welcome.png',
  'https://images.gloceries.com/appsui/store-new.png',
]);
const PROMO_ASPECT_RATIO = 2048 / 682;

export function StorePromoBanner() {
  const { width: screenWidth } = useWindowDimensions();
  // Retain admin overrides while replacing previously shipped default artwork.
  const configuredImageUri = useCopyImage('stores.promo.imageUrl', PROMO_IMAGE_URI);
  const imageUri = LEGACY_IMAGE_URIS.has(configuredImageUri) ? PROMO_IMAGE_URI : configuredImageUri;

  return (
    <View style={[styles.banner, {
      width: screenWidth,
      height: imageUri === PROMO_IMAGE_URI ? screenWidth / PROMO_ASPECT_RATIO : 160,
    }]}>
      <View pointerEvents="none" style={styles.headerBackground} />
      <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill}
        contentFit="contain" contentPosition="bottom center" />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { alignSelf: 'center', overflow: 'hidden', backgroundColor: STORE_PAGE_BACKGROUND },
  headerBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: STORE_HEADER_BACKGROUND },
});

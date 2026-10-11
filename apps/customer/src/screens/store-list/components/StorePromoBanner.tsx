import {
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppImage as Image } from '../../../components/AppImage';
import { useCopyImage } from '../../../api/appConfig';

const PROMO_IMAGE_URI =
  'https://images.gloceries.com/appsui/store-welcome.png';

const PROMO_BACKGROUND = '#849B76';

export function StorePromoBanner() {
  const { width: screenWidth } = useWindowDimensions();
  // Admin App content: stores.promo.imageUrl. Kept read here (with the hosted
  // default as fallback) so admin can still swap the promo image AND the
  // backend copyKeys invariant — every registered key must be read by the
  // customer app — stays satisfied.
  const imageUri = useCopyImage('stores.promo.imageUrl', PROMO_IMAGE_URI);

  return (
    <View
      className="self-center overflow-hidden"
      style={{
        width: screenWidth,
        height: 160,
        marginBottom: 0,
        paddingBottom: 0,
        backgroundColor: PROMO_BACKGROUND,
      }}
    >
      <Image
        source={{ uri: imageUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="bottom center"
      />
    </View>
  );
}
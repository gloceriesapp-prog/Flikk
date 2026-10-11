import {
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppImage as Image } from '../../../components/AppImage';

const PROMO_IMAGE_URI =
  'https://images.gloceries.com/appsui/store-welcome.png';

const PROMO_BACKGROUND = '#849B76';

export function StorePromoBanner() {
  const { width: screenWidth } = useWindowDimensions();

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
        source={{ uri: PROMO_IMAGE_URI }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="bottom center"
      />
    </View>
  );
}
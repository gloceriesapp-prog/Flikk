import { LinearGradient } from 'expo-linear-gradient';
import {
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppImage as Image } from '../../../components/AppImage';
import { storageUrl } from '../../../utils/storageUrl';

const PROMO_IMAGE_URI =
  storageUrl('Images/Indian%20neighbourhood%20shop%20parade.png');

const PROMO_BACKGROUND = '#D5E5F7';

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

      <LinearGradient
        colors={[
          PROMO_BACKGROUND,
          'rgba(213,229,247,0)',
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 40,
        }}
        pointerEvents="none"
      />
    </View>
  );
}
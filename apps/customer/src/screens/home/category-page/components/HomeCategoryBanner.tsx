import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppImage } from '../../../../components/AppImage';
import { storageUrl } from '../../../../utils/storageUrl';

const DEFAULT_BANNER_URI =
  storageUrl('Images/store-image1.jpeg');

// Small folded-paper cuts for Festival, broad flowing layers for Regional.
// These are decorative separators, not interactive icons.
const festivalEdge = `M0 2 ${Array.from({ length: 40 }, (_, index) =>
  `L${index * 10 + 5} 7 L${(index + 1) * 10} 2`).join(' ')} L400 16 L0 16 Z`;
const regionalEdge = 'M0 9 C65 0 105 0 170 7 S285 15 340 7 S380 3 400 5 L400 24 L0 24 Z';
export function HomeCategoryBanner({
  imageUri = DEFAULT_BANNER_URI,
  imageAsset,
  backgroundColor = '#F3F4F6',
  imageFit = 'cover',
  seamless = false,
  bottomEdge,
}: {
  imageUri?: string;
  imageAsset?: number;
  backgroundColor?: string;
  imageFit?: 'cover' | 'contain';
  seamless?: boolean;
  bottomEdge?: 'festival' | 'regional';
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <View className="overflow-hidden" style={{
      height: Math.max(width * 7 / 16, 60) + insets.top,
      backgroundColor,
      marginBottom: seamless ? 0 : 12,
      borderBottomLeftRadius: seamless || bottomEdge ? 0 : 24,
      borderBottomRightRadius: seamless || bottomEdge ? 0 : 24,
    }}>
      <AppImage
        source={imageAsset ?? { uri: imageUri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode={imageFit}
        contentPosition={imageFit === 'contain' ? 'bottom center' : 'center'}
        priority="high"
        transition={0}
        accessible={false}
      />
      {bottomEdge ? (
        <Svg pointerEvents="none" width="100%" height={bottomEdge === 'festival' ? 10 : 16}
          viewBox={bottomEdge === 'festival' ? '0 0 400 16' : '0 0 400 24'}
          preserveAspectRatio="none" style={styles.edge} accessible={false}>
          {bottomEdge === 'festival' ? (
            <Path d={festivalEdge} fill="#FFFFFF" />
          ) : (
            <>
              <Path d="M0 5 C70 15 110 -3 185 3 S300 17 400 2 L400 24 L0 24 Z" fill="#FFFFFF" opacity={0.38} />
              <Path d={regionalEdge} fill="#FFFFFF" />
            </>
          )}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  edge: { position: 'absolute', bottom: -0.5, left: 0, right: 0 },
});

import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppImage } from '../../../../components/AppImage';
import { storageUrl } from '../../../../utils/storageUrl';

const DEFAULT_BANNER_URI =
  storageUrl('Images/store-image1.jpeg');

// Festival has folded-paper cuts. Coastal/Udupi has downward-pointing scallops.
const festivalEdge = `M0 2 ${Array.from({ length: 40 }, (_, index) =>
  `L${index * 10 + 5} 7 L${(index + 1) * 10} 2`).join(' ')} L400 16 L0 16 Z`;
const regionalScallopWidth = 36;
const regionalScallopCount = 11;
const regionalEdgeWidth = regionalScallopWidth * regionalScallopCount;
const regionalEdge = `M0 3 ${Array.from({ length: regionalScallopCount }, (_, index) => {
  const x = index * regionalScallopWidth;
  return `C${x + 4} 15 ${x + 14} 10 ${x + 18} 21 C${x + 22} 10 ${x + 32} 15 ${x + 36} 3`;
}).join(' ')} L${regionalEdgeWidth} 24 H0 Z`;
const bannerEdges = {
  festival: { height: 10, viewBox: '0 0 400 16', path: festivalEdge },
  regional: { height: 20, viewBox: `0 0 ${regionalEdgeWidth} 24`, path: regionalEdge },
};

export function HomeCategoryBanner({
  imageUri,
  fallbackImageUri = DEFAULT_BANNER_URI,
  imageAsset,
  backgroundColor = '#F3F4F6',
  imageFit = 'cover',
  seamless = false,
  bottomEdge,
}: {
  imageUri?: string;
  fallbackImageUri?: string;
  imageAsset?: number;
  backgroundColor?: string;
  imageFit?: 'cover' | 'contain';
  seamless?: boolean;
  bottomEdge?: keyof typeof bannerEdges | 'straight';
}) {
  const [failedUri, setFailedUri] = useState<string>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const edge = bottomEdge && bottomEdge !== 'straight' ? bannerEdges[bottomEdge] : undefined;
  return (
    <View className="overflow-hidden" style={{
      height: Math.max(width * 7 / 16, 60) + insets.top,
      backgroundColor,
      marginBottom: seamless ? 0 : 12,
      borderBottomLeftRadius: seamless || bottomEdge ? 0 : 24,
      borderBottomRightRadius: seamless || bottomEdge ? 0 : 24,
    }}>
      <AppImage
        source={imageUri && imageUri !== failedUri ? { uri: imageUri } : imageAsset ?? { uri: fallbackImageUri }}
        onError={() => { if (imageUri) setFailedUri(imageUri); }}
        style={{ width: '100%', height: '100%' }}
        resizeMode={imageFit}
        contentPosition={imageFit === 'contain' ? 'bottom center' : 'center'}
        priority="high"
        transition={0}
        accessible={false}
      />
      {edge ? (
        <Svg pointerEvents="none" width="100%" height={edge.height} viewBox={edge.viewBox}
          preserveAspectRatio="none" style={styles.edge} accessible={false}>
          <Path d={edge.path} fill="#FFFFFF" />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  edge: { position: 'absolute', bottom: -0.5, left: 0, right: 0 },
});
